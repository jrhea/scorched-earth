/**
 * Controller - Handles user input and orchestrates the game components.
 */
class Controller {
    /**
     * Constructor to initialize the game controller
     * @param {HTMLCanvasElement} canvas - The game canvas element
     */
    constructor(canvas) {
        // Store canvas dimensions
        this.canvas = canvas;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        
        // Initialize components
        this.model = null;
        this.renderer = null;
        
        // Animation state
        this.animationFrameId = null;
        
        // Input state tracking for smooth adjustments
        this.keyState = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
        this.keyRepeatDelay = 50; // ms between repeated adjustments
        this.keyRepeatTimer = null;
        
        // Bind event handlers to maintain proper 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    /**
     * Initialize the game with renderer and game model
     * @param {Model} model - The game model instance
     * @param {Renderer} renderer - The renderer instance
     */
    init(model, renderer) {
        this.model = model;
        this.renderer = renderer;
        
        // Setup event listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('resize', this.resizeCanvas);
        
        // Initialize the game
        this.model.initGame();
        
        // Initialize UI with current game state
        this.renderer.updatePlayerUI();
        
        // Start the game loop
        this.startGameLoop();
    }
    
    /**
     * Start the main game animation loop
     */
    startGameLoop() {
        // Cancel any existing animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Start fresh animation loop
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * The main game loop that runs on each animation frame
     */
    gameLoop() {
        // Determine the current game state and handle appropriately
        
        // 1. Always render the current game state
        this.renderer.drawGame();
        
        // 2. Handle game over state
        if (this.model.gameOver) {
            if (this.model.gameOverMessage) {
                this.renderer.drawGameOverMessage();
            }
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
            return;
        }
        
        // 3. Handle explosion animation
        if (this.model.explosion) {
            this.handleExplosionAnimation();
            return;
        }
        
        // 4. Handle projectile flight
        if (this.model.projectileInFlight) {
            this.handleProjectileAnimation();
            return;
        }
        
        // Continue the animation loop if needed for UI updates
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * Handle animation of an explosion
     */
    handleExplosionAnimation() {
        // Calculate explosion animation progress
        const explosion = this.model.explosion;
        const timeSinceStart = Date.now() - explosion.startTime;
        const progress = timeSinceStart / explosion.duration;
        
        // Apply terrain damage when animation is about 75% complete
        if (progress >= 0.75 && explosion.pendingTerrainDamage) {
            // Apply the physics effects of the explosion
            this.model.applyExplosionEffects();
        }
        
        // Check if explosion animation is complete
        if (timeSinceStart >= explosion.duration) {
            // Animation complete, move to next player
            if (!this.model.gameOver) {
                this.model.explosion = null;
                this.model.switchPlayer(); // This will generate new wind
                this.model.turnInProgress = false;
                
                // Update UI with new wind and player information
                this.renderer.updatePlayerUI();
            }
        }
        
        // Continue the animation
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * Handle animation of a projectile in flight
     */
    handleProjectileAnimation() {
        // Update projectile physics multiple times per frame for smoother/faster animation
        // without changing the actual physics constants
        for (let i = 0; i < 2; i++) {
            this.model.updateProjectile();
            
            // Check for collisions after each update
            const collisionResult = this.model.checkProjectileCollisions();
            if (collisionResult) break; // Stop updating if collision occurred
        }
        
        // Continue the animation if no collision occurred
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * Process user input from keyboard state
     */
    processKeys() {
        if (!this.model) return;
        
        // Base step size for adjustments
        const baseStep = 1;
        
        // Process power adjustments
        if (this.keyState.ArrowUp) {
            // Increase power
            this.model.adjustPower(this.model.currentPlayer, baseStep);
        }
        if (this.keyState.ArrowDown) {
            // Decrease power
            this.model.adjustPower(this.model.currentPlayer, -baseStep);
        }
        
        // Process angle adjustments
        if (this.keyState.ArrowLeft) {
            // Decrease angle
            this.model.adjustAngle(this.model.currentPlayer, -baseStep);
        }
        if (this.keyState.ArrowRight) {
            // Increase angle
            this.model.adjustAngle(this.model.currentPlayer, baseStep);
        }
        
        // Update UI with new values
        this.renderer.updatePlayerUI();
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} e - The key event
     */
    handleKeyDown(e) {
        // If game is over and space is pressed, restart the game
        if (this.model.gameOver && (e.key === ' ' || e.key === 'Enter')) {
            this.model.initGame();
            this.renderer.updatePlayerUI();
            return;
        }
        
        // Skip other keys if game is over
        if (this.model.gameOver) return;
        
        // Update key state
        if (e.key in this.keyState) {
            this.keyState[e.key] = true;
            
            // Process the key press immediately
            this.processKeys();
            
            // Set up a timer for continuous adjustment while key is held
            if (!this.keyRepeatTimer) {
                this.keyRepeatTimer = setInterval(() => {
                    this.processKeys();
                }, this.keyRepeatDelay);
            }
            
            // Prevent default actions (like scrolling)
            e.preventDefault();
        } else if (e.key === ' ' || e.key === 'Enter') {
            // Fire missile
            if (!this.model.turnInProgress && !this.model.projectileInFlight) {
                this.model.fireMissile();
            }
            e.preventDefault();
        }
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} e - The key event
     */
    handleKeyUp(e) {
        // Update key state
        if (e.key in this.keyState) {
            this.keyState[e.key] = false;
            
            // If no keys are pressed, clear the repeat timer
            if (!Object.values(this.keyState).some(value => value)) {
                clearInterval(this.keyRepeatTimer);
                this.keyRepeatTimer = null;
            }
        }
    }
    
    /**
     * Handle canvas resize events
     */
    resizeCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = 700; // Fixed height for consistent gameplay
        
        // Update internal dimensions
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        
        // Inform the game engine of new dimensions
        this.model.updateDimensions(this.canvasWidth, this.canvasHeight);
        
        // Redraw the game
        this.renderer.drawGame();
    }
    
    /**
     * Clean up resources when the controller is no longer needed
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('resize', this.resizeCanvas);
        
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Clear key repeat timer
        if (this.keyRepeatTimer) {
            clearInterval(this.keyRepeatTimer);
            this.keyRepeatTimer = null;
        }
    }
}

// Export the controller class
export { Controller };

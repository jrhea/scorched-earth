// Import the UIManager class
import { UIManager } from './ui-manager.js';

// Main game engine class to handle all game logic and physics
class GameEngine {
    constructor() {
        // Get canvas and context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas dimensions
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = 700; // Fixed height to match CSS
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Game settings
        this.gravity = 0.15;  // Increased gravity for faster falls
        this.windSpeed = 0;
        this.currentPlayer = 0;
        this.gameOver = false;
        this.explosion = null; // Track active explosion
        this.turnInProgress = false; // Flag to prevent multiple firing in one turn
        
        // Power and angle settings for each player
        this.playerPower = [50, 50]; // Initial power values
        this.playerAngle = [45, 45]; // Initial angle values
        
        // Key state tracking for smooth adjustments
        this.keyState = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
        this.keyRepeatDelay = 50; // ms between repeated adjustments
        this.keyRepeatTimer = null;
        
        // Initialize the UI manager
        this.ui = new UIManager(this);
        
        // Initialize the game
        this.initGame();
        
        // Add event listeners for keyboard
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = 700; // Keep fixed height for consistent gameplay
        if (this.terrain) {
            this.drawGame();
        }
    }
    
    initGame() {
        // Reset game state
        this.gameOver = false;
        this.gameOverMessage = null;
        this.projectileInFlight = false;
        this.explosion = null;
        this.turnInProgress = false;
        
        // Generate terrain
        this.generateTerrain();
        
        // Place players on the terrain
        this.placePlayers();
        
        // Reset power/angle to default
        this.playerPower = [50, 50];
        this.playerAngle = [45, 45];
        
        // Player 1 goes first
        this.currentPlayer = 0;
        
        // Initial wind
        this.generateWind();
        
        // Update UI and draw the initial game state
        this.ui.updatePlayerUI();
        this.drawGame();
    }
    
    placePlayers() {
        // Create players (tanks)
        this.players = [
            { x: this.canvas.width * 0.2, y: 0, color: '#FF6600', health: 100 },
            { x: this.canvas.width * 0.8, y: 0, color: '#3399FF', health: 100 }
        ];
        
        // Position players on terrain
        this.players.forEach(player => {
            player.y = this.getTerrainHeight(player.x);
        });
        
        // Create flat platforms for tanks
        this.createPlatformsForTanks();
        
        // Reposition players on the flat platforms
        this.players.forEach(player => {
            player.y = this.getTerrainHeight(player.x);
        });
    }
    
    createPlatformsForTanks() {
        // Create a flat platform for each tank
        this.players.forEach(player => {
            // Platform width in pixels - make it wide enough for the tank
            const platformWidth = 20;
            
            // Get the height at the tank's position
            const tankHeight = this.getTerrainHeight(player.x);
            
            // Define platform boundaries
            const startX = Math.max(0, player.x - platformWidth);
            const endX = Math.min(this.canvas.width, player.x + platformWidth);
            
            // Find terrain points within platform range
            for (let i = 0; i < this.terrain.length; i += 2) {
                const terrainX = this.terrain[i];
                
                if (terrainX >= startX && terrainX <= endX) {
                    // Set the height to match the tank position
                    this.terrain[i + 1] = tankHeight;
                }
            }
        });
    }
    
    processKeys() {
        // Base step size for adjustments
        const baseStep = 1;
        
        // Process power adjustments
        if (this.keyState.ArrowUp) {
            // Increase power
            this.playerPower[this.currentPlayer] = Math.min(100, 
                this.playerPower[this.currentPlayer] + baseStep);
        }
        if (this.keyState.ArrowDown) {
            // Decrease power
            this.playerPower[this.currentPlayer] = Math.max(1, 
                this.playerPower[this.currentPlayer] - baseStep);
        }
        
        // Process angle adjustments
        if (this.keyState.ArrowLeft) {
            // Decrease angle
            this.playerAngle[this.currentPlayer] = Math.max(0, 
                this.playerAngle[this.currentPlayer] - baseStep);
        }
        if (this.keyState.ArrowRight) {
            // Increase angle
            this.playerAngle[this.currentPlayer] = Math.min(180, 
                this.playerAngle[this.currentPlayer] + baseStep);
        }
        
        // Update UI with new values and redraw game
        this.ui.updatePlayerUI();
        this.drawGame();
    }
    
    updatePlayerUI() {
        // Delegate to UI manager
        this.ui.updatePlayerUI();
    }
    
    // Game core logic methods
    generateTerrain() {
        // Create a smoother terrain using a combination of sine waves and interpolation
        this.terrain = [];
        
        // Define the hard rock layer height - 95% of canvas height
        this.rockLayerHeight = this.canvas.height * 0.95;
        
        // Start and end points with consistent height
        const baseHeight = this.canvas.height * 0.6;
        this.terrain.push(0);
        this.terrain.push(baseHeight);
        
        // Generate more points for smoother terrain
        const segments = 10000; // High resolution for smoother terrain
        const segmentWidth = this.canvas.width / segments;
        
        // Generate control points with smoother transitions
        const controlPoints = [];
        const numControlPoints = 6; // Adjust control points for smoothness
        
        for (let i = 0; i <= numControlPoints; i++) {
            const x = i * (this.canvas.width / numControlPoints);
            // Vary height but keep within reasonable bounds and above rock layer
            const variance = this.canvas.height * 0.5; // Less variance = smoother terrain
            const rawHeight = baseHeight - variance + Math.random() * variance * 2;
            // Ensure height never goes below the rock layer
            const height = Math.min(rawHeight, this.rockLayerHeight);
            controlPoints.push({ x, height });
        }
        
        // Interpolate between control points for smooth terrain
        for (let i = 1; i < segments; i++) {
            const x = i * segmentWidth;
            
            // Find the two control points this x is between
            let cp1 = controlPoints[0];
            let cp2 = controlPoints[1];
            
            for (let j = 1; j < controlPoints.length; j++) {
                if (x > controlPoints[j].x) {
                    cp1 = controlPoints[j];
                    cp2 = controlPoints[j + 1] || controlPoints[j];
                } else {
                    break;
                }
            }
            
            // Interpolate height between control points
            let height;
            if (cp1.x === cp2.x) {
                height = cp1.height;
            } else {
                const t = (x - cp1.x) / (cp2.x - cp1.x);
                // Use cubic interpolation for even smoother transitions
                const smoothT = t * t * (3 - 2 * t);
                height = cp1.height + smoothT * (cp2.height - cp1.height);
            }
            
            this.terrain.push(x);
            this.terrain.push(height);
        }
        
        // End point
        this.terrain.push(this.canvas.width);
        this.terrain.push(baseHeight);
    }
    
    getTerrainHeight(x) {
        // Find the terrain segment containing x
        for (let i = 0; i < this.terrain.length - 2; i += 2) {
            const x1 = this.terrain[i];
            const y1 = this.terrain[i + 1];
            const x2 = this.terrain[i + 2];
            const y2 = this.terrain[i + 3];
            
            if (x >= x1 && x <= x2) {
                // Linear interpolation to find height
                const ratio = (x - x1) / (x2 - x1);
                return y1 + ratio * (y2 - y1);
            }
        }
        
        return this.canvas.height;
    }
    
    drawGame() {
        // Use the UI manager to handle all drawing operations
        this.ui.drawBackground();
        this.ui.drawTerrain();
        this.ui.drawPlayers();
        this.ui.drawProjectile();
        this.ui.drawExplosion();
        
        // Draw game over message if needed
        if (this.gameOver && this.gameOverMessage) {
            this.ui.drawGameOverMessage();
        }
    }
    
    fireMissile() {
        // Prevent firing if projectile is already in flight, game is over, or turn is in progress (including explosion animation)
        if (this.projectileInFlight || this.gameOver || this.turnInProgress) return;
        
        // Mark turn as in progress to prevent multiple firing
        this.turnInProgress = true;
        
        const player = this.players[this.currentPlayer];
        const power = this.playerPower[this.currentPlayer] / 5;  // Reduced power factor for more controlled projectiles
        const rawAngle = this.playerAngle[this.currentPlayer];
        
        // Convert degrees to radians and adjust for proper orientation
        const angle = (180 - rawAngle) * Math.PI / 180;
        
        this.projectile = {
            x: player.x + Math.cos(angle) * 20,
            y: player.y - 10 - Math.sin(angle) * 20,
            vx: Math.cos(angle) * power,
            vy: -Math.sin(angle) * power, // Negative because y-axis is inverted in canvas
            trail: []
        };
        
        this.projectileInFlight = true;
        this.animateProjectile();
    }
    
    animateProjectile() {
        // Return early if there's nothing to animate
        if (!this.projectileInFlight && !this.gameOver && !this.explosion) return;
        
        // Always redraw game state
        this.drawGame();
        
        // Determine the current animation state and handle it
        // 1. Game over state
        if (this.gameOver && this.gameOverMessage) {
            this.ui.drawGameOverMessage();
            requestAnimationFrame(() => this.animateProjectile());
            return;
        }
        
        // 2. Explosion animation state
        if (this.explosion) {
            this.handleExplosionAnimation();
            return;
        }
        
        // 3. Projectile flight state
        if (this.projectileInFlight) {
            this.handleProjectileFlight();
        }
    }
    
    handleExplosionAnimation() {
        // Calculate explosion animation progress
        const timeSinceStart = Date.now() - this.explosion.startTime;
        const progress = timeSinceStart / this.explosion.duration;
        
        // Apply terrain damage when animation is about 75% complete
        // This makes it appear the explosion is causing the terrain deformation
        if (progress >= 0.75 && this.explosion.pendingTerrainDamage) {
            // Apply the terrain damage
            this.damageTerrainAt(this.explosion.x, this.explosion.y, this.explosion.radius);
            this.explosion.pendingTerrainDamage = false;
            
            // Apply pending player damage
            if (this.pendingPlayerDamage && this.pendingPlayerDamage.length > 0) {
                this.pendingPlayerDamage.forEach(damage => {
                    this.damagePlayer(damage.playerIndex, damage.damage);
                });
                this.pendingPlayerDamage = [];
                
                // Check if game is over after applying damage
                this.checkGameOver();
            }
        }
        
        // Check if explosion animation is complete
        if (timeSinceStart >= this.explosion.duration) {
            // Animation complete, move to next player
            if (!this.gameOver) {
                this.explosion = null;
                this.switchPlayer(); // This will generate new wind
                this.turnInProgress = false;
                this.ui.updatePlayerUI();
            }
        } else {
            // Continue explosion animation
            requestAnimationFrame(() => this.animateProjectile());
        }
    }
    
    handleProjectileFlight() {
        // Update projectile position with physics
        this.projectile.vy += this.gravity;
        this.projectile.vx += this.windSpeed * 0.01;  // Wind effect
        this.projectile.x += this.projectile.vx * 1.5;  // Horizontal movement
        this.projectile.y += this.projectile.vy * 1.5;  // Vertical movement
        
        // Add to trail
        this.projectile.trail.push({ x: this.projectile.x, y: this.projectile.y });
        if (this.projectile.trail.length > 10) {
            this.projectile.trail.shift();
        }
        
        // Check for collisions and boundaries
        this.checkProjectileCollisions();
    }
    
    checkProjectileCollisions() {
        // If we no longer have a projectile in flight, exit
        if (!this.projectileInFlight) return;
        
        // Store current player positions for consistent distance calculations
        const playerPositions = this.players.map(player => ({
            x: player.x,
            y: player.y
        }));
        
        // Check for collision with terrain
        const terrainHeight = this.getTerrainHeight(this.projectile.x);
        if (this.projectile.y >= terrainHeight) {
            // Switch to explosion state
            this.projectileInFlight = false;
            this.createExplosion(this.projectile.x, terrainHeight, playerPositions);
            return;
        }
        
        // Check for collision with players
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            // Use the top of the tank for collision detection
            const dx = this.projectile.x - player.x;
            const dy = this.projectile.y - (player.y - 10); // Adjust to match turret position
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 25) {
                // Switch to explosion state
                this.projectileInFlight = false;
                this.createExplosion(this.projectile.x, this.projectile.y, playerPositions);
                return;
            }
        }
        
        // Check if projectile is out of bounds
        if (this.projectile.x < 0 || this.projectile.x > this.canvas.width || 
            this.projectile.y > this.canvas.height) {
            // Projectile left the screen, switch to next player
            this.projectileInFlight = false;
            this.turnInProgress = false;
            this.switchPlayer();
            return;
        }
        
        // Continue animation for projectile
        requestAnimationFrame(() => this.animateProjectile());
    }
    
    createExplosion(x, y, playerPositions) {
        // Define explosion radius (increased for better gameplay)
        const explosionRadius = 40;
        
        // Store explosion data for rendering
        this.explosion = {
            x: x,
            y: y,
            radius: explosionRadius,
            startTime: Date.now(),
            duration: 2000, // 2 second duration
            playerPositions: playerPositions, // Store positions for later damage calculation
            pendingTerrainDamage: true // Flag indicating terrain damage needs to be applied when animation ends
        };
        
        // Check for player damage (calculate but don't apply immediately)
        let damageDealt = false;
        this.pendingPlayerDamage = [];
        
        for (let i = 0; i < this.players.length; i++) {
            const player = playerPositions[i];
            const dx = x - player.x;
            const dy = y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Increased detection radius to ensure nearby hits damage player
            if (distance < explosionRadius + 10) {
                // Damage is based on proximity to explosion center
                const damage = Math.floor((1 - distance / (explosionRadius + 10)) * 100);
                if (damage > 0) {
                    // Store the damage for later application
                    this.pendingPlayerDamage.push({ playerIndex: i, damage: damage });
                    damageDealt = true;
                }
            }
        }
        
        // Add sound effect indication (text only for now)
        if (damageDealt) {
            console.log('Hit player!');
        }
        
        // Note: We'll check game over after actually applying damage
        // in the animation loop
        
        // Start the animation loop to continue rendering the explosion
        // Note: Player switching now happens in the animateProjectile loop
        // when the explosion animation completes
        requestAnimationFrame(() => this.animateProjectile());
    }
    
    checkGameOver() {
        // Count players with health > 0
        const alivePlayers = this.players.filter(player => player.health > 0).length;
        
        if (alivePlayers <= 1) {
            this.gameOver = true;
            this.turnInProgress = false; // Reset turn flag on game over
            
            // Find the winner (if there is one)
            const winner = this.players.findIndex(player => player.health > 0);
            
            if (winner !== -1) {
                this.gameOverMessage = `PLAYER ${winner + 1} WINS!`;
                this.gameOverColor = this.players[winner].color;
            } else {
                this.gameOverMessage = "IT'S A TIE!";
                this.gameOverColor = '#FFFFFF';
            }
            
            // Draw the game over message immediately
            this.ui.drawGameOverMessage();
        }
    }
    
    damageTerrainAt(x, y, radius) {
        // Refined crater deformation logic
        for (let i = 0; i < this.terrain.length; i += 2) {
            const terrainX = this.terrain[i];
            const terrainY = this.terrain[i + 1];
            const dx = x - terrainX;
            const distance = Math.abs(dx);

            if (distance < radius) {
                // Calculate crater depth based on distance from center
                const depthFactor = Math.sqrt(1 - (distance / radius) ** 2);
                const impact = depthFactor * 20; // Adjust impact factor as needed
                const newHeight = terrainY + impact;
                this.terrain[i + 1] = Math.min(newHeight, this.rockLayerHeight);
            }
        }

        // Reposition players on terrain
        this.players.forEach(player => {
            player.y = this.getTerrainHeight(player.x);
        });
    }
    
    damagePlayer(playerIndex, damage) {
        const player = this.players[playerIndex];
        // Ensure minimum damage of 10 if hit at all
        const actualDamage = Math.max(10, damage);
        player.health = Math.max(0, player.health - actualDamage);
        
        // Log damage for debugging
        console.log(`Player ${playerIndex + 1} took ${actualDamage} damage! Health: ${player.health}`);
    }
    
    generateWind() {
        // Generate random wind (-1.0 to 1.0)
        this.windSpeed = (Math.random() * 2 - 1) * 0.5; // Scale down for gameplay
        
        // Round to 2 decimal places
        this.windSpeed = Math.round(this.windSpeed * 100) / 100;
        
        // Update UI with new wind value
        this.ui.updatePlayerUI();
    }
    
    switchPlayer() {
        if (this.gameOver) return;

        // Generate new random wind for next turn (-1.0 to 1.0)
        this.windSpeed = (Math.random() - 0.5) * 2;
        
        this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
        
        // Update UI to highlight active player
        this.ui.updatePlayerUI();
        
        this.drawGame();
    }
    
    handleKeyDown(e) {
        // If game is over and space is pressed, restart the game
        if (this.gameOver && (e.key === ' ' || e.key === 'Enter')) {
            this.initGame();
            return;
        }
        
        // Skip other keys if game is over
        if (this.gameOver) return;
        
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
            // Fire
            this.fireMissile();
            e.preventDefault();
        }
    }
    
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
}

// Export the GameEngine class
export { GameEngine };

/**
 * Model - Pure game logic and physics with no UI dependencies.
 */
class Model {
    /**
     * Constructor to initialize the game engine
     * @param {number} width - The game area width
     * @param {number} height - The game area height 
     */
    constructor(width, height) {
        // Store game dimensions
        this.width = width || 800;
        this.height = height || 700;
        
        // Game settings
        this.gravity = 9.8;
        this.windSpeed = 0;
        this.currentPlayer = 0;
        this.gameOver = false;
        this.explosion = null; // Track active explosion
        this.turnInProgress = false; // Flag to prevent multiple firing in one turn
        
        // Projectile tracking
        this.projectile = null;
        this.projectileInFlight = false;
        
        // Game state
        this.terrain = null;
        this.players = null;
        this.rockLayerHeight = this.height * 0.98; // Hard rock layer below which terrain can't be destroyed
    }
    
    /**
     * Update the game area dimensions
     * @param {number} width - New width
     * @param {number} height - New height 
     */
    updateDimensions(width, height) {
        this.width = width || this.width;
        this.height = height || this.height;
        this.rockLayerHeight = this.height * 0.98;
        
        // Reposition players on terrain after resize
        if (this.players && this.terrain) {
            this.players.forEach(player => {
                player.y = this.getTerrainHeight(player.x);
            });
        }
    }
    
    /**
     * Initialize or reset the game state
     */
    initGame() {
        // Reset game state
        this.gameOver = false;
        this.gameOverMessage = null;
        this.gameOverColor = null;
        this.projectileInFlight = false;
        this.explosion = null;
        this.turnInProgress = false;
        
        // Generate terrain
        this.generateTerrain();
        
        // Place players on the terrain
        this.placePlayers();
        
        // Reset power/angle to default
        this.playerPower = [50, 50];
        this.playerAngle = [135, 45];
        
        // Player 1 goes first
        this.currentPlayer = 0;
        
        // Initial wind
        this.generateWind();
    }
    
    placePlayers() {
        // Create players (tanks)
        this.players = [
            { x: this.width * 0.2, y: 0, color: '#FF6600', health: 100 },
            { x: this.width * 0.8, y: 0, color: '#3399FF', health: 100 }
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
            const endX = Math.min(this.width, player.x + platformWidth);
            
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
    
    /**
     * Adjust power for a player
     * @param {number} playerIndex - Index of the player
     * @param {number} amount - Amount to adjust (positive or negative)
     */
    adjustPower(playerIndex, amount) {
        if (playerIndex < 0 || playerIndex >= this.playerPower.length) return;
        
        this.playerPower[playerIndex] = Math.min(100, 
            Math.max(1, this.playerPower[playerIndex] + amount));
    }
    
    /**
     * Adjust angle for a player
     * @param {number} playerIndex - Index of the player
     * @param {number} amount - Amount to adjust (positive or negative)
     */
    adjustAngle(playerIndex, amount) {
        if (playerIndex < 0 || playerIndex >= this.playerAngle.length) return;
        
        this.playerAngle[playerIndex] = Math.min(180, 
            Math.max(0, this.playerAngle[playerIndex] + amount));
    }
    
    // Game core logic methods
    generateTerrain() {
        // Generate terrain points
        this.terrain = [];
        
        // Start and end points with consistent height
        const baseHeight = this.height * 0.6;
        this.terrain.push(0);
        this.terrain.push(baseHeight);
        
        // Generate more points for smoother terrain
        const segments = 10000; // High resolution for smoother terrain
        const segmentWidth = this.width / segments;
        
        // Generate control points with smoother transitions
        const controlPoints = [];
        const numControlPoints = 6; // Adjust control points for smoothness
        
        for (let i = 0; i <= numControlPoints; i++) {
            const x = i * (this.width / numControlPoints);
            // Vary height but keep within reasonable bounds and above rock layer
            const variance = this.height * 0.5; // Less variance = smoother terrain
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
        this.terrain.push(this.width);
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
        
        return this.height;
    }
    

    
    /**
     * Create a new projectile based on current player's settings
     * @returns {boolean} Whether missile was successfully fired
     */
    fireMissile() {
        // Prevent firing if projectile is already in flight, game is over, or turn is in progress
        if (this.projectileInFlight || this.gameOver || this.turnInProgress) return false;
        
        // Mark turn as in progress to prevent multiple firing
        this.turnInProgress = true;
        
        const player = this.players[this.currentPlayer];
        const initialVelocity = this.playerPower[this.currentPlayer] * 2.5;  // Translates to roughly 250m/s
        const rawAngle = this.playerAngle[this.currentPlayer];
        
        // Convert degrees to radians and adjust for proper orientation
        const angle = (180 - rawAngle) * Math.PI / 180;
        
        // Calculate initial position further from the tank to avoid immediate collision
        const startDistance = 25; // Distance from center of tank to avoid collision
        
        this.projectile = {
            x: player.x + Math.cos(angle) * startDistance,
            y: player.y - 10 - Math.sin(angle) * startDistance,
            vx: Math.cos(angle) * initialVelocity + this.windSpeed / 37.5,  // 37.5 is a manually tuned constant
            vy: -Math.sin(angle) * initialVelocity, // Negative because y-axis is inverted
            trail: []
        };
        
        this.projectileInFlight = true;
        return true;
    }
    
    /**
     * Update the projectile position based on physics
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    updateProjectile(deltaTime = 1/30) {
        if (!this.projectileInFlight || !this.projectile) return;
        
        // Gravity acceleration (pixels/sec^2)
        const g = this.gravity;
        
        // Air resistance - proportional to velocity squared, opposing motion
        const airResistance = 0.001; // Resistance coefficient
        
        // Calculate drag forces (opposite to velocity direction, proportional to v^2)
        const dragX = -airResistance * this.projectile.vx * Math.abs(this.projectile.vx);
        const dragY = -airResistance * this.projectile.vy * Math.abs(this.projectile.vy);
        
        // Update velocities based on all forces
        this.projectile.vx += dragX * deltaTime;
        this.projectile.vy += (g + dragY) * deltaTime;
        
        // Update position with current velocity (d = vt)
        this.projectile.x += this.projectile.vx * deltaTime;
        this.projectile.y += this.projectile.vy * deltaTime;
        
        // Add to trail
        this.projectile.trail.push({ x: this.projectile.x, y: this.projectile.y });
        if (this.projectile.trail.length > 10) {
            this.projectile.trail.shift();
        }
    }
    
    /**
     * Apply the effects of the current explosion (terrain damage and player damage)
     */
    applyExplosionEffects() {
        if (!this.explosion || !this.explosion.pendingTerrainDamage) return;
        
        // Apply terrain damage
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
    
    /**
     * Check for projectile collisions with terrain, players, or boundaries
     * @returns {string|null} Collision type or null if no collision
     */
    checkProjectileCollisions() {
        // If we no longer have a projectile in flight, exit
        if (!this.projectileInFlight) return null;
        
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
            return 'terrain';
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
                return 'player';
            }
        }
        
        // Check if projectile is out of bounds
        if (this.projectile.x < 0 || this.projectile.x > this.width || 
            this.projectile.y > this.height) {
            // Projectile left the screen, switch to next player
            this.projectileInFlight = false;
            this.turnInProgress = false;
            this.switchPlayer();
            return 'boundary';
        }
        
        // No collision
        return null;
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
    }
    
    checkGameOver() {
        // Count players with health > 0
        const alivePlayers = this.players.filter(player => player.health > 0).length;
        
        if (alivePlayers <= 1) {
            this.gameOver = true;
            this.turnInProgress = false; // Reset turn flag on game over
            
            // Find the winner (if there is one)
            const winner = this.players.findIndex(player => player.health > 0);
            
            // Store only the game state - the winner index (or -1 if tie)
            this.winner = winner;
            
            // Set game state flags - UI will be updated by controller and UI manager
            this.gameOver = true;
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
        // Generate random wind (-50 mps to 50 mps)
        this.windSpeed = Math.round((Math.random() * 2 - 1) * 100) / 2;
    }
    
    switchPlayer() {
        if (this.gameOver) return;

        // Generate new random wind for next turn
        this.generateWind();
        
        this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
        
        // Return the new player index
        return this.currentPlayer;
    }
    

}

// Export the Model class
export { Model };

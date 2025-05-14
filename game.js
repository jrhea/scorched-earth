// Scorched Earth Game
class ScorchedEarth {
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
        
        // UI elements
        this.powerValues = [
            document.getElementById('powerValue1'),
            document.getElementById('powerValue2')
        ];
        this.angleValues = [
            document.getElementById('angleValue1'),
            document.getElementById('angleValue2')
        ];
        
        // Update UI with initial values
        this.powerValues[0].textContent = this.playerPower[0];
        this.powerValues[1].textContent = this.playerPower[1];
        this.angleValues[0].textContent = this.playerAngle[0];
        this.angleValues[1].textContent = this.playerAngle[1];
        
        // Add keyboard event listeners
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // No fire button - using keyboard controls only
        
        // Initialize game
        this.initGame();
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
        
        // Generate terrain
        this.generateTerrain();
        
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
        
        // Generate random wind (between -1.0 and 1.0)
        this.windSpeed = (Math.random() - 0.5) * 2;
        
        // Reset current player
        this.currentPlayer = 0;
        
        // Update UI to highlight active player
        this.updatePlayerUI();
        
        // Draw initial game state
        this.drawGame();
    }
    
    createPlatformsForTanks() {
        // Create a flat platform for each tank
        this.players.forEach(player => {
            // Platform width in pixels - make it wide enough for the tank
            const platformWidth = 20;
            
            // Get the height at the tank's position
            const tankHeight = this.getTerrainHeight(player.x);
            
            // Define platform boundaries
            const platformLeft = Math.max(player.x - platformWidth, 0);
            const platformRight = Math.min(player.x + platformWidth, this.canvas.width);
            
            // First, find all terrain points within the platform range
            const pointsToFlatten = [];
            for (let i = 0; i < this.terrain.length; i += 2) {
                const terrainX = this.terrain[i];
                if (terrainX >= platformLeft && terrainX <= platformRight) {
                    pointsToFlatten.push(i);
                }
            }
            
            // If we don't have enough points in the range, add new ones
            if (pointsToFlatten.length < 3) {
                // Add explicit points at platform boundaries
                this.terrain.push(platformLeft);
                this.terrain.push(tankHeight);
                this.terrain.push(player.x);
                this.terrain.push(tankHeight);
                this.terrain.push(platformRight);
                this.terrain.push(tankHeight);
                
                // Sort terrain array by x-coordinate
                const tempTerrain = [];
                for (let i = 0; i < this.terrain.length; i += 2) {
                    tempTerrain.push({ x: this.terrain[i], y: this.terrain[i + 1] });
                }
                tempTerrain.sort((a, b) => a.x - b.x);
                
                // Rebuild terrain array
                this.terrain = [];
                for (const point of tempTerrain) {
                    this.terrain.push(point.x);
                    this.terrain.push(point.y);
                }
            } else {
                // Flatten existing points
                for (const i of pointsToFlatten) {
                    this.terrain[i + 1] = tankHeight;
                }
                
                // Ensure we have explicit points at the platform edges
                let hasLeftEdge = false;
                let hasRightEdge = false;
                
                for (let i = 0; i < this.terrain.length; i += 2) {
                    if (Math.abs(this.terrain[i] - platformLeft) < 1) hasLeftEdge = true;
                    if (Math.abs(this.terrain[i] - platformRight) < 1) hasRightEdge = true;
                }
                
                // Add missing edge points if needed
                if (!hasLeftEdge) {
                    this.terrain.push(platformLeft);
                    this.terrain.push(tankHeight);
                }
                
                if (!hasRightEdge) {
                    this.terrain.push(platformRight);
                    this.terrain.push(tankHeight);
                }
                
                // Sort terrain array by x-coordinate
                const tempTerrain = [];
                for (let i = 0; i < this.terrain.length; i += 2) {
                    tempTerrain.push({ x: this.terrain[i], y: this.terrain[i + 1] });
                }
                tempTerrain.sort((a, b) => a.x - b.x);
                
                // Rebuild terrain array
                this.terrain = [];
                for (const point of tempTerrain) {
                    this.terrain.push(point.x);
                    this.terrain.push(point.y);
                }
            }
        });
    }
    
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
        const segments = 10000; // Increase segments for higher resolution
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
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw sky/background
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        skyGradient.addColorStop(0, '#000033');
        skyGradient.addColorStop(1, '#660066');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the indestructible rock layer
        this.ctx.fillStyle = '#333';  // Dark gray color
        this.ctx.fillRect(0, this.rockLayerHeight, this.canvas.width, this.canvas.height - this.rockLayerHeight);
        
        // Draw wind indicator in top right corner like the original game
        this.ctx.save();
        this.ctx.fillStyle = '#8888ff';
        this.ctx.font = 'bold 20px Courier New';
        this.ctx.textAlign = 'right';
        
        // Format wind display with direction arrow
        const windValue = Math.abs(this.windSpeed * 100).toFixed(0);
        // Use larger arrows - larger Unicode arrow for right wind
        const windDirection = this.windSpeed > 0 ? '⮕' : '⬅';
        this.ctx.fillText(`Wind: ${windValue} ${windDirection}`, this.canvas.width - 20, 30);
        
        this.ctx.restore();
        
        // Draw terrain
        this.ctx.beginPath();
        this.ctx.moveTo(this.terrain[0], this.terrain[1]);
        
        for (let i = 2; i < this.terrain.length; i += 2) {
            this.ctx.lineTo(this.terrain[i], this.terrain[i + 1]);
        }
        
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.closePath();
        
        const terrainGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        terrainGradient.addColorStop(0, '#663300');
        terrainGradient.addColorStop(1, '#331100');
        this.ctx.fillStyle = terrainGradient;
        this.ctx.fill();
        
        // Draw players (tanks)
        this.players.forEach((player, index) => {
            // Draw tank body
            this.ctx.fillStyle = player.color;
            this.ctx.fillRect(player.x - 15, player.y - 10, 30, 10);
            
            // Draw tank turret
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y - 10, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw cannon
            this.ctx.beginPath();
            const rawAngle = this.playerAngle[index];
            
            // Convert degrees to radians and adjust for proper orientation
            const angle = (180 - rawAngle) * Math.PI / 180;
            const length = 20;
            this.ctx.moveTo(player.x, player.y - 10);
            this.ctx.lineTo(
                player.x + Math.cos(angle) * length,
                player.y - 10 - Math.sin(angle) * length
            );
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = player.color;
            this.ctx.stroke();
            
            // Draw health bar
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(player.x - 15, player.y - 25, 30, 5);
            this.ctx.fillStyle = player.health > 50 ? '#00FF00' : '#FF0000';
            this.ctx.fillRect(player.x - 15, player.y - 25, player.health / 100 * 30, 5);
        });
        
        // Draw active explosion if exists
        if (this.explosion) {
            const timePassed = Date.now() - this.explosion.startTime;
            if (timePassed < this.explosion.duration) {
                // Calculate opacity based on time (fade out effect)
                const opacity = Math.max(0, 1 - (timePassed / this.explosion.duration));
                
                // Draw the explosion
                this.ctx.beginPath();
                this.ctx.arc(this.explosion.x, this.explosion.y, this.explosion.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 200, 0, ${opacity * 0.8})`;
                this.ctx.fill();
                
                // Add explosion ring
                this.ctx.beginPath();
                this.ctx.arc(this.explosion.x, this.explosion.y, this.explosion.radius * 0.8, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                
                // Request another frame to continue the animation
                requestAnimationFrame(() => this.drawGame());
            }
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
        // Return early if nothing to animate at all
        if (!this.projectileInFlight && !this.gameOver && !this.explosion) return;
        
        // Always redraw game so we can display game over message or explosion
        this.drawGame();
        
        // If game is over, show the message and don't update projectile
        if (this.gameOver && this.gameOverMessage) {
            this.drawGameOverMessage();
            requestAnimationFrame(() => this.animateProjectile());
            return;
        }
        
        if (this.projectileInFlight) {
            // Update projectile position with faster movement
            this.projectile.vy += this.gravity;
            this.projectile.vx += this.windSpeed * 0.01;  // Increased wind effect
            this.projectile.x += this.projectile.vx * 1.5;  // Move 50% faster horizontally
            this.projectile.y += this.projectile.vy * 1.5;  // Move 50% faster vertically
            
            // Add to trail
            this.projectile.trail.push({ x: this.projectile.x, y: this.projectile.y });
            if (this.projectile.trail.length > 10) {
                this.projectile.trail.shift();
            }
        }
        
        // Store current player positions for consistent distance calculations
        const playerPositions = this.players.map(player => ({
            x: player.x,
            y: player.y
        }));
        
        // Check for collision with terrain
        const terrainHeight = this.getTerrainHeight(this.projectile.x);
        if (this.projectile.y >= terrainHeight) {
            this.createExplosion(this.projectile.x, terrainHeight, playerPositions);
            this.projectileInFlight = false;
            return;
        }
        
        // Check for collision with players
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            // Use the top of the tank (y-10) for consistent collision detection
            const dx = this.projectile.x - player.x;
            const dy = this.projectile.y - (player.y - 10); // Adjust to match the tank turret position
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 25) {
                this.createExplosion(this.projectile.x, this.projectile.y, playerPositions);
                this.projectileInFlight = false;
                return;
            }
        }
        
        // Check if projectile is out of bounds
        if (this.projectile.x < 0 || this.projectile.x > this.canvas.width || 
            this.projectile.y > this.canvas.height) {
            this.projectileInFlight = false;
            this.switchPlayer();
            return;
        }
        
        // Draw game with projectile
        this.drawGame();
        
        if (this.projectileInFlight) {
            // Draw projectile
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(this.projectile.x, this.projectile.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw trail
            this.ctx.beginPath();
            if (this.projectile.trail.length > 0) {
                this.ctx.moveTo(this.projectile.trail[0].x, this.projectile.trail[0].y);
                for (let i = 1; i < this.projectile.trail.length; i++) {
                    this.ctx.lineTo(this.projectile.trail[i].x, this.projectile.trail[i].y);
                }
            }
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // Continue animation
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
            duration:2000 // 2 second duration
        };
        
        // Draw the explosion immediately for visual feedback
        this.ctx.beginPath();
        this.ctx.arc(x, y, explosionRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
        this.ctx.fill();
        
        // Add explosion ring
        this.ctx.beginPath();
        this.ctx.arc(x, y, explosionRadius * 0.8, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Damage terrain
        this.damageTerrainAt(x, y, explosionRadius);
        
        // Check for player damage
        let damageDealt = false;
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
                    this.damagePlayer(i, damage);
                    damageDealt = true;
                    
                    // Visual indicator that player was hit
                    this.ctx.beginPath();
                    this.ctx.arc(player.x, player.y - 10, 15, 0, Math.PI * 2);
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    this.ctx.fill();
                }
            }
        }
        
        // Add sound effect indication (text only for now)
        if (damageDealt) {
            console.log('Hit player!');
        }
        
        // Check if game is over
        this.checkGameOver();
        
        // Start the animation loop to continue rendering the explosion
        requestAnimationFrame(() => this.drawGame());
        
        // Schedule player switch after explosion animation completes
        if (!this.gameOver) {
            setTimeout(() => {
                this.explosion = null;
                this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
                // Reset turn progress flag to allow the next player to fire
                this.turnInProgress = false;
                this.updatePlayerUI();
                this.drawGame();
            }, this.explosion.duration);
        }
    }
    
    checkGameOver() {
        // Count players with health > 0
        const alivePlayers = this.players.filter(player => player.health > 0).length;
        
        if (alivePlayers <= 1) {
            this.gameOver = true;
            
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
            this.drawGameOverMessage();
        }
    }
    
    drawGameOverMessage() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw winner banner
        const bannerHeight = 120;
        const bannerY = (this.canvas.height - bannerHeight) / 2;
        
        this.ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
        this.ctx.fillRect(0, bannerY, this.canvas.width, bannerHeight);
        
        // Border for the banner
        this.ctx.strokeStyle = this.gameOverColor;
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(5, bannerY + 5, this.canvas.width - 10, bannerHeight - 10);
        
        // Game over text
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = this.gameOverColor;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.gameOverMessage, this.canvas.width / 2, this.canvas.height / 2);
        
        // Instruction text
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('Press SPACE to play again', this.canvas.width / 2, this.canvas.height / 2 + 37.5);
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
    
    showGameOverMessage(message) {
        // Show game over message
        setTimeout(() => {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                message, 
                this.canvas.width / 2, 
                this.canvas.height / 2
            );
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText(
                'Click Fire to play again', 
                this.canvas.width / 2, 
                this.canvas.height / 2 + 40
            );
            
            // Change fire button to restart
            this.fireButton.textContent = 'Play Again';
            this.fireButton.addEventListener('click', () => {
                this.fireButton.textContent = 'FIRE!';
                this.initGame();
                this.gameOver = false;
            }, { once: true });
        }, 1000);
    }
    
    switchPlayer() {
        if (this.gameOver) return;

        // Generate new random wind for next turn (-1.0 to 1.0)
        this.windSpeed = (Math.random() - 0.5) * 2;
        
        this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
        
        // Update UI to highlight active player
        this.updatePlayerUI();
        
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
    
    processKeys() {
        // Use a fixed step size for consistent adjustments
        const baseStep = 1;
        
        // Process power adjustments
        if (this.keyState.ArrowUp) {
            // Increase power
            this.playerPower[this.currentPlayer] = Math.min(100, 
                this.playerPower[this.currentPlayer] + baseStep);
            this.powerValues[this.currentPlayer].textContent = this.playerPower[this.currentPlayer];
        }
        if (this.keyState.ArrowDown) {
            // Decrease power
            this.playerPower[this.currentPlayer] = Math.max(0, 
                this.playerPower[this.currentPlayer] - baseStep);
            this.powerValues[this.currentPlayer].textContent = this.playerPower[this.currentPlayer];
        }
        
        // Process angle adjustments
        if (this.keyState.ArrowLeft) {
            // Decrease angle
            this.playerAngle[this.currentPlayer] = Math.max(0, 
                this.playerAngle[this.currentPlayer] - baseStep);
            this.angleValues[this.currentPlayer].textContent = this.playerAngle[this.currentPlayer];
        }
        if (this.keyState.ArrowRight) {
            // Increase angle
            this.playerAngle[this.currentPlayer] = Math.min(180, 
                this.playerAngle[this.currentPlayer] + baseStep);
            this.angleValues[this.currentPlayer].textContent = this.playerAngle[this.currentPlayer];
        }
        
        // Redraw the game to update the cannon direction
        this.drawGame();
    }
    
    updatePlayerUI() {
        // Get player info elements
        const player1Info = document.querySelector('.player1');
        const player2Info = document.querySelector('.player2');
        
        // Highlight active player, dim inactive player
        if (this.currentPlayer === 0) {
            player1Info.style.opacity = '1';
            player2Info.style.opacity = '0.5';
        } else {
            player1Info.style.opacity = '0.5';
            player2Info.style.opacity = '1';
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new ScorchedEarth();
});

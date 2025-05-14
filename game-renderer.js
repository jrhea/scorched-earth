/**
 * GameRenderer - Handles all rendering and UI-related operations.
 * This class follows the View part of the MVC pattern.
 */
class GameRenderer {
    /**
     * Constructor to initialize the UI manager
     * @param {HTMLCanvasElement} canvas - The game canvas element
     * @param {GameModel} engine - The game model instance for state access
     */
    constructor(canvas, engine) {
        // Store references
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.engine = engine;
        
        // UI elements from DOM
        this.powerValues = [
            document.getElementById('powerValue1'),
            document.getElementById('powerValue2')
        ];
        this.angleValues = [
            document.getElementById('angleValue1'),
            document.getElementById('angleValue2')
        ];
        this.playerInfos = [
            document.querySelector('.player-info.player1'),
            document.querySelector('.player-info.player2')
        ];
    }
    

    
    /**
     * Update player UI elements with current game state
     */
    updatePlayerUI() {
        // Update power and angle displays
        for (let i = 0; i < 2; i++) {
            if (this.powerValues[i]) {
                this.powerValues[i].textContent = this.engine.playerPower[i];
            }
            
            // Calculate angle and direction hint
            const angle = this.engine.playerAngle[i];
            let directionHint = '';
            
            // Add direction hints based on angle
            if (angle < 10) directionHint = i === 0 ? "(Right)" : "(Left)";
            else if (angle > 170) directionHint = i === 0 ? "(Left)" : "(Right)";
            else if (angle > 80 && angle < 100) directionHint = "(Up)";
            
            if (this.angleValues[i]) {
                this.angleValues[i].textContent =`${angle}${directionHint}`;
            }
        }
        
        // Highlight current player
        this.playerInfos.forEach((info, index) => {
            if (info) {
                if (index === this.engine.currentPlayer) {
                    info.classList.add('active');
                } else {
                    info.classList.remove('active');
                }
            }
        });
        
        // Wind is now drawn directly on the canvas in drawWind()
    }
    
    /**
     * Draw the game background
     */
    drawBackground() {
        // Fill background with gradient sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');   // Sky blue at top
        gradient.addColorStop(1, '#E0F7FF');   // Lighter blue at bottom
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Draw the terrain based on game engine state
     */
    drawTerrain() {
        if (!this.engine.terrain) return;
        
        // Draw terrain lines
        this.ctx.beginPath();
        this.ctx.moveTo(this.engine.terrain[0], this.engine.terrain[1]);
        
        for (let i = 2; i < this.engine.terrain.length; i += 2) {
            this.ctx.lineTo(this.engine.terrain[i], this.engine.terrain[i + 1]);
        }
        
        // Continue to bottom corners to fill
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.closePath();
        
        // Create gradient for terrain
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#8B4513');  // Brown for top of terrain
        gradient.addColorStop(0.7, '#654321'); // Darker brown for deeper terrain
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw rock layer
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(0, this.engine.rockLayerHeight, this.canvas.width, 
            this.canvas.height - this.engine.rockLayerHeight);
    }
    
    /**
     * Draw the players (tanks) based on game engine state
     */
    drawPlayers() {
        if (!this.engine.players) return;
        
        // Draw each player (tank)
        this.engine.players.forEach((player, index) => {
            // Base y-offset for all tank components
            const yOffset = 10;
            
            // Tank wheels/tracks - use player's color
            this.ctx.fillStyle = player.color;
            this.ctx.fillRect(player.x - 17, player.y - yOffset + 9, 34, 4);
            
            // Tank base/body - use player's color
            this.ctx.fillStyle = player.color;
            this.ctx.fillRect(player.x - 15, player.y - yOffset, 30, 10);
            
            // Tank turret - use player's color
            this.ctx.fillStyle = player.color;
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y - yOffset - 5, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw angle indicator/gun (white)
            const angle = this.engine.playerAngle[index];
            const radian = (180 - angle) * Math.PI / 180;
            const lineLength = 20;
            
            this.ctx.beginPath();
            this.ctx.moveTo(player.x, player.y - yOffset - 5); // Start at center of turret
            this.ctx.lineTo(
                player.x + Math.cos(radian) * lineLength,
                player.y - yOffset - 5 - Math.sin(radian) * lineLength
            );
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Health bar
            const healthWidth = 30 * (player.health / 100);
            
            // Health bar background (red)
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(player.x - 15, player.y + 7.5, 30, 5);
            
            // Health bar foreground (green) - positioned below the tank
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillRect(player.x - 15, player.y + 7.5, healthWidth, 5);
        });
    }
    
    /**
     * Draw the projectile and its trail
     */
    drawProjectile() {
        if (!this.engine.projectileInFlight || !this.engine.projectile) return;
        
        // Draw the projectile trail
        this.ctx.beginPath();
        if (this.engine.projectile.trail.length > 0) {
            this.ctx.moveTo(this.engine.projectile.trail[0].x, this.engine.projectile.trail[0].y);
            for (let i = 1; i < this.engine.projectile.trail.length; i++) {
                this.ctx.lineTo(this.engine.projectile.trail[i].x, this.engine.projectile.trail[i].y);
            }
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // Draw the projectile
        this.ctx.beginPath();
        this.ctx.arc(this.engine.projectile.x, this.engine.projectile.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
    }
    
    /**
     * Draw the explosion animation
     */
    drawExplosion() {
        if (!this.engine.explosion) return;
        
        // Calculate explosion animation based on time since explosion started
        const timeSinceStart = Date.now() - this.engine.explosion.startTime;
        const progress = Math.min(timeSinceStart / this.engine.explosion.duration, 1);
        
        // Calculate size and opacity based on progress
        const size = this.engine.explosion.radius * (1 - Math.abs(progress - 0.5) * 2);  // Grows then shrinks
        const opacity = 1 - progress;  // Fades out over time
        
        // Draw explosive force circle
        this.ctx.beginPath();
        this.ctx.arc(this.engine.explosion.x, this.engine.explosion.y, size, 0, Math.PI * 2);
        
        // Create radial gradient for explosion
        const gradient = this.ctx.createRadialGradient(
            this.engine.explosion.x, this.engine.explosion.y, 0,
            this.engine.explosion.x, this.engine.explosion.y, size
        );
        gradient.addColorStop(0, `rgba(255, 255, 0, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(255, 128, 0, ${opacity})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${opacity * 0.5})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }
    
    /**
     * Draw wind indicator directly on the canvas
     */
    drawWind() {
        if (!this.engine) return;
        
        // Get wind data
        const absWind = Math.abs(Math.round(this.engine.windSpeed * 100));
        
        // Draw wind value text
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`Wind: ${absWind}`, this.canvas.width - 60, 30);
        
        // Draw single larger arrow based on direction
        this.ctx.font = 'bold 28px Arial';
        const arrowChar = this.engine.windSpeed < 0 ? '←' : '→'; // Left or right arrow
        
        this.ctx.textAlign = 'left';
        this.ctx.fillText(arrowChar, this.canvas.width - 50, 22);
    }
    
    /**
     * Display the game over message based on winner data from the engine
     */
    drawGameOverMessage() {
        if (!this.engine.gameOver) return;
        
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Determine message and color based on winner index
        let message, color;
        
        if (this.engine.winner !== -1) {
            message = `PLAYER ${this.engine.winner + 1} WINS!`;
            color = this.engine.players[this.engine.winner].color;
        } else {
            message = "IT'S A TIE!";
            color = '#FFFFFF';
        }
        
        // Draw game over message
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
        
        // Draw restart message
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('Press SPACE or ENTER to restart', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }
    
    /**
     * Draw the entire game state
     */
    drawGame() {
        this.drawBackground();
        this.drawTerrain();
        this.drawPlayers();
        this.drawProjectile();
        this.drawExplosion();
        
        // Draw wind indicator
        this.drawWind();
        
        // Draw game over message if needed
        if (this.engine.gameOver) {
            this.drawGameOverMessage();
        }
    }
}

// Export the GameRenderer class
export { GameRenderer };

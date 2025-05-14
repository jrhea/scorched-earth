// UI Manager class to handle all UI-related operations
// Import not needed here as GameEngine imports UIManager
class UIManager {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas dimensions
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = 700; // Fixed height to match CSS
        
        // UI elements
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
        
        // Set up event listener for window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.game.drawGame();
    }
    
    updatePlayerUI() {
        // Update power and angle displays
        for (let i = 0; i < 2; i++) {
            if (this.powerValues[i]) {
                this.powerValues[i].textContent = this.game.playerPower[i];
            }
            
            // Calculate angle and direction hint
            const angle = this.game.playerAngle[i];
            let directionHint = '';
            
            // Add direction hints based on angle
            if (angle < 10) directionHint = i === 0 ? "(Right)" : "(Left)";
            else if (angle > 170) directionHint = i === 0 ? "(Left)" : "(Right)";
            else if (angle > 80 && angle < 100) directionHint = "(Up)";
            
            if (this.angleValues[i]) {
                this.angleValues[i].textContent =`${angle}${directionHint}`;
            }
        }
        
        // Highlight active player
        this.playerInfos.forEach((info, index) => {
            if (info) {
                if (index === this.game.currentPlayer) {
                    info.classList.add('active-player');
                } else {
                    info.classList.remove('active-player');
                }
            }
        });
        
        // Wind is now drawn on canvas
    }
    
    drawBackground() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');  // Sky blue at top
        gradient.addColorStop(1, '#E0F7FA');  // Light blue at horizon
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw wind indicator
        this.drawWindIndicator();
        
        // Draw the indestructible rock layer
        this.ctx.fillStyle = '#333';  // Dark gray color
        this.ctx.fillRect(0, this.game.rockLayerHeight, this.canvas.width, this.canvas.height - this.game.rockLayerHeight);
    }
    
    drawWindIndicator() {
        // Display wind information on canvas
        const absWind = Math.abs(Math.round(this.game.windSpeed * 100));
        const windDirection = this.game.windSpeed < 0 ? '←' : '→';
        const windText = `Wind: ${absWind} ${windDirection}`;
        
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(windText, this.canvas.width - 20, 30);
    }
    
    drawTerrain() {
        // Draw the terrain
        this.ctx.beginPath();
        
        // Start at the bottom left of the screen
        this.ctx.moveTo(0, this.canvas.height);
        
        // Draw line to the first terrain point
        this.ctx.lineTo(this.game.terrain[0], this.game.terrain[1]);
        
        // Connect all terrain points
        for (let i = 0; i < this.game.terrain.length; i += 2) {
            this.ctx.lineTo(this.game.terrain[i], this.game.terrain[i + 1]);
        }
        
        // Close the path by drawing to the bottom right, then to bottom left
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        
        // Fill terrain with a gradient
        const terrainGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        terrainGradient.addColorStop(0, '#8B4513');  // Saddle Brown at top
        terrainGradient.addColorStop(1, '#CD853F');  // Peru at bottom
        
        this.ctx.fillStyle = terrainGradient;
        this.ctx.fill();
    }
    
    drawPlayers() {
        // Draw the players (tanks)
        this.game.players.forEach((player, index) => {
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
            const angle = this.game.playerAngle[index];
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
            
            // Health bar background (red) - positioned below the tank
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(player.x - 15, player.y + 7.5, 30, 5);
            
            // Health bar foreground (green) - positioned below the tank
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillRect(player.x - 15, player.y + 7.5, healthWidth, 5);
        });
    }
    
    drawProjectile() {
        if (!this.game.projectileInFlight || !this.game.projectile) return;
        
        // Draw the projectile trail
        this.ctx.beginPath();
        if (this.game.projectile.trail.length > 0) {
            this.ctx.moveTo(this.game.projectile.trail[0].x, this.game.projectile.trail[0].y);
            for (let i = 1; i < this.game.projectile.trail.length; i++) {
                this.ctx.lineTo(this.game.projectile.trail[i].x, this.game.projectile.trail[i].y);
            }
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // Draw the projectile
        this.ctx.beginPath();
        this.ctx.arc(this.game.projectile.x, this.game.projectile.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
    }
    
    drawExplosion() {
        if (!this.game.explosion) return;
        
        // Calculate explosion animation based on time since explosion started
        const timeSinceStart = Date.now() - this.game.explosion.startTime;
        const progress = Math.min(timeSinceStart / this.game.explosion.duration, 1);
        
        // Calculate size and opacity based on progress
        const size = this.game.explosion.radius * (1 - Math.abs(progress - 0.5) * 2);  // Grows then shrinks
        const opacity = 1 - progress;  // Fades out over time
        
        // Draw explosive force circle
        this.ctx.beginPath();
        this.ctx.arc(this.game.explosion.x, this.game.explosion.y, size, 0, Math.PI * 2);
        
        // Create radial gradient for explosion
        const gradient = this.ctx.createRadialGradient(
            this.game.explosion.x, this.game.explosion.y, 0,
            this.game.explosion.x, this.game.explosion.y, size
        );
        gradient.addColorStop(0, `rgba(255, 255, 0, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(255, 128, 0, ${opacity})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${opacity * 0.5})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }
    
    drawGameOverMessage() {
        if (!this.game.gameOver || !this.game.gameOverMessage) return;
        
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game over message
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = this.game.gameOverColor || '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.game.gameOverMessage, this.canvas.width / 2, this.canvas.height / 2);
        
        // Draw instructions to restart
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press SPACE or ENTER to restart', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }
}

// Export the UIManager class
export { UIManager };

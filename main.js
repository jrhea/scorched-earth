// Import the GameEngine class
import { GameEngine } from './game-engine.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create a new instance of GameEngine to start the game
    const game = new GameEngine();
    
    // If needed, you can expose the game instance globally for debugging
    window.gameInstance = game;
});

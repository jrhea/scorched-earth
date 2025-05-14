// Import the necessary components for our MVC architecture
import { GameModel } from './game-model.js';
import { GameRenderer } from './game-renderer.js';
import { GameController } from './game-controller.js';

/**
 * Main entry point for the Scorched Earth game using MVC architecture:
 * - GameEngine (Model): Handles game state and logic
 * - UIManager (View): Handles rendering and display
 * - GameController (Controller): Manages user input and coordinates between model and view
 */
document.addEventListener('DOMContentLoaded', () => {
    // Get the canvas element
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Cannot find canvas element');
        return;
    }
    
    // Set initial canvas dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = 700; // Fixed height for consistent gameplay
    
    // Create the game components
    const model = new GameModel(canvas.width, canvas.height);
    const renderer = new GameRenderer(canvas, model);
    const controller = new GameController(canvas);
    
    // Connect the components
    controller.init(model, renderer);
    
    // For debugging
    window.gameModel = model;
    window.gameRenderer = renderer;
    window.gameController = controller;
    
    // Log initialization success
    console.log('Scorched Earth Game initialized successfully');
});

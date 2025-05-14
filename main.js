// Import the necessary components for our MVC architecture
import { Model } from './model.js';
import { Renderer } from './renderer.js';
import { Controller } from './controller.js';

/**
 * Main entry point for the Scorched Earth game:
 * - Model: Handles game state and logic
 * - Renderer: Handles rendering and display
 * - Controller: Manages user input and coordinates between model and view
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
    const model = new Model(canvas.width, canvas.height);
    const renderer = new Renderer(canvas, model);
    const controller = new Controller(canvas);
    
    // Connect the components
    controller.init(model, renderer);
    
    // For debugging
    window.gameModel = model;
    window.gameRenderer = renderer;
    window.gameController = controller;
    
    // Log initialization success
    console.log('Scorched Earth Game initialized successfully');
});

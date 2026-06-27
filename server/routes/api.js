// API Routes Module

const express = require('express');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const gameEngine = require('../gameEngine');
const { saveGame, getGame } = require('../data/games');
const { isValidGameId, isValidAction } = require('../utils/validators');

// Rate limiting
const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW || 60000, // 1 minute
    max: process.env.RATE_LIMIT_MAX || 60,
    message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all game routes
router.use(limiter);

// Helper to build the client-facing game state (hides dealer hole card)
function buildGameStateResponse(game) {
    return {
        playerHand: game.playerHand,
        dealerHand: game.dealerHand.map(card => ({
            ...card,
            value: card.faceUp ? card.value : '?',
            suit: card.faceUp ? card.suit : 'hidden'
        })),
        playerScore: game.playerScore,
        dealerScore: game.state === gameEngine.GAME_STATES.GAME_OVER
            ? game.dealerScore
            : calculateVisibleDealerScore(game.dealerHand),
        state: game.state,
        result: game.result,
        cardsRemaining: game.deck.length
    };
}

// Create new game
router.post('/game/new', (req, res) => {
    try {
        const gameId = uuidv4();
        const game = gameEngine.createGame(gameId);

        saveGame(game);

        res.json({
            success: true,
            gameId: game.id,
            message: 'Game created successfully'
        });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create game'
        });
    }
});

// Start new round
router.post('/game/:gameId/start', (req, res) => {
    try {
        const { gameId } = req.params;

        if (!isValidGameId(gameId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid game ID format'
            });
        }

        const game = getGame(gameId);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found or expired'
            });
        }

        const updatedGame = gameEngine.startRound(game);
        saveGame(updatedGame);

        res.json({
            success: true,
            gameState: buildGameStateResponse(updatedGame)
        });
    } catch (error) {
        console.error('Error starting round:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start round'
        });
    }
});

// Player action (hit, stand, new-round)
router.post('/game/:gameId/action', (req, res) => {
    try {
        const { gameId } = req.params;
        const { action } = req.body;

        if (!isValidGameId(gameId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid game ID format'
            });
        }

        if (!isValidAction(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action'
            });
        }

        const game = getGame(gameId);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found or expired'
            });
        }

        let updatedGame;

        if (action === 'hit') {
            if (game.state !== gameEngine.GAME_STATES.PLAYER_TURN) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot hit right now'
                });
            }
            updatedGame = gameEngine.playerHit(game);
        } else if (action === 'stand') {
            if (game.state !== gameEngine.GAME_STATES.PLAYER_TURN) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot stand right now'
                });
            }
            updatedGame = gameEngine.playerStand(game);

            // Dealer automatically plays out their hand
            if (updatedGame.state === gameEngine.GAME_STATES.DEALER_TURN) {
                updatedGame = gameEngine.dealerPlay(updatedGame);
            }
        } else if (action === 'new-round') {
            updatedGame = gameEngine.newRound(game);
        }

        saveGame(updatedGame);

        res.json({
            success: true,
            gameState: buildGameStateResponse(updatedGame)
        });
    } catch (error) {
        console.error('Error processing action:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process action'
        });
    }
});

// Get current game state
router.get('/game/:gameId/state', (req, res) => {
    try {
        const { gameId } = req.params;

        if (!isValidGameId(gameId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid game ID format'
            });
        }

        const game = getGame(gameId);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found or expired'
            });
        }

        res.json({
            success: true,
            gameState: buildGameStateResponse(game)
        });
    } catch (error) {
        console.error('Error getting game state:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get game state'
        });
    }
});

// Calculate visible dealer score (face-up cards only)
function calculateVisibleDealerScore(dealerHand) {
    const visibleCards = dealerHand.filter(c => c.faceUp);
    return gameEngine.calculateHandValue(visibleCards);
}

module.exports = router;

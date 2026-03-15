// API Routes Module 

const express = require('express');
const rateLimit = require('express-rate-limit');
const {v4: uuidv4} = require('uuid');
const router = express.Router();

const gameEngine = require('../gameEngine');
const {saveGame, getGame} = require('../data/games');
const{isValidGameId, isValidAction, sanitizeInput} = require('../utils/validators');

// rate limiting
const limiter = rateLimit({
    windowsMs: process.env.RATE_LIMIT_WINDOW || 60000, // 1 minute
    max: process.env.RATE_LIMIT_MAX || 10, 
    message: {error: 'Too many requests, please try again later.'}
});

// Apply rate limiting to all game routes
router.use(limiter);

// Create new game
router.post('/game/new', (req, res) => {
    try {
        const gameId = uuidv4();
        const game = gameEngine.createGame(gameId);

        saveGame(game);

        res.json({
            success: true,
            gameId: game.id,
            message: 'Gamecreated successfully'
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
        const {gameId} = req.params;

        // Validate game ID
        if(!isValidGameId(gameId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid game ID format'
            });
        }

        // Get game from storage
        const game = getGame(gameId);
        if (!game) {
            return res.status(404).json({
                success: false;
                error: 'Game not found or expired'
            });
        }

        // Start the round
        const updateGame = gameEngine.startRound(game);
        saveGame(updatedGame);

        // Prepare response (hide dealer's hole card)
        const response = {
            success: true,
            gameState: {
                playerHand: updatedGame.playerHand,
                dealerHand: updatedGame.dealerHand.map(card => ({
                    ...card,
                    value: card.faceUp ? card.value : '?',
                    suit: card.faceUp ? card.suit : 'hidden'
                })),
                playerScore: updatedGame.playerScore,
                dealerScore: updatedGame.dealerScore, //despite full score, hole card still hidden
                state: updatedGame.state,
                result: updatedGame.result
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error starting round:', error);
        res.status(500).json({
            success: false,
            error: 'Falied to start round'
        });
    }
});

// Player action (hit, stand)
router.post('/game/:gameId/action', (req, res) => {
    try {
        const {gameId} = req.params;
        const {action} = req.body;

        // Validate inputs
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

        // Get game
        const game = getGame(gamdId);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found or expired'
            });
        }

        // Process action
        let updateGame;

        if (action === 'hit') {
            updatedGame = gameEngine.playerHit(game);
        } else if (action === 'stand') {
            updatedGame = gameEngine.playerStand(game);

            // Dealer automatically plays
            if (updatedGame.state === gameEngine.GAME_STATES.DEALER_TURN) {
                updatedGame = gameEngine.dealerPlay(updatedGame);
            }
        } else if (action === 'new-round') {
            updatedGame = gameEngine.newRound(game);
        }

        saveGame(updateGame);

        // Prepare response (hide dealer's hole card if still hidden)
        const response = {
            succes: true,
            gameState: {
                playerHand: updatedGame.playerHand,
                dealerHand: updatedGame.dealerHand.map(card => ({
                    ...card,
                    value: card.faceUp ? card.value : '?',
                    suit: card.faceUp ? card.suit : 'hidden'
                })),
                playerScore: updatedGame.playerScore,
                dealerScore: updatedGame.state === gameEngine.GAME_STATES.GAME_OVER
                ? updatedGame.dealerScore
                : updatedGame.dealerScore, // hide dealer score until end
                state: updatedGame.state,
                result: updatedGame.result 
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error processing action:', error);
        res.status(500).json({
            success: false,
            error: 'Falied to process action'
        });
    }
});

// Get current game state
router.get('/game/:gameId/state', (req, res) => {
    try {
        const {gameId} = req.params;

        if (!isValidGameId(gameId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid game ID format'
            });
        }

        const game = getGame(gameId);
        if (!game) {
            return res.status(404).json({
                success:false,
                error: 'Game not found or expired'
            });
        }

        // Prepare response (hide dealer's hole card)
        const response = {
            success: true,
            gameState: {
                playerHand: game.playerHand,
                dealerHand: game.dealerHand.map(card => ({
                    ...card, 
                    value: card.faceUp ? card.value: '?', 
                    suit: card.faceUp ? card.suit: 'hidden'
                })), 
                playerScore: game.playerScore,
                dealerScore: game.state === gameEngine.GAME_STATE.GAME_OVER
                ? game.dealerScore
                : calculateVisibleDealerScore(game.dealerHand),
                state: game.state,
                result: game.result
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting game state:', error);
        res.status(500).json({
            success: false, 
            error: 'Failed to get game state'
        });
    }
});

// calculate visible dealer score (face up cards )
function calculateVisibleDealerScore(dealerHand) {
    const visibleCards = dealerHand.filter(c => c.faceUp);
    return gameEngine.calculateHandValue(visibleCards);
}

module.exports = router;
// Game Engine module

const { resetDeck, dealCard } = require('./deck');

// Game states
const GAME_STATES = {
    BETTING: 'betting',
    PLAYER_TURN: 'player_turn',
    DEALER_TURN: 'dealer_turn',
    GAME_OVER: 'game_over'
};

// Game results
const GAME_RESULTS = {
    PLAYER_WIN: 'player_win',
    DEALER_WIN: 'dealer_win',
    PUSH: 'push',
    PLAYER_BUST: 'player_bust',
    DEALER_BUST: 'dealer_bust',
    BLACKJACK: 'blackjack'
};

// Create new game session (returns initial game state)
function createGame(gameId) {
    // Create fresh shoe (6 decks)
    const deck = resetDeck(6);

    const game = {
        id: gameId,
        state: GAME_STATES.BETTING,
        deck,
        playerHand: [],
        dealerHand: [],
        playerScore: 0,
        dealerScore: 0,
        result: null,
        createdAt: Date.now(),
        lastAction: Date.now()
    };
    return game;
}

// Starts a new round (returns updated game state)
function startRound(game) {
    let currentDeck = [...game.deck];
    let playerHand = [];
    let dealerHand = [];

    // Deal first card to player
    let { card, remainingDeck } = dealCard(currentDeck);
    playerHand.push({ ...card, faceUp: true });
    currentDeck = remainingDeck;

    // Deal first card to dealer
    ({ card, remainingDeck } = dealCard(currentDeck));
    dealerHand.push({ ...card, faceUp: true });
    currentDeck = remainingDeck;

    // Deal second card to player
    ({ card, remainingDeck } = dealCard(currentDeck));
    playerHand.push({ ...card, faceUp: true });
    currentDeck = remainingDeck;

    // Deal second card to dealer (face down / hole card)
    ({ card, remainingDeck } = dealCard(currentDeck));
    dealerHand.push({ ...card, faceUp: false });
    currentDeck = remainingDeck;

    // Calculate initial scores
    const playerScore = calculateHandValue(playerHand);

    // Check for immediate player blackjack
    let gameState = GAME_STATES.PLAYER_TURN;
    let result = null;

    if (playerScore === 21) {
        // Reveal dealer hand to check for push (dealer blackjack too)
        const revealedDealerHand = dealerHand.map(c => ({ ...c, faceUp: true }));
        const dealerScore = calculateHandValue(revealedDealerHand);

        gameState = GAME_STATES.GAME_OVER;
        result = dealerScore === 21 ? GAME_RESULTS.PUSH : GAME_RESULTS.BLACKJACK;

        return {
            ...game,
            deck: currentDeck,
            playerHand,
            dealerHand: revealedDealerHand,
            playerScore,
            dealerScore,
            state: gameState,
            result,
            lastAction: Date.now()
        };
    }

    return {
        ...game,
        deck: currentDeck,
        playerHand,
        dealerHand,
        playerScore,
        dealerScore: calculateHandValue(dealerHand.filter(c => c.faceUp)),
        state: gameState,
        result,
        lastAction: Date.now()
    };
}

// Calculate value of a hand (handles Ace logic), returns numeric hand value
function calculateHandValue(hand) {
    let total = 0;
    let aces = 0;

    for (let card of hand) {
        if (card.value === 'A') {
            aces++;
            total += 11;
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            total += 10;
        } else {
            total += parseInt(card.value);
        }
    }

    // Adjust aces if over 21
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

// Player hits (returns updated game state)
function playerHit(game) {
    if (game.state !== GAME_STATES.PLAYER_TURN) {
        throw new Error('Cannot hit: Not player\'s turn');
    }

    let currentDeck = [...game.deck];
    let playerHand = [...game.playerHand];

    // Deal a new card
    const { card, remainingDeck } = dealCard(currentDeck);
    playerHand.push({ ...card, faceUp: true });
    currentDeck = remainingDeck;

    // Recalculate score
    const playerScore = calculateHandValue(playerHand);

    // Check for bust
    let gameState = game.state;
    let result = game.result;
    let dealerHand = game.dealerHand;
    let dealerScore = game.dealerScore;

    if (playerScore > 21) {
        // Reveal dealer's hole card on player bust
        dealerHand = game.dealerHand.map(c => ({ ...c, faceUp: true }));
        dealerScore = calculateHandValue(dealerHand);
        gameState = GAME_STATES.GAME_OVER;
        result = GAME_RESULTS.PLAYER_BUST;
    }

    return {
        ...game,
        deck: currentDeck,
        playerHand,
        playerScore,
        dealerHand,
        dealerScore,
        state: gameState,
        result,
        lastAction: Date.now()
    };
}

// Player ends turn, dealer's turn begins (returns updated game state)
function playerStand(game) {
    if (game.state !== GAME_STATES.PLAYER_TURN) {
        throw new Error('Cannot stand: Not player\'s turn');
    }

    // Reveal dealer's hole card
    const dealerHand = game.dealerHand.map(card => ({
        ...card,
        faceUp: true
    }));

    return {
        ...game,
        dealerHand,
        dealerScore: calculateHandValue(dealerHand),
        state: GAME_STATES.DEALER_TURN,
        lastAction: Date.now()
    };
}

// Dealer must hit until 17+ (returns updated game state)
function dealerPlay(game) {
    if (game.state !== GAME_STATES.DEALER_TURN) {
        throw new Error('Cannot play dealer: Not dealer\'s turn');
    }

    let currentDeck = [...game.deck];
    let dealerHand = [...game.dealerHand];
    let dealerScore = calculateHandValue(dealerHand);

    // Dealer hits until 17+ (stands on soft 17)
    while (dealerScore < 17) {
        const { card, remainingDeck } = dealCard(currentDeck);
        dealerHand.push({ ...card, faceUp: true });
        currentDeck = remainingDeck;
        dealerScore = calculateHandValue(dealerHand);
    }

    // Determine winner
    const playerScore = game.playerScore;
    let result;

    if (dealerScore > 21) {
        result = GAME_RESULTS.DEALER_BUST;
    } else if (dealerScore > playerScore) {
        result = GAME_RESULTS.DEALER_WIN;
    } else if (playerScore > dealerScore) {
        result = GAME_RESULTS.PLAYER_WIN;
    } else {
        result = GAME_RESULTS.PUSH;
    }

    return {
        ...game,
        deck: currentDeck,
        dealerHand,
        dealerScore,
        state: GAME_STATES.GAME_OVER,
        result,
        lastAction: Date.now()
    };
}

// Reset game for new round (returns new round game state)
function newRound(game) {
    // Re-shuffle a fresh shoe each round to keep things simple and avoid running out of cards
    const freshDeck = resetDeck(6);

    return {
        ...game,
        deck: freshDeck,
        playerHand: [],
        dealerHand: [],
        playerScore: 0,
        dealerScore: 0,
        state: GAME_STATES.BETTING,
        result: null,
        lastAction: Date.now()
    };
}

module.exports = {
    GAME_STATES,
    GAME_RESULTS,
    createGame,
    startRound,
    playerHit,
    playerStand,
    dealerPlay,
    newRound,
    calculateHandValue
};

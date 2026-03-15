// Game Engine module

const {resetDeck, dealCard} = require(./deck);

// game states
const GAME_STATES = {
    BETTING: 'betting', 
    PLAYER_TURN: 'player_turn', 
    DEALER_TURN: 'dealer_turn', 
    GAME_OVER: 'game_over'
}; 

// Game results
const GAME_RESULTS = {
    PLAYER_WIN: 'player_win',
    DEALER_WIN: 'dealer-win', 
    PUSH: 'push', 
    PLAYER_BUST: 'player_bust', 
    DEALER_BUST: 'dealer_bust', 
    BLACKJACK: 'blackjack'
}; 

// Create new game session (returns initial game state)
function createGame(gameId) {
    // Create fresh deck
    const deck = resetDeck(6);

    // Initial game state
    const game = {
        id: gameId, 
        state: GAME_STATE.BETTING, 
        deck,
        playerHand: [], 
        dealerHand: [], 
        playerScore: 0, 
        dealerScore: 0, 
        result: null,
        createAt: Date.now(), 
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
    let {card, remainingDeck} = dealCard(currentDeck);
    playerHand.push({...card, faceUp: true});
    currentDeck = remainingDeck;

    // Deak first card to dealer
    ({card, remainingDeck} = dealCard(currentDeck));
    dealerHand.push({...card, faceUp: true});
    currentDeck = remainingDeck;

    // Deal second card to player
    ({card, remainingDeck} = dealCard(currentDeck));
    playerHand.push({...card, faceUp: true});
    currentDeck = remainingDeck;

    // Deal second card to dealer (face down)
    ({card, remainingDeck} = dealCard(currentDeck));
    dealerHand.push({...card, faceUp: false});
    currentDeck = remainingDeck;

    // Calculate initial scores
    const playerScore = calculateHandValue(playerHand);
    const dealerScore = calculateHandValue(dealerHand.filter(c => c.faceUp));

    // Check for immediate blackjack
    let gameState = GAME_STATES.PLAYER_TURN;
    let result = null;

    if (playerScore == 21) {
        gameState = GAME_STATES.GAME_OVER;
        result = GAME_RESULTS.BLACKJACK;
    }

    return {
        ...game, 
        deck: currentDeck, 
        playerHand, 
        dealerHand, 
        playerScore,
        dealerScore: calculateHandValue(dealerHand), 
        state:gameState,
        result
    };
}

//Calculate value of a hand (Ace Logic, returns hand value)

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

    // Adjust Aces if over 21
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

// player hits (returns updated game status)

function playerHit(game) {
    if( game.state !== GAME_STATES.PLAYER_TURN) {
        throw new Error('Cannot hit: Not player\'s turn');
    }

    let currentDeck = [...game.deck];
    let playerHand = [...game.playerHand];

    // Deal a new card
    const{card, remainingDeck} = dealCard(currentDeck);
    playerHand.push({...card, faceup:true});
    currentDeck = remainingDeck;

    // Recalculate score
    const playerScore = calculateHandValue(playerHand);

    // check for bust
    let gameState = game.state;
    let result = game.result;

    if (playerScore > 21) {
        gameState = GAME_STATE.GAME_OVER;
        result = GAME_RESULT.PLAYER_BUST;
    }

    result {
        ...game, 
        deck: currentDeck,
        playerHand, 
        playerScore,
        state: gameState,
        result,
        lastAction: Date.now()
    };
}

// Player ends turn, dealer plays (return updated game state)
function playerStand(game) {
    if (game.state !== GAME_STATES.PLAYER.TURN) {
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
        state: GAME_STATES.DEALER_TURN,
        lastAction: Date.now()
    };
}

// Dealer must hit until 17+ (return updated game state)
function dealerPlay(game) {
    if (game.state !== GAME_STATES.DALER_TURN) {    
        throw new Error('Cannot play dealer: Not dealer\'s turn');
    }

    let currentDeck = [...game.deck];
    let dealerHand = [...game.dealerHand];
    let dealerScore = calculateHandValue(dealerHand);

    // Dealer must hit on soft 17 (Ace = 11)
    while (dealerScore < 17) {
        const {card, remainingDeck} = dealerCard(currentDeck);
        dealerHand.push({...card, faceUp:true});
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
    // Keep same game ID but reset everything
    const freshDeck = resetDeck(6);

    return {
        ..game,
        deck: freshDeck, 
        playerhand: [], 
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
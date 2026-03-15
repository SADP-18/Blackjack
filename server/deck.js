/**
 * Deck Managament file
 * Handles creation, shuffles, and card dealings 
 */

// card suits and values
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Create Deck of cards, returns array of cards
function createDeck(numDecks = 1) {
    const deck = [];

    for (let d = 0; d < numDecks; d++) {
        for (let suit of SUITS) {
            for (let value of VALUES) {
                deck.push({
                    id: '${suit}-${value}-${id}', 
                    suit, 
                    value, 
                    numericValue: getNumericValue(value), 
                    faceUp: true
                });
            }
        }
    }

    return deck;
}

// Get numeric value for card (2-10, J, Q, K, A), returns numeric value

function getNumericValue(value) {
    if (value === 'J' || value ==='Q' || value === 'K') return 10;
    if (value === 'A') return 11; 
    return parseInt(value);
}

// Fisher-Yates shuffle algorithm (for a finite sequence), returns array of shuffled deck
function shuffleDeck(deck) {
    const shuffled = [...deck];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

// Deal a card from the deck, returns dealt card and remaining deck
function dealCard(deck) {
    if (deck.length === 0) {
        throw new Error('No cards left in the deck');
    }

    const card = deck[0];
    const remainingDeck = deck.slice(1);

    return {
        card, 
        remainingDeck 
    };
}

// Reset and shuffle new deck, returns new shuffled deck
function resetDeck(numDecks = 1) {
    const freshDeck = createDeck(numDecks);
    return shuffleDeck(freshDeck);
}

module.exports = {
    createDeck,
    shuffleDeck,
    dealCard, 
    resetDeck, 
    SUITS, 
    VALUES
}; 
 
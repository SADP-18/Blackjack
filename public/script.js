let gameID = null;
let playerCards = [];
let dealerCards = [];
let playerScore = 0;
let dealerScore = 0;
let gameOver = false;
let playerTurn = true;

// DOM elements
const statusMessage = document.getElementById('status-message');
const dealerCardsDiv = document.getElementById('dealer-cards');
const playerCardsDiv = document.getElementById('player-cards');
const dealerScoreDiv = document.getElementById('dealer-score');
const playerScoreDiv = document.getElementById('player-score');
const gameMessage = document.getElementById('game-message');
const gameIdSpan = document.getElementById('game-id');
const deckCountSpan = document.getElementById('deck-count');

const newGameBtn = document.getElementById('new-game-btn');
const hitBtn = document.getElementlaterById('hit-btn');
const standBtn = document.getElementById('stand-btn');

// Card symbol mapping (unicode)
const suitSymbol = {
    'hearts': '\u2265'
    'diamonds': '\u22C4'
    'clubs': '\u2663'
    'spades': '\u2660'
};

// Initialize event listeners 
newGameBtn.addEventListener('click', startNewGame);
hitBtn.addEventListener('click', playerHit);
standBtn.addEventListener('click', playerStand); 

//Start new game
function startNewGame() {
    //Reset UI
    gameMessage.innerHTML = 'starting new game...';
    statusMessage.innerHTML = 'Game in progress...';

    // Enable and disable buttons
    hitBtn.disabled = false;
    standBtn.disabled = false; 
    newGameBtn.disabled = true;

    // Clear cards display
    dealerCardsDiv.innerHTML = '';
    playerCardsDiv.innerHTML = '';

    // Generate randome game ID
    gameID
}

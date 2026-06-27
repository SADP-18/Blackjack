// ===== Config =====
const API_BASE = '/api';

// ===== State =====
let gameId = null;
let currentGameState = null;

// ===== DOM refs =====
const dealerLine = document.getElementById('dealer-line');
const dealerCardsDiv = document.getElementById('dealer-cards');
const playerCardsDiv = document.getElementById('player-cards');
const dealerScoreChip = document.getElementById('dealer-score');
const playerScoreChip = document.getElementById('player-score');
const shoeCountSpan = document.getElementById('shoe-count');
const outcomeBanner = document.getElementById('outcome-banner');
const outcomeText = document.getElementById('outcome-text');

const newGameBtn = document.getElementById('new-game-btn');
const dealBtn = document.getElementById('deal-btn');
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const nextHandBtn = document.getElementById('next-hand-btn');

const SUIT_SYMBOL = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660'
};
const RED_SUITS = new Set(['hearts', 'diamonds']);

// ===== Dealer voice lines =====
const DEALER_LINES = {
    idle: ["Pull up a seat whenever you're ready.", 'Table\u2019s open. Take a seat?'],
    readyToDeal: ['Place your seat and I\u2019ll deal you in.', 'Whenever you\u2019re ready \u2014 say the word.'],
    dealt: ['Here we go. Cards are out.', 'Two each. Let\u2019s see what we\u2019ve got.'],
    playerBlackjack: ['Blackjack! Nicely done.', 'Twenty-one right out of the gate \u2014 well played.'],
    pushBlackjack: ['We both made twenty-one. Push.'],
    yourMove: ['Your move \u2014 hit or stand?', 'What\u2019ll it be?'],
    hit: ['One card, coming up.', 'Here you go.'],
    playerBust: ['That\u2019s a bust. House takes this one.', 'Over twenty-one \u2014 tough break.'],
    standing: ['Standing on that, are we? Let\u2019s see what I\u2019ve got.'],
    revealHole: ['Flipping my card.'],
    dealerHits: ['I\u2019ll take a card myself.'],
    dealerBust: ['I\u2019ve gone over. That one\u2019s yours.'],
    dealerWin: ['House wins this round.'],
    playerWin: ['You\u2019ve got it \u2014 nice hand.'],
    push: ['We\u2019re even. Push.'],
    newRoundPrompt: ['Ready when you are. Deal again?']
};

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function sayDealer(key) {
    const options = DEALER_LINES[key];
    if (!options) return;
    const line = pick(options);

    dealerLine.classList.add('swapping');
    setTimeout(() => {
        dealerLine.textContent = line;
        dealerLine.classList.remove('swapping');
    }, 180);
}

// ===== API helpers =====
async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
        throw new Error(data.error || 'Request failed');
    }
    return data;
}

// ===== Rendering =====
function cardRankDisplay(card) {
    return card.value;
}

function buildFaceUpCardHTML(card) {
    const isRed = RED_SUITS.has(card.suit);
    const rank = cardRankDisplay(card);
    const symbol = SUIT_SYMBOL[card.suit] || '';
    return `
        <div class="card-face card-face--front ${isRed ? 'is-red' : ''}">
            <span class="card-rank-top">${rank}<br/>${symbol}</span>
            <span class="card-suit-center">${symbol}</span>
            <span class="card-rank-bottom">${rank}<br/>${symbol}</span>
        </div>
    `;
}

function buildCardBackHTML() {
    return `<div class="card-face card-face--back"></div>`;
}

// Renders a hand. `flipIndices` marks specific card positions that should be
// built as flip structures (used when a previously-hidden hole card is being
// revealed) so the reveal can animate via CSS transform instead of a redraw.
// `startFaceDown` controls whether those flip cards start in the face-down
// orientation (true right before the reveal animation kicks off).
function renderHand(container, hand, { flipIndices = new Set(), startFaceDown = false, revealedValues = {} } = {}) {
    container.innerHTML = '';

    hand.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.style.animationDelay = `${index * 90}ms`;

        const isHidden = card.suit === 'hidden';
        const shouldFlip = flipIndices.has(index);

        if (shouldFlip) {
            const revealedCard = revealedValues[index] || card;
            const orientationClass = startFaceDown ? 'card--face-down' : 'card--face-up';
            cardEl.className = `card card--flippable ${orientationClass}`;
            cardEl.dataset.cardIndex = String(index);
            cardEl.innerHTML = `
                <div class="card-flip-inner">
                    ${buildFaceUpCardHTML(revealedCard)}
                    ${buildCardBackHTML()}
                </div>
            `;
        } else {
            cardEl.className = 'card';
            cardEl.innerHTML = isHidden ? buildCardBackHTML() : buildFaceUpCardHTML(card);
        }

        container.appendChild(cardEl);
    });
}

function bumpChip(chip) {
    chip.classList.remove('score-chip--bump');
    // restart animation
    void chip.offsetWidth;
    chip.classList.add('score-chip--bump');
}

function updateScores(state) {
    if (typeof state.cardsRemaining === 'number') {
        shoeCountSpan.textContent = state.cardsRemaining;
    }

    playerScoreChip.textContent = state.playerScore;
    playerScoreChip.classList.toggle('score-chip--bust', state.playerScore > 21);
    bumpChip(playerScoreChip);

    const dealerHidden = state.dealerHand.some(c => c.suit === 'hidden');
    if (dealerHidden) {
        dealerScoreChip.textContent = state.dealerScore;
        dealerScoreChip.classList.add('score-chip--hidden');
    } else {
        dealerScoreChip.textContent = state.dealerScore;
        dealerScoreChip.classList.remove('score-chip--hidden');
        dealerScoreChip.classList.toggle('score-chip--bust', state.dealerScore > 21);
        bumpChip(dealerScoreChip);
    }
}

function showOutcome(result) {
    const messages = {
        blackjack: { text: 'Blackjack! You win.', cls: 'is-win' },
        player_win: { text: 'You win this hand.', cls: 'is-win' },
        dealer_bust: { text: 'Dealer busts \u2014 you win.', cls: 'is-win' },
        dealer_win: { text: 'Dealer wins this hand.', cls: 'is-lose' },
        player_bust: { text: 'Bust \u2014 dealer wins.', cls: 'is-lose' },
        push: { text: 'Push \u2014 it\u2019s a tie.', cls: 'is-push' }
    };

    const msg = messages[result];
    outcomeBanner.classList.remove('is-win', 'is-lose', 'is-push', 'hidden');
    if (!msg) {
        outcomeBanner.classList.add('hidden');
        return;
    }
    outcomeBanner.classList.add(msg.cls);
    outcomeText.textContent = msg.text;
}

function setButtonVisibility({ showNewGame, showDeal, showHitStand, showNextHand, hitStandEnabled }) {
    newGameBtn.classList.toggle('hidden', !showNewGame);
    dealBtn.classList.toggle('hidden', !showDeal);
    hitBtn.classList.toggle('hidden', !showHitStand);
    standBtn.classList.toggle('hidden', !showHitStand);
    nextHandBtn.classList.toggle('hidden', !showNextHand);

    if (showHitStand) {
        hitBtn.disabled = !hitStandEnabled;
        standBtn.disabled = !hitStandEnabled;
    }
}

function dealerLineForResult(result) {
    switch (result) {
        case 'blackjack': return 'playerBlackjack';
        case 'push': return 'push';
        case 'player_win': return 'playerWin';
        case 'dealer_win': return 'dealerWin';
        case 'dealer_bust': return 'dealerBust';
        case 'player_bust': return 'playerBust';
        default: return null;
    }
}

// Renders the full table from a gameState object returned by the API.
// `reveal` controls whether the dealer's hole card should animate from
// face-down to face-up (used right after stand/dealer-play resolves).
function renderTable(state, { reveal = false } = {}) {
    const previousState = currentGameState;
    currentGameState = state;

    renderHand(playerCardsDiv, state.playerHand);

    if (reveal && previousState) {
        // Find the index that was face-down in the previous render — that's
        // the only card that should animate; any newly-drawn dealer cards
        // (from dealerPlay) were never hidden and render normally.
        const holeIndex = previousState.dealerHand.findIndex(c => c.suit === 'hidden');
        const flipIndices = holeIndex !== -1 ? new Set([holeIndex]) : new Set();
        const revealedValues = holeIndex !== -1 ? { [holeIndex]: state.dealerHand[holeIndex] } : {};

        renderHand(dealerCardsDiv, state.dealerHand, {
            flipIndices,
            startFaceDown: true,
            revealedValues
        });

        const flippableCard = dealerCardsDiv.querySelector('.card--flippable');
        if (flippableCard) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    flippableCard.classList.remove('card--face-down');
                    flippableCard.classList.add('card--face-up');
                }, 260);
            });
        }
    } else {
        const holeIndex = state.dealerHand.findIndex(c => c.suit === 'hidden');
        const flipIndices = holeIndex !== -1 ? new Set([holeIndex]) : new Set();
        renderHand(dealerCardsDiv, state.dealerHand, { flipIndices, startFaceDown: true });
    }

    updateScores(state);

    if (state.state === 'game_over') {
        showOutcome(state.result);
    } else {
        showOutcome(null);
    }
}

// ===== Game flow =====
async function startNewGame() {
    newGameBtn.disabled = true;
    try {
        const data = await apiPost('/game/new');
        gameId = data.gameId;

        setButtonVisibility({ showNewGame: false, showDeal: true, showHitStand: false, showNextHand: false });
        sayDealer('readyToDeal');
        currentGameState = null;
        dealerCardsDiv.innerHTML = '';
        playerCardsDiv.innerHTML = '';
        dealerScoreChip.textContent = '\u2014';
        dealerScoreChip.classList.add('score-chip--hidden');
        playerScoreChip.textContent = '\u2014';
        shoeCountSpan.textContent = '312';
        showOutcome(null);
    } catch (err) {
        console.error(err);
        sayDealer('idle');
    } finally {
        newGameBtn.disabled = false;
    }
}

async function dealRound() {
    dealBtn.disabled = true;
    try {
        const data = await apiPost(`/game/${gameId}/start`);
        renderTable(data.gameState);

        if (data.gameState.state === 'game_over') {
            // Immediate blackjack or push on the deal
            const lineKey = data.gameState.result === 'push' ? 'pushBlackjack' : dealerLineForResult(data.gameState.result);
            setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: false, showNextHand: true });
            setTimeout(() => sayDealer(lineKey || 'push'), 300);
        } else {
            setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: true, showNextHand: false, hitStandEnabled: true });
            sayDealer('dealt');
            setTimeout(() => sayDealer('yourMove'), 1400);
        }
    } catch (err) {
        console.error(err);
    } finally {
        dealBtn.disabled = false;
    }
}

async function playerHit() {
    setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: true, showNextHand: false, hitStandEnabled: false });
    sayDealer('hit');
    try {
        const data = await apiPost(`/game/${gameId}/action`, { action: 'hit' });

        if (data.gameState.playerScore > 21) {
            renderTable(data.gameState, { reveal: true });
            setTimeout(() => sayDealer('playerBust'), 500);
            setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: false, showNextHand: true });
        } else {
            renderTable(data.gameState);
            setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: true, showNextHand: false, hitStandEnabled: true });
        }
    } catch (err) {
        console.error(err);
        setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: true, showNextHand: false, hitStandEnabled: true });
    }
}

async function playerStand() {
    setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: true, showNextHand: false, hitStandEnabled: false });
    sayDealer('standing');

    try {
        const data = await apiPost(`/game/${gameId}/action`, { action: 'stand' });

        // Reveal the hole card with a beat, then show the final state/result
        setTimeout(() => {
            renderTable(data.gameState, { reveal: true });
            sayDealer('revealHole');

            setTimeout(() => {
                const lineKey = dealerLineForResult(data.gameState.result);
                if (lineKey) sayDealer(lineKey);
                setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: false, showNextHand: true });
            }, 900);
        }, 500);
    } catch (err) {
        console.error(err);
        setButtonVisibility({ showNewGame: false, showDeal: false, showHitStand: true, showNextHand: false, hitStandEnabled: true });
    }
}

async function nextHand() {
    nextHandBtn.disabled = true;
    try {
        const data = await apiPost(`/game/${gameId}/action`, { action: 'new-round' });
        // newRound resets to betting state with empty hands
        currentGameState = null;
        dealerCardsDiv.innerHTML = '';
        playerCardsDiv.innerHTML = '';
        dealerScoreChip.textContent = '\u2014';
        dealerScoreChip.classList.add('score-chip--hidden');
        playerScoreChip.textContent = '\u2014';
        showOutcome(null);

        setButtonVisibility({ showNewGame: false, showDeal: true, showHitStand: false, showNextHand: false });
        sayDealer('newRoundPrompt');
    } catch (err) {
        console.error(err);
    } finally {
        nextHandBtn.disabled = false;
    }
}

// ===== Event listeners =====
newGameBtn.addEventListener('click', startNewGame);
dealBtn.addEventListener('click', dealRound);
hitBtn.addEventListener('click', playerHit);
standBtn.addEventListener('click', playerStand);
nextHandBtn.addEventListener('click', nextHand);

// ===== Initial state =====
sayDealer('idle');

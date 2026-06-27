// In-memory game storage
// Games expire after a period of inactivity to avoid unbounded memory growth

const games = new Map();
const GAME_TTL_MS = 30 * 60 * 1000; // 30 minutes

function saveGame(game) {
    games.set(game.id, game);
}

function getGame(gameId) {
    const game = games.get(gameId);
    if (!game) return null;

    if (Date.now() - game.lastAction > GAME_TTL_MS) {
        games.delete(gameId);
        return null;
    }

    return game;
}

function deleteGame(gameId) {
    games.delete(gameId);
}

// Periodically clear out stale games
setInterval(() => {
    const now = Date.now();
    for (const [id, game] of games.entries()) {
        if (now - game.lastAction > GAME_TTL_MS) {
            games.delete(id);
        }
    }
}, 5 * 60 * 1000).unref();

module.exports = {
    saveGame,
    getGame,
    deleteGame
};

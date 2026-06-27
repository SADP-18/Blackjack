// Input validation helpers

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ACTIONS = ['hit', 'stand', 'new-round'];

function isValidGameId(gameId) {
    return typeof gameId === 'string' && UUID_REGEX.test(gameId);
}

function isValidAction(action) {
    return typeof action === 'string' && VALID_ACTIONS.includes(action);
}

// Basic string sanitization (defense in depth for any echoed input)
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>"'`]/g, '').trim().slice(0, 200);
}

module.exports = {
    isValidGameId,
    isValidAction,
    sanitizeInput
};

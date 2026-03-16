// ─────────────────────────────────────────────────────────────
//  Game Service — talks to API Gateway → Lambda → DynamoDB
//  Swap API_BASE_URL when reusing in another project
// ─────────────────────────────────────────────────────────────

const API_BASE_URL = 'https://5w6hj0fwrh.execute-api.us-east-1.amazonaws.com/prod';

// ── Save a completed tournament ───────────────────────────────
export const saveGame = async ({ userId, username, entryFee, placement, roundScores, winnings }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username, entryFee, placement, roundScores, winnings }),
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Failed to save game:', err);
    return null;
  }
};

// ── Fetch all games for a user ────────────────────────────────
export const getGames = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/get-games?userId=${userId}`);
    const data = await response.json();
    return data.games || [];
  } catch (err) {
    console.error('Failed to fetch games:', err);
    return [];
  }
};

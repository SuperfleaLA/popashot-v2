// ─────────────────────────────────────────────────────────────
//  WebSocket Service — connects to AWS API Gateway WebSocket
//  Manages real-time lobby state for Hoops Eliminator
//  Built as a singleton that survives React StrictMode remounts
// ─────────────────────────────────────────────────────────────

const WS_URL = 'wss://90eqnperjl.execute-api.us-east-2.amazonaws.com/production';

class LobbyService {
  constructor() {
    this.ws = null;
    this.onMessageCallback = null;
    this.connecting = false;
    this.intentionalDisconnect = false;
  }

  // ── Connect to WebSocket ────────────────────────────────
  connect(onMessage) {
    this.onMessageCallback = onMessage;
    this.intentionalDisconnect = false;

    // Already connected — just update the message handler
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    // Already connecting — wait for it
    if (this.connecting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    this.connecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.connecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (this.onMessageCallback) this.onMessageCallback(data);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          this.connecting = false;
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.connecting = false;
          this.ws = null;
        };
      } catch (err) {
        this.connecting = false;
        reject(err);
      }
    });
  }

  // ── Send a message ──────────────────────────────────────
  send(action, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ action, ...data });
      console.log('Sending WebSocket message:', message);
      this.ws.send(message);
    } else {
      console.warn('WebSocket not connected — message dropped:', action);
    }
  }

  // ── Join a lobby ────────────────────────────────────────
  joinLobby({ userId, username, entryFee }) {
    this.send('joinLobby', { userId, username, entryFee });
  }

  // ── Leave a lobby ───────────────────────────────────────
  leaveLobby({ entryFee }) {
    this.send('leaveLobby', { entryFee });
  }

  // ── Signal ready to play (after exiting practice) ───────
  readyToPlay({ lobbyId }) {
    this.send('readyToPlay', { lobbyId });
  }

  // ── Submit score for current round ──────────────────────
  submitScore({ lobbyId, roundNumber, score, userId }) {
    this.send('submitScore', { lobbyId, roundNumber, score, userId });
  }

  // ── Request results after timeout ───────────────────────
  requestResults({ lobbyId, roundNumber }) {
    this.send('requestResults', { lobbyId, roundNumber });
  }

  // ── Disconnect — only call when truly leaving the lobby ──
  disconnect() {
    this.intentionalDisconnect = true;
    this.onMessageCallback = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ── Check if connected ──────────────────────────────────
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export a singleton — persists across React remounts
export const lobbyService = new LobbyService();

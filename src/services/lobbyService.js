// ─────────────────────────────────────────────────────────────
//  WebSocket Service — connects to AWS API Gateway WebSocket
//  Manages real-time lobby state for Hoops Eliminator
// ─────────────────────────────────────────────────────────────

const WS_URL = 'wss://90eqnperjl.execute-api.us-east-2.amazonaws.com/production';

class LobbyService {
  constructor() {
    this.ws = null;
    this.handlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnects = 3;
  }

  // ── Connect to WebSocket ────────────────────────────────
  connect(onMessage) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
        };
      } catch (err) {
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

  // ── Disconnect ──────────────────────────────────────────
  disconnect() {
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

// Export a singleton instance
export const lobbyService = new LobbyService();

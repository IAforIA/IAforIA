import { WebSocket } from 'ws';

// Map of userId => WebSocket
export const wsClients = new Map<string, WebSocket>();

export function getOnlineUsers(): string[] {
  return Array.from(wsClients.keys());
}

export function broadcast(message: any, excludeId?: string) {
  const data = JSON.stringify(message);
  wsClients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

export default {
  wsClients,
  getOnlineUsers,
  broadcast,
};

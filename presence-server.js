/* eslint-disable @typescript-eslint/no-require-imports */
const WebSocket = require('ws');
const url = require('url');

const wss = new WebSocket.Server({ port: 8080 });
const presenceMap = new Map();

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const userId = query.userId;

  if (!userId) {
    ws.close(4000, 'Missing userId');
    return;
  }

  // Gán userId cho WebSocket client để debug
  ws._userId = userId;
  console.log(`[WS] Client connected: ${userId}`);

  // Đặt trạng thái online ngay khi kết nối
  presenceMap.set(userId, { presence: 'online', statusMsg: 'online' });
  broadcastPresence(userId, { presence: 'online', statusMsg: 'online' });

  // Gửi trạng thái presence của tất cả người dùng hiện tại cho client mới
  presenceMap.forEach((presenceData, existingUserId) => {
    if (existingUserId !== userId) {
      ws.send(JSON.stringify({ userId: existingUserId, ...presenceData }));
    }
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // ✅ Xử lý sự kiện read room
      if (data.type === 'read' && data.roomId) {
        const payload = {
          type: 'read',
          userId,
          roomId: data.roomId,
        };
        const broadcast = JSON.stringify(payload);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
        console.log(`[WS] Broadcast read: ${userId} read room ${data.roomId}`);
        return;
      }

      const { presence, statusMsg } = data;
      if (['online', 'offline', 'unavailable'].includes(presence)) {
        presenceMap.set(userId, { presence, statusMsg });
        broadcastPresence(userId, { presence, statusMsg });
        console.log(`[WS] Updated presence for ${userId}: ${presence}, ${statusMsg}`);
      }
    } catch (error) {
      console.error(`[WS] Error parsing message from ${userId}:`, error);
    }
  });

  ws.on('close', () => {
    presenceMap.set(userId, { presence: 'offline', statusMsg: '' });
    broadcastPresence(userId, { presence: 'offline', statusMsg: '' });
    console.log(`[WS] Client disconnected: ${userId}`);
  });

  ws.on('error', (error) => {
    console.error(`[WS] Error for ${userId}:`, error);
  });
});

function broadcastPresence(userId, presenceData) {
  const message = JSON.stringify({ userId, ...presenceData });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      console.log(`[WS] Broadcasting presence to client: ${client._userId || 'unknown'} - ${message}`);
      client.send(message);
    }
  });
}

console.log('WebSocket server running on ws://localhost:8080');

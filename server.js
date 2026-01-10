const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// Render / Fly.io 生存確認
app.get('/', (req, res) => {
  res.send('MacTok Engine is running');
});

io.on('connection', (socket) => {
  console.log('Client connected');
  let tiktokConnection = null;

  socket.on('start', async (targetId) => {
    try {
      // 多重接続防止
      if (tiktokConnection) {
        await tiktokConnection.disconnect();
        tiktokConnection = null;
      }

      tiktokConnection = new WebcastPushConnection(targetId);
      await tiktokConnection.connect();

      socket.emit('status', 'TikTokに接続しました。');

      tiktokConnection.on('chat', data => {
        socket.emit('chat', {
          user: data.nickname || data.uniqueId || '名無しさん',
          text: data.comment
        });
      });

      tiktokConnection.on('gift', data => {
        socket.emit('gift', {
          user: data.nickname || data.uniqueId || '名無しさん',
          gift: data.giftName,
          count: data.repeatCount || 1
        });
      });

    } catch (err) {
      socket.emit('status', '接続エラー: ' + err.message);
    }
  });

  socket.on('disconnect', async () => {
    if (tiktokConnection) {
      await tiktokConnection.disconnect();
      tiktokConnection = null;
    }
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

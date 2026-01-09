const express = require("express");
const { WebcastPushConnection } = require("tiktok-live-connector");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } }); // 全ての接続を許可

const PORT = process.env.PORT || 3000;

io.on("connection", (socket) => {
  console.log("Browser connected");

  socket.on("start", async (username) => {
    try {
      const tiktok = new WebcastPushConnection(username);
      await tiktok.connect();
      socket.emit("status", "connected");

      // チャットをブラウザへ転送
      tiktok.on("chat", data => {
        socket.emit("chat", { user: data.nickname, text: data.comment });
      });

      // ギフトをブラウザへ転送
      tiktok.on("gift", data => {
        socket.emit("gift", { user: data.nickname, gift: data.giftName });
      });

      // 入室をブラウザへ転送
      tiktok.on("member", data => {
        socket.emit("join", { user: data.nickname });
      });

    } catch (err) {
      socket.emit("status", "error");
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

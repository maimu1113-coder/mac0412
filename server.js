const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ★ これが無いと画面は絶対に出ない
app.use(express.static("public"));

io.on("connection", socket => {
  socket.on("start", async targetId => {
    const tiktok = new WebcastPushConnection(targetId);

    try {
      await tiktok.connect();
      socket.emit("chat", {
        user: "SYSTEM",
        text: "接続しました"
      });
    } catch (e) {
      socket.emit("chat", {
        user: "SYSTEM",
        text: "接続失敗"
      });
      return;
    }

    tiktok.on("chat", data => {
      socket.emit("chat", {
        user: data.nickname || data.uniqueId,
        text: data.comment
      });
    });

    socket.on("disconnect", () => {
      tiktok.disconnect();
    });
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("Server running");
});

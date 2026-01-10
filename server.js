const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);

// iPhone + Render 用 CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// public/index.html を配信
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("socket connected");

  let tiktokConnection = null;

  socket.on("start", async (tiktokId) => {
    console.log("START TikTok ID:", tiktokId);

    // 既に接続してたら切断
    if (tiktokConnection) {
      tiktokConnection.disconnect();
      tiktokConnection = null;
    }

    // TikTokに接続
    tiktokConnection = new WebcastPushConnection(tiktokId);

    try {
      const state = await tiktokConnection.connect();
      console.log("TikTok connected:", state.roomId);

      socket.emit("chat", {
        user: "SYSTEM",
        text: "TikTokライブに接続しました"
      });

    } catch (err) {
      console.error("TikTok connect error", err);
      socket.emit("chat", {
        user: "SYSTEM",
        text: "TikTok接続に失敗しました"
      });
      return;
    }

    // コメント受信
    tiktokConnection.on("chat", (data) => {
      socket.emit("chat", {
        user: data.nickname || data.uniqueId,
        text: data.comment
      });
    });

    // 切断時
    socket.on("disconnect", () => {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
      }
    });
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("Server running on", PORT);
});

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// public フォルダを使う
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("🟢 socket connected");

  let tiktokConnection = null;

  socket.on("start", async (targetId) => {
    console.log("▶ TikTok ID:", targetId);

    if (tiktokConnection) {
      tiktokConnection.disconnect();
    }

    tiktokConnection = new WebcastPushConnection(targetId);

    try {
      await tiktokConnection.connect();
      socket.emit("status", "connected");
      console.log("✅ TikTok connected");
    } catch (err) {
      console.log("❌ TikTok connect error", err);
      socket.emit("status", "error");
      return;
    }

    // コメント
    tiktokConnection.on("chat", (data) => {
      socket.emit("chat", {
        user: data.nickname || data.uniqueId,
        text: data.comment
      });
    });

    // ギフト
    tiktokConnection.on("gift", (data) => {
      socket.emit("gift", {
        user: data.nickname || data.uniqueId,
        giftName: data.giftName,
        count: data.repeatCount || 1,
        diamond: data.diamondCount || 0
      });
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 socket disconnected");
    if (tiktokConnection) {
      tiktokConnection.disconnect();
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});

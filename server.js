const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connect");
const axios = require("axios");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // 接続許可を広げて安定させます
});
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- プロフィール取得API ---
app.get("/api/tiktok/:id", async (req, res) => {
  try {
    const response = await axios.get(`https://www.tikwm.com/api/user/info?unique_id=${req.params.id}`);
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.status(404).json({ error: "ユーザーが見つかりません" });
    }
  } catch (error) {
    res.status(500).json({ error: "データ取得失敗" });
  }
});

// --- ライブコメント接続 ---
io.on("connection", (socket) => {
  let tiktokLive;

  socket.on("connect-live", (tiktokId) => {
    if (tiktokLive) {
      tiktokLive.disconnect();
    }
    
    tiktokLive = new WebcastPushConnection(tiktokId);

    tiktokLive.connect().then(state => {
      socket.emit("live-status", "🟢 LIVE接続中...");
    }).catch(err => {
      console.error(err);
      socket.emit("live-status", "❌ ライブがオフラインです");
    });

    tiktokLive.on("chat", (data) => {
      socket.emit("new-comment", { user: data.uniqueId, text: data.comment });
    });

    // エラー発生時の通知
    tiktokLive.on("error", (err) => {
      socket.emit("live-status", "❌ 通信エラー発生");
    });
  });

  socket.on("disconnect", () => {
    if (tiktokLive) tiktokLive.disconnect();
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

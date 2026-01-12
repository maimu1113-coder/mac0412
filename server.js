const express = require("express");
const path = require("path");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const PORT = process.env.PORT || 3000;

// JSON受信を有効化
app.use(express.json());

// index.html をそのまま配信する
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// TikTok接続用
let tiktokConnection = null;

/**
 * TikTok LIVE 接続API
 * POST /connect
 * body: { username: "tiktok_id" }
 */
app.post("/connect", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    // 既存接続があれば切断
    if (tiktokConnection) {
      tiktokConnection.disconnect();
      tiktokConnection = null;
    }

    // TikTok LIVE 接続
    tiktokConnection = new WebcastPushConnection(username);

    await tiktokConnection.connect();

    console.log("✅ TikTok LIVE connected:", username);

    // コメント受信
    tiktokConnection.on("chat", data => {
      console.log("💬 CHAT:", data.nickname, data.comment);
    });

    // ギフト受信
    tiktokConnection.on("gift", data => {
      console.log("🎁 GIFT:", data.nickname, data.giftName);
    });

    res.json({ status: "connected" });

  } catch (err) {
    console.error("❌ Connection error:", err);
    res.status(500).json({ error: "connection failed" });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

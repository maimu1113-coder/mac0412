// ==============================
// mactok-engine server.js
// ==============================

const express = require("express");
const app = express();

// Renderが自動で割り当てるPORTを使う
const PORT = process.env.PORT || 3000;

// JSONを扱えるようにする
app.use(express.json());

// ------------------------------
// ルート確認（ブラウザ用）
// ------------------------------
app.get("/", (req, res) => {
  res.send("mactok-engine is running 🚀");
});

// ------------------------------
// 接続テスト用（最重要）
// ------------------------------
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "mactok-engine",
    time: new Date().toISOString()
  });
});

// ------------------------------
// TikTok連携用ダミーAPI（今はテスト）
// ------------------------------
app.get("/tiktok/test", (req, res) => {
  res.json({
    message: "TikTok connection test success",
    live: false
  });
});

// ------------------------------
// 404対策（Not Found防止）
// ------------------------------
app.use((req, res) => {
  res.status(404).send("Not Found");
});

// ------------------------------
// サーバー起動
// ------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

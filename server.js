// ==============================
// server.js（Render用 完成版）
// ==============================

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// JSONを扱えるようにする
app.use(express.json());

// ------------------------------
// トップページ（index.html）
// ------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ------------------------------
// サーバー起動状態チェック
// ------------------------------
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    platform: "Render",
    server: "Node.js",
    time: new Date().toISOString()
  });
});

// ------------------------------
// 404対策
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

// ==============================
// server.js（修正版）
// ==============================

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// JSONを扱えるようにする
app.use(express.json());

// 【重要】カレントディレクトリのファイルを静的ファイルとして公開する設定
// これにより CSSやJSを分離しても読み込めるようになります
app.use(express.static(__dirname));

// ------------------------------
// トップページ（index.html）
// ------------------------------
app.get("/", (req, res) => {
  // パスを確実に結合する
  res.sendFile(path.resolve(__dirname, "index.html"));
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

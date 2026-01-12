const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000; // Renderのデフォルトポートに対応

app.use(express.json());

// publicフォルダ内の静的ファイル（CSSや画像など）を自動で読み込めるようにする
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------
// トップページ（public/index.html を表示）
// ------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ------------------------------
// サーバー起動状態チェック
// ------------------------------
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    platform: "Render",
    time: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).send("Not Found");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

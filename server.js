const express = require("express");
const path = require("path");

const app = express();
// Renderのポート(10000)またはローカルの3000を使用
const PORT = process.env.PORT || 10000;

app.use(express.json());

// publicフォルダ内の静的ファイル(index.html等)を自動公開
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------
// トップページ
// ------------------------------
app.get("/", (req, res) => {
  // 確実にpublic/index.htmlを返す
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

// 404対策
app.use((req, res) => {
  res.status(404).send("Not Found");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 10000; // Renderのデフォルト10000に合わせる

app.use(express.json());

// ファイルの存在場所をログに出力してデバッグする
const indexPath = path.resolve(__dirname, "index.html");
console.log("Checking index.html at:", indexPath);

// 静的ファイルの提供設定
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("File sending error:", err);
      res.status(500).send("index.html が見つかりません。ファイル構成を確認してください。");
    }
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

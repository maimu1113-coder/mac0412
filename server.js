const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// 静的ファイル（index.htmlと同じ階層）
app.use(express.static(__dirname));

// トップページ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 生存確認
app.get("/health", (req, res) => {
  res.send("OK");
});

app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
});

const express = require("express");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- TikTokデータ取得API ---
app.get("/api/tiktok/:id", async (req, res) => {
  const tiktokId = req.params.id;
  try {
    // 外部APIへリクエスト
    const response = await axios.get(`https://www.tikwm.com/api/user/info?unique_id=${tiktokId}`);
    
    if (response.data && response.data.data) {
      // 成功したらデータを返す
      res.json(response.data.data);
    } else {
      res.status(404).json({ error: "ユーザーが見つかりませんでした" });
    }
  } catch (error) {
    res.status(500).json({ error: "TikTokデータの取得に失敗しました" });
  }
});

// --- トップページ ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- ヘルスチェック ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", platform: "Render", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

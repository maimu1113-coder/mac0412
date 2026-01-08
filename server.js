const express = require("express");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(".")); // index.html を配信

let tiktokConnection = null;

/**
 * 接続開始 API
 * POST /connect
 * body: { username: "tiktok_id" }
 */
app.post("/connect", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    if (tiktokConnection) {
      tiktokConnection.disconnect();
    }

    tiktokConnection = new WebcastPushConnection(username);

    await tiktokConnection.connect();

    console.log("Connected to TikTok LIVE:", username);

    tiktokConnection.on("chat", data => {
      console.log("CHAT:", data.nickname, data.comment);
    });

    tiktokConnection.on("gift", data => {
      console.log("GIFT:", data.nickname, data.giftName);
    });

    res.json({ status: "connected" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "connection failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

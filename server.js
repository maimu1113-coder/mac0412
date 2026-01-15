const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  let tiktokConn = null;

  socket.on("setTarget", async (targetId) => {
    if (tiktokConn) {
      try { await tiktokConn.disconnect(); } catch(e){}
    }

    // 接続成功率を上げるための追加設定
    tiktokConn = new WebcastPushConnection(targetId, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 2000,
      clientParams: {
        "device_platform": "web",
        "aid": 1988
      }
    });

    try {
      await tiktokConn.connect();
      io.emit("ev", { t: "sys", m: "✅ TikTok接続成功！コメントを待機しています..." });
    } catch (e) {
      console.error(e);
      io.emit("ev", { t: "sys", m: "❌ 接続失敗：IDが配信中か確認してください" });
    }

    tiktokConn.on("chat", d => io.emit("ev", { t: "chat", u: d.nickname, m: d.comment }));
    tiktokConn.on("gift", d => io.emit("ev", { t: "gift", u: d.nickname, g: d.giftName, c: d.repeatCount || 1 }));
    tiktokConn.on("social", d => {
        if (d.displayType && d.displayType.includes("follow")) io.emit("ev", { t: "follow", u: d.nickname });
    });
    tiktokConn.on("roomUser", d => io.emit("up-v", d.viewerCount));
    tiktokConn.on("disconnected", () => io.emit("ev", { t: "sys", m: "⚠️ TikTokとの接続が切れました" }));
  });

  socket.on("disconnect", () => { if (tiktokConn) tiktokConn.disconnect(); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

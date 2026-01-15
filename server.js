const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", socket => {
  let tiktokConn = null;

  socket.on("setTarget", async (targetId) => {
    if (tiktokConn) { try { await tiktokConn.disconnect(); } catch(e){} }

    tiktokConn = new WebcastPushConnection(targetId, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 2000
    });

    try {
      await tiktokConn.connect();
      io.emit("ev", { t: "sys", m: "✅ TikTok接続成功！" });
    } catch (e) {
      io.emit("ev", { t: "sys", m: "❌ 接続失敗：IDまたは配信中か確認" });
      return;
    }

    tiktokConn.on("chat", d => {
      // 無料コマンド機能: !dice
      if (d.comment === "!dice") {
        const res = Math.floor(Math.random() * 6) + 1;
        io.emit("ev", { t: "chat", u: "システム", m: `サイコロの結果は【${res}】です！` });
      } else {
        io.emit("ev", { t: "chat", u: d.nickname, m: d.comment });
      }
    });

    tiktokConn.on("gift", d => {
      io.emit("ev", { t: "gift", u: d.nickname, g: d.giftName, c: d.repeatCount || 1 });
    });

    tiktokConn.on("social", d => {
      if (d.displayType.includes("follow")) io.emit("ev", { t: "follow", u: d.nickname });
    });

    tiktokConn.on("roomUser", d => io.emit("up-v", d.viewerCount));
    
    tiktokConn.on("disconnected", () => {
      io.emit("ev", { t: "sys", m: "⚠️ TikTokとの接続が切れました" });
    });
  });

  socket.on("disconnect", () => {
    if (tiktokConn) tiktokConn.disconnect();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Mac Talk PRO Live on port ${PORT}`));

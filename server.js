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
      try { await tiktokConn.disconnect(); } catch (e) {}
    }

    tiktokConn = new WebcastPushConnection(targetId, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 2000,
      clientParams: { device_platform: "web", aid: 1988 }
    });

    try {
      await tiktokConn.connect();

      const info = tiktokConn.roomInfo;

      // 🔥 配信者プロフィール（LIVE情報）送信
      io.emit("ev", {
        t: "profile",
        nickname: info.owner.nickname,
        uid: info.owner.uniqueId,
        avatar: info.owner.profilePicture.urls[0],
        followers: info.stats.followers,
        likes: info.stats.totalLikes
      });

      io.emit("ev", { t: "sys", m: "✅ TikTok接続成功！" });

    } catch (e) {
      io.emit("ev", { t: "sys", m: "❌ 接続失敗（配信中か確認）" });
      return;
    }

    tiktokConn.on("chat", d =>
      io.emit("ev", { t: "chat", u: d.nickname, m: d.comment })
    );

    tiktokConn.on("gift", d =>
      io.emit("ev", {
        t: "gift",
        u: d.nickname,
        g: d.giftName,
        c: d.repeatCount || 1
      })
    );

    tiktokConn.on("social", d => {
      if (d.displayType && d.displayType.includes("follow")) {
        io.emit("ev", { t: "follow", u: d.nickname });
      }
    });

    tiktokConn.on("roomUser", d =>
      io.emit("up-v", d.viewerCount)
    );
  });

  socket.on("disconnect", () => {
    if (tiktokConn) tiktokConn.disconnect();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("🚀 Server Ready"));

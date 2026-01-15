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
      processInitialData: true,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 2000
    });

    try {
      const state = await tiktokConn.connect();

      io.emit("ev", { t: "sys", m: "✅ TikTok接続成功！" });

      // 🔴 配信者情報送信
      io.emit("streamer", {
        nickname: state.roomInfo.owner.nickname,
        uniqueId: state.roomInfo.owner.uniqueId,
        avatar: state.roomInfo.owner.avatarThumb?.url_list?.[0] || "",
        followers: state.roomInfo.owner.followers || 0,
        likes: state.roomInfo.likeCount || 0
      });

    } catch (e) {
      io.emit("ev", { t: "sys", m: "❌ 接続失敗（配信中か確認）" });
      return;
    }

    tiktokConn.on("chat", d => {
      io.emit("ev", { t: "chat", u: d.nickname, m: d.comment });
    });

    tiktokConn.on("follow", d => {
      io.emit("ev", { t: "follow", u: d.nickname });
      if (d.followInfo?.followerCount) {
        io.emit("up-follow", d.followInfo.followerCount);
      }
    });

    tiktokConn.on("roomUser", d => {
      io.emit("up-like", d.totalLikeCount);
    });
  });

  socket.on("disconnect", () => {
    if (tiktokConn) tiktokConn.disconnect();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("🚀 Server Ready"));

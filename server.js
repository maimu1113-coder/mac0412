const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", socket => {
  let conn = null;

  async function connectTikTok(id){
    if(conn){
      try{ conn.disconnect(); }catch(e){}
    }

    conn = new WebcastPushConnection(id, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 2000
    });

    try {
      await conn.connect();
      io.emit("ev", { t:"sys", m:"✅ TikTok接続成功" });
    } catch(e) {
      io.emit("ev", { t:"sys", m:"❌ 接続失敗（配信中かID確認）" });
      return;
    }

    conn.on("chat", d => {
      io.emit("ev", { t:"chat", u:d.nickname, m:d.comment });
    });

    conn.on("gift", d => {
      io.emit("ev", {
        t:"gift",
        u:d.nickname,
        g:d.giftName,
        c:d.repeatCount || 1
      });
    });

    conn.on("social", d => {
      if(d.displayType.includes("follow")){
        io.emit("ev", { t:"follow", u:d.nickname });
      }
    });

    conn.on("roomUser", d => {
      io.emit("view", d.viewerCount);
    });

    conn.on("disconnected", () => {
      io.emit("ev", { t:"sys", m:"⚠️ 切断されました。再接続待機中…" });
    });
  }

  socket.on("setTarget", id => connectTikTok(id));

  socket.on("disconnect", () => {
    if(conn){
      try{ conn.disconnect(); }catch(e){}
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Mac Talk PRO 起動完了");
});

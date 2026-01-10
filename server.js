const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// publicフォルダのファイルを公開
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("🟢 Browser Connected");
  let tiktok = null;

  socket.on("start", async (targetId) => {
    if (tiktok) tiktok.disconnect();
    
    // TikTok IDに接続 (@抜き)
    tiktok = new WebcastPushConnection(targetId);

    try {
      await tiktok.connect();
      socket.emit("status", "接続完了！");
      console.log(`✅ Connected to: ${targetId}`);
    } catch (err) {
      socket.emit("status", "接続エラー");
      console.error(err);
    }

    // チャット受信
    tiktok.on("chat", data => {
      socket.emit("chat", { 
        text: data.comment // 名前は送るが必要ないのでtextのみ利用
      });
    });

    // ギフト受信
    tiktok.on("gift", data => {
      // ギフトが来たら「ギフトイベント」を送信
      socket.emit("gift_event");
    });
  });

  socket.on("disconnect", () => {
    if (tiktok) tiktok.disconnect();
    console.log("🔴 Browser Disconnected");
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Mac Talk PRO running on port ${PORT}`));

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;
app.use(express.static(path.join(__dirname, "public")));

let tiktokConnection = null;

io.on("connection", (socket) => {
    console.log("🟢 iPhone Connected");

    socket.on("setTargetUser", (uniqueId) => {
        if (tiktokConnection) tiktokConnection.disconnect();

        tiktokConnection = new WebcastPushConnection(uniqueId, {
            processInitialData: false,
            enableExtendedGiftInfo: true,
            requestPollingIntervalMs: 2000,
            clientParams: { "app_language": "ja-JP", "device_platform": "web" }
        });

        tiktokConnection.connect().then(state => {
            console.log("✅ TikTok Connected");
            // データが一部欠けていてもエラーにせず、安全に送信する修正
            const nickname = state?.roomInfo?.owner?.nickname || uniqueId;
            const avatar = state?.roomInfo?.owner?.avatar_thumb?.url_list?.[0] || "";
            
            io.emit("roomInfo", { nickname, avatar });
        }).catch(err => {
            console.error("❌ Connect Error:", err.message);
            socket.emit("chat", { nickname: "System", comment: "接続失敗: ライブ状態を確認してください" });
        });

        tiktokConnection.on('chat', data => {
            io.emit("chat", { nickname: data.nickname, comment: data.comment });
        });

        tiktokConnection.on('gift', data => {
            io.emit("gift", { nickname: data.nickname, giftName: data.giftName, repeatCount: data.repeatCount });
        });
    });
});

server.listen(PORT, () => console.log(`✅ Mac Talk Server Live`));

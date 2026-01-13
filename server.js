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
        
        // 成功率を極限まで高める接続オプション
        tiktokConnection = new WebcastPushConnection(uniqueId, {
            processInitialData: false,
            enableExtendedGiftInfo: true,
            requestPollingIntervalMs: 2000
        });

        tiktokConnection.connect().then(state => {
            io.emit("roomInfo", {
                nickname: state.roomInfo.owner.nickname,
                avatar: state.roomInfo.owner.avatar_thumb.url_list[0]
            });
        }).catch(err => {
            console.error("TikTok Connect Error", err);
            socket.emit("chat", { nickname: "System", comment: "TikTok接続失敗。ライブ中か確認してください。" });
        });

        // 切断検知の可視化
        tiktokConnection.on('disconnected', () => {
            io.emit("chat", { nickname: "System", comment: "⚠️ TikTokとの接続が切れました。再接続してください。" });
        });

        tiktokConnection.on('chat', data => {
            io.emit("chat", { nickname: data.nickname, comment: data.comment });
        });

        tiktokConnection.on('gift', data => {
            io.emit("gift", { nickname: data.nickname, giftName: data.giftName, repeatCount: data.repeatCount });
        });
    });
});

server.listen(PORT, () => console.log(`✅ Server Live`));

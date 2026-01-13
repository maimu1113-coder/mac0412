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
const CHAT_LIMIT_MS = 2000; // 同一ユーザー連投制限（2秒）
const userChatMap = new Map();

io.on("connection", (socket) => {
    socket.on("setTargetUser", (uniqueId) => {
        if (tiktokConnection) tiktokConnection.disconnect();
        tiktokConnection = new WebcastPushConnection(uniqueId);

        tiktokConnection.connect().then(state => {
            socket.emit("roomInfo", {
                nickname: state.roomInfo.owner.nickname,
                avatar: state.roomInfo.owner.avatar_thumb.url_list[0]
            });
        }).catch(err => console.error("Connect Error", err));

        // 【チャット & コマンド】
        tiktokConnection.on('chat', data => {
            const now = Date.now();
            const lastTime = userChatMap.get(data.userId) || 0;
            if (now - lastTime < CHAT_LIMIT_MS) return; // 連投防止
            userChatMap.set(data.userId, now);

            // サーバー側でコマンド判定
            let isCommand = false;
            if (data.comment.startsWith("!")) isCommand = true;

            io.emit("chat", {
                nickname: data.nickname,
                comment: data.comment,
                isCommand: isCommand
            });
        });

        // 【ギフト検知】
        tiktokConnection.on('gift', data => {
            // ギフトが飛んだら特別な信号を送る
            io.emit("gift", {
                nickname: data.nickname,
                giftName: data.giftName,
                repeatCount: data.repeatCount,
                giftIcon: data.giftPictureUrl
            });
        });
    });
});

server.listen(PORT, () => console.log(`✅ ULTIMATE Server Live`));

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connect");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    let tiktokLive;

    socket.on("connect-live", (tiktokId) => {
        if (tiktokLive) tiktokLive.disconnect();

        // 【最強ポイント】本物の最新iPhoneからアクセスしているように偽装
        tiktokLive = new WebcastPushConnection(tiktokId, {
            processInitialData: false,
            fetchOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                    'Referer': 'https://www.tiktok.com/',
                    'Origin': 'https://www.tiktok.com',
                    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            },
            // 接続パラメータを公式アプリに合わせる
            clientParams: {
                "app_language": "ja-JP",
                "device_platform": "web_pc",
                "aid": 1988
            },
            requestPollingIntervalMs: 1500
        });

        const startConnection = () => {
            tiktokLive.connect().then(state => {
                socket.emit("live-status", "🟢 接続成功！コメントを読み込みます");
            }).catch(err => {
                // ブロックされた場合、5秒後に自動で再試行（執念深く繋ぎにいく）
                socket.emit("live-status", "⚠️ 待機中（TikTokの制限を回避中...）");
                setTimeout(startConnection, 5000);
            });
        };

        startConnection();

        tiktokLive.on("chat", (data) => {
            socket.emit("new-comment", { user: data.uniqueId, text: data.comment, nickname: data.nickname });
        });

        tiktokLive.on("error", (err) => {
            console.log("Stream Error:", err.message);
        });

        tiktokLive.on("disconnected", () => {
            socket.emit("live-status", "⚪️ 接続が切れました。再起動します");
            setTimeout(startConnection, 3000);
        });
    });
});

server.listen(process.env.PORT || 10000);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connect");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, transports: ["polling", "websocket"] });

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    let tiktokLive;

    socket.on("connect-live", (tiktokId) => {
        if (tiktokLive) tiktokLive.disconnect();

        // 接続の信頼性を高める設定
        tiktokLive = new WebcastPushConnection(tiktokId, {
            processInitialData: false,
            fetchOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
                }
            }
        });

        const connectToLive = () => {
            tiktokLive.connect().then(state => {
                socket.emit("live-status", "🟢 接続成功！コメント取得中...");
            }).catch(err => {
                socket.emit("live-status", "❌ 接続失敗。再試行中...");
                setTimeout(connectToLive, 5000); // 5秒後に自動リトライ
            });
        };

        connectToLive();

        // コメント受信
        tiktokLive.on("chat", (data) => {
            socket.emit("new-comment", { user: data.uniqueId, text: data.comment });
        });

        // 接続切れ対策
        tiktokLive.on("disconnected", () => {
            socket.emit("live-status", "⚠️ 接続が切れました。再接続します...");
            setTimeout(connectToLive, 3000);
        });
    });

    socket.on("disconnect", () => {
        if (tiktokLive) tiktokLive.disconnect();
    });
});

server.listen(process.env.PORT || 10000);

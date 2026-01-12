const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connect");
const path = require("path");

const app = express();
const server = http.createServer(app);
// Render対策：ポーリングとWebSocketの両方を許可し、タイムアウトを長めに設定
const io = new Server(server, { 
    cors: { origin: "*" }, 
    transports: ["polling", "websocket"],
    pingTimeout: 60000
});

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    let tiktokLive;

    socket.on("connect-live", (tiktokId) => {
        if (tiktokLive) tiktokLive.disconnect();

        console.log(`接続試行中: ${tiktokId}`);

        // 【最新版】ブラウザ偽装を強化した接続設定
        tiktokLive = new WebcastPushConnection(tiktokId, {
            processInitialData: false,
            enableExtendedGiftInfo: true,
            requestOptions: {
                timeout: 5000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            },
            // モバイルアプリとして振る舞うためのパラメータ
            clientParams: {
                app_language: "ja-JP",
                device_platform: "web_pc"
            }
        });

        // 接続成功時
        tiktokLive.connect().then(state => {
            console.log(`Connected to Room ID: ${state.roomId}`);
            socket.emit("live-status", "🟢 接続成功！データ受信待機中...");
        }).catch(err => {
            console.error("Connection Failed:", err);
            socket.emit("live-status", "❌ 接続失敗: " + (err.message || "不明なエラー"));
        });

        // チャット受信（ここが動くかが勝負）
        tiktokLive.on("chat", (data) => {
            console.log(`New Comment: ${data.uniqueId} - ${data.comment}`); // サーバーログにも出す
            socket.emit("new-comment", { 
                user: data.uniqueId, 
                text: data.comment 
            });
        });

        // エラーハンドリング
        tiktokLive.on("error", (err) => {
            console.error("Stream Error:", err);
        });

        tiktokLive.on("disconnected", () => {
            console.log("Disconnected");
            socket.emit("live-status", "⚠️ 接続が切れました");
        });
    });

    socket.on("disconnect", () => {
        if (tiktokLive) tiktokLive.disconnect();
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`SERVER RUNNING ON PORT ${PORT}`));

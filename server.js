const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connect");
const axios = require("axios");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

// プロフィール取得用API（これは現在成功しています）
app.get("/api/tiktok/:id", async (req, res) => {
    try {
        const response = await axios.get(`https://www.tikwm.com/api/user/info?unique_id=${req.params.id}`);
        res.json(response.data.data || { error: "NotFound" });
    } catch (e) {
        res.status(500).json({ error: "Server Error" });
    }
});

io.on("connection", (socket) => {
    let tiktokLive;

    socket.on("connect-live", (uniqueId) => {
        if (tiktokLive) tiktokLive.disconnect();

        console.log("接続開始:", uniqueId);
        socket.emit("live-status", "⏳ ライブサーバーに接続中...");

        // 接続設定：あえてシンプルにすることでブロックをすり抜ける設定
        tiktokLive = new WebcastPushConnection(uniqueId, {
            processInitialData: false,
            enableExtendedGiftInfo: true,
            requestOptions: {
                timeout: 10000 // タイムアウトを長く
            }
        });

        tiktokLive.connect().then(state => {
            console.log(`Connected to Room: ${state.roomId}`);
            socket.emit("live-status", "🟢 接続成功！コメント待機中...");
        }).catch(err => {
            console.error("Connect Failed:", err);
            
            // エラー内容を分析して画面に表示
            if (err.message.includes("is offline") || err.message.includes("not found")) {
                socket.emit("live-status", "⚠️ 現在ライブ配信していません");
            } else {
                socket.emit("live-status", "❌ ブロックされました。再起動が必要です");
            }
        });

        tiktokLive.on("chat", (data) => {
            socket.emit("new-comment", {
                user: data.uniqueId,
                text: data.comment,
                nickname: data.nickname
            });
        });

        tiktokLive.on("error", (err) => {
            console.error("Stream Error:", err);
        });
        
        tiktokLive.on("disconnected", () => {
            socket.emit("live-status", "⚪️ 接続が切れました");
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

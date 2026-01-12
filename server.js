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

// プロフィールAPI
app.get("/api/tiktok/:id", async (req, res) => {
    try {
        const response = await axios.get(`https://www.tikwm.com/api/user/info?unique_id=${req.params.id}`);
        res.json(response.data.data || { error: "NotFound" });
    } catch (e) { res.status(500).json({ error: "API Error" }); }
});

io.on("connection", (socket) => {
    let tiktokLive;

    socket.on("connect-live", (uniqueId) => {
        if (tiktokLive) tiktokLive.disconnect();

        // 接続の質を高める設定
        tiktokLive = new WebcastPushConnection(uniqueId, {
            processInitialData: false,
            enableExtendedGiftInfo: true,
            fetchOptions: {
                headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' }
            }
        });

        const tryConnect = () => {
            tiktokLive.connect().then(state => {
                socket.emit("live-status", "🟢 接続成功！読み上げ開始します");
            }).catch(err => {
                socket.emit("live-status", "❌ 接続失敗...再試行中");
                setTimeout(tryConnect, 5000); // 失敗しても5秒おきに繋ぎ続ける
            });
        };

        tryConnect();

        tiktokLive.on("chat", (data) => {
            socket.emit("new-comment", { user: data.uniqueId, text: data.comment, nickname: data.nickname });
        });

        tiktokLive.on("disconnected", () => {
            socket.emit("live-status", "⚪️ 接続が切れました。再接続します");
            setTimeout(tryConnect, 3000);
        });
    });
});

server.listen(process.env.PORT || 10000);

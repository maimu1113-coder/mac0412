const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;

// publicフォルダの静的ファイルを公開
app.use(express.static(path.join(__dirname, "public")));

// TikTok接続管理用の変数
let tiktokConnection = null;

io.on("connection", (socket) => {
    console.log("🟢 iPhone Connected to Mac Talk Server");

    socket.on("setTargetUser", (uniqueId) => {
        console.log(`🎯 Target TikTok ID: ${uniqueId}`);

        // 既存の接続があれば切断してリセット
        if (tiktokConnection) {
            tiktokConnection.disconnect();
        }

        // 成功率を極限まで高めるための接続オプション
        // シンガポールリージョンでの動作に最適化
        tiktokConnection = new WebcastPushConnection(uniqueId, {
            processInitialData: false,
            enableExtendedGiftInfo: true,
            requestPollingIntervalMs: 2000,
            clientParams: {
                "app_language": "ja-JP",
                "device_platform": "web"
            }
        });

        // TikTokライブに接続開始
        tiktokConnection.connect().then(state => {
            console.log("✅ TikTok Connected. RoomID:", state.roomId);
            
            // iPhone側に接続成功とルーム情報を送信
            io.emit("roomInfo", {
                nickname: state.roomInfo.owner.nickname,
                avatar: state.roomInfo.owner.avatar_thumb.url_list[0]
            });
        }).catch(err => {
            console.error("❌ TikTok Connect Error:", err.message);
            // 画面側に具体的なエラー内容を通知
            socket.emit("chat", { 
                nickname: "System", 
                comment: "接続失敗: " + (err.message.includes("room_id") ? "ライブが見つかりません" : err.message) 
            });
        });

        // コメント（チャット）を受信した時
        tiktokConnection.on('chat', data => {
            io.emit("chat", {
                nickname: data.nickname,
                comment: data.comment
            });
        });

        // ギフトを受信した時
        tiktokConnection.on('gift', data => {
            io.emit("gift", {
                nickname: data.nickname,
                giftName: data.giftName,
                repeatCount: data.repeatCount
            });
        });

        // 切断を検知した時
        tiktokConnection.on('disconnected', () => {
            console.log("⚠️ TikTok Connection Lost");
            io.emit("chat", { 
                nickname: "System", 
                comment: "⚠️ 接続が切れました。再接続してください。" 
            });
        });
    });
});

server.listen(PORT, () => {
    console.log(`✅ Mac Talk ULTIMATE Server Live (Port: ${PORT})`);
});

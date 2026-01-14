const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let tiktokConnection = null;
let currentTargetUser = null;
let reconnectTimer = null;

// 同一ユーザーによる連投制限 (3秒に1回まで)
const CHAT_LIMIT_MS = 3000;
const userChatMap = new Map();

io.on('connection', (socket) => {
    console.log('[Server] iPhone Connected');

    socket.on('setTargetUser', (uniqueId) => {
        currentTargetUser = uniqueId;
        if (tiktokConnection) {
            tiktokConnection.disconnect();
            tiktokConnection = null;
        }
        connectTikTok(socket);
    });
});

function connectTikTok(socket) {
    if (!currentTargetUser) return;

    tiktokConnection = new WebcastPushConnection(currentTargetUser, {
        processInitialData: false,
        enableExtendedGiftInfo: true,
        requestPollingIntervalMs: 2000,
        clientParams: { "app_language": "ja-JP", "device_platform": "web" }
    });

    tiktokConnection.connect()
        .then(state => {
            const owner = state.roomInfo.owner;
            socket.emit('roomInfo', {
                nickname: owner.nickname || currentTargetUser,
                avatar: owner.avatar_large?.url_list[0] || owner.avatar_thumb?.url_list[0] || "",
                followerCount: owner.stats?.follower_count || 0,
                viewerCount: state.viewerCount || 0
            });
            console.log(`[TikTok] Connected to: ${currentTargetUser}`);
        })
        .catch(err => {
            console.error('[TikTok] Connect Error:', err.message);
            scheduleReconnect(socket);
        });

    tiktokConnection.on('disconnected', () => {
        console.warn('[TikTok] Connection Lost');
        scheduleReconnect(socket);
    });

    // 視聴者数更新
    tiktokConnection.on('roomUser', d => {
        socket.emit('viewerUpdate', { viewerCount: d.viewerCount });
    });

    // チャット受信
    tiktokConnection.on('chat', d => {
        const now = Date.now();
        const last = userChatMap.get(d.userId) || 0;
        if (now - last < CHAT_LIMIT_MS) return;
        userChatMap.set(d.userId, now);

        socket.emit('chat', {
            nickname: d.nickname,
            comment: d.comment,
            userId: d.uniqueId // コマンド判定用
        });
    });

    // ギフト受信
    tiktokConnection.on('gift', d => {
        socket.emit('gift', {
            nickname: d.nickname,
            giftName: d.giftName,
            repeatCount: d.repeatCount
        });
    });
}

function scheduleReconnect(socket) {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        console.log('[TikTok] Attempting Auto-Reconnect...');
        connectTikTok(socket);
    }, 5000);
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('[Mac Talk PRO] Stable System Live on Singapore Region'));

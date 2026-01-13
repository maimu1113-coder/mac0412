const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// --- 安定化用変数 ---
let tiktokConnection = null;
let currentTargetUser = null;
let reconnectTimer = null;
const CHAT_LIMIT_MS = 3000; // 1人3秒に1回
const userChatMap = new Map();

io.on('connection', (socket) => {
    socket.on('setTargetUser', (uniqueId) => {
        currentTargetUser = uniqueId;
        if (tiktokConnection) {
            tiktokConnection.disconnect();
            tiktokConnection = null;
        }
        connectTikTok(socket);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// TikTok接続メイン関数
function connectTikTok(socket) {
    if (!currentTargetUser) return;

    tiktokConnection = new WebcastPushConnection(currentTargetUser);

    tiktokConnection.connect().then(state => {
        const owner = state.roomInfo.owner;
        const avatarUrl = owner.avatar_large?.url_list[0] || owner.avatar_thumb?.url_list[0] || "";
        const followers = owner.stats?.follower_count || state.roomInfo.anchor_show_info?.follower_count || 0;
        
        socket.emit('roomInfo', {
            nickname: owner.nickname || currentTargetUser,
            avatar: avatarUrl,
            followerCount: followers,
            viewerCount: state.viewerCount || 0
        });
        console.log(`[TikTok] Connected to ${currentTargetUser}`);
    }).catch(err => {
        console.error('[TikTok] Connect Error:', err);
        scheduleReconnect(socket);
    });

    // 切断検知時の自動再接続
    tiktokConnection.on('disconnected', () => {
        console.warn('[TikTok] Disconnected. Scheduling reconnect...');
        scheduleReconnect(socket);
    });

    tiktokConnection.on('roomUser', data => {
        socket.emit('viewerUpdate', { viewerCount: data.viewerCount });
    });

    // チャット受信 (連投制限付き)
    tiktokConnection.on('chat', data => {
        const now = Date.now();
        const lastTime = userChatMap.get(data.userId) || 0;

        if (now - lastTime < CHAT_LIMIT_MS) return; // 制限内は無視

        userChatMap.set(data.userId, now);
        socket.emit('chat', {
            nickname: data.nickname,
            comment: data.comment,
            msgId: data.msgId
        });
    });
}

// 再接続スケジューラ
function scheduleReconnect(socket) {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        console.log('[TikTok] Reconnecting...');
        connectTikTok(socket);
    }, 5000); 
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`[Mac Talk PRO] Stable Version Online`));

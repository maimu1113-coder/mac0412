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
const CHAT_LIMIT_MS = 3000; 
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
});

function connectTikTok(socket) {
    if (!currentTargetUser) return;
    tiktokConnection = new WebcastPushConnection(currentTargetUser);

    tiktokConnection.connect().then(state => {
        const owner = state.roomInfo.owner;
        socket.emit('roomInfo', {
            nickname: owner.nickname || currentTargetUser,
            avatar: owner.avatar_large?.url_list[0] || "",
            followerCount: owner.stats?.follower_count || 0,
            viewerCount: state.viewerCount || 0
        });
    }).catch(err => scheduleReconnect(socket));

    tiktokConnection.on('disconnected', () => scheduleReconnect(socket));

    tiktokConnection.on('chat', data => {
        const now = Date.now();
        const lastTime = userChatMap.get(data.userId) || 0;
        if (now - lastTime < CHAT_LIMIT_MS) return;
        userChatMap.set(data.userId, now);
        socket.emit('chat', { nickname: data.nickname, comment: data.comment });
    });
}

function scheduleReconnect(socket) {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectTikTok(socket);
    }, 5000); 
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server Online`));

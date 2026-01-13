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
            followerCount: owner.stats?.follower_count || 0
        });
    }).catch(err => {
        console.error("TikTok Connect Error", err);
        socket.emit('error', '接続に失敗しました。IDを確認してください。');
    });

    tiktokConnection.on('chat', data => {
        socket.emit('chat', { nickname: data.nickname, comment: data.comment });
    });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Stable Server Online`));

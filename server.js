const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let tiktokConnection;

io.on('connection', (socket) => {
    socket.on('setTargetUser', (uniqueId) => {
        if (tiktokConnection) { tiktokConnection.disconnect(); }
        tiktokConnection = new WebcastPushConnection(uniqueId);

        tiktokConnection.connect().then(state => {
            const owner = state.roomInfo.owner;
            socket.emit('roomInfo', {
                nickname: owner.nickname || uniqueId,
                avatar: owner.avatar_thumb?.url_list[0] || "",
                followerCount: owner.stats?.follower_count || 0,
                viewerCount: state.viewerCount || 0
            });
        }).catch(err => console.error('TikTok Error:', err));

        tiktokConnection.on('chat', data => {
            socket.emit('chat', { nickname: data.nickname, comment: data.comment, msgId: data.msgId });
        });
        
        tiktokConnection.on('roomUser', data => {
            socket.emit('viewerUpdate', { viewerCount: data.viewerCount });
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running`));

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    let tiktokConnection;

    socket.on('setTargetUser', (uniqueId) => {
        if (tiktokConnection) tiktokConnection.disconnect();
        tiktokConnection = new WebcastPushConnection(uniqueId);

        tiktokConnection.connect().then(state => {
            // state.roomInfo から確実にデータを抽出
            const room = state.roomInfo;
            io.emit('roomInfo', {
                nickname: room.owner.nickname || uniqueId,
                avatar: room.owner.avatar_thumb.url_list[0],
                followerCount: room.owner.stats.follower_count || 0,
                viewerCount: state.viewerCount || 0
            });
        }).catch(err => console.error('Connect Error', err));

        tiktokConnection.on('roomUser', data => {
            io.emit('viewerUpdate', { viewerCount: data.viewerCount });
        });

        tiktokConnection.on('chat', data => {
            io.emit('chat', { nickname: data.nickname, comment: data.comment });
        });

        tiktokConnection.on('gift', data => {
            io.emit('gift', { nickname: data.nickname, giftName: data.giftName });
        });
    });

    socket.on('disconnect', () => {
        if (tiktokConnection) tiktokConnection.disconnect();
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server is running`));

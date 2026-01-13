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
        if (tiktokConnection) {
            tiktokConnection.disconnect();
            tiktokConnection = null;
        }

        tiktokConnection = new WebcastPushConnection(uniqueId);

        tiktokConnection.connect().then(state => {
            // アイコンURLが深い階層にある場合も考慮
            const owner = state.roomInfo.owner;
            const avatarUrl = owner.avatar_large?.url_list[0] || owner.avatar_medium?.url_list[0] || owner.avatar_thumb?.url_list[0];
            
            socket.emit('roomInfo', {
                nickname: owner.nickname || uniqueId,
                avatar: avatarUrl,
                followerCount: owner.stats?.follower_count || 0,
                viewerCount: state.viewerCount || 0
            });
        }).catch(err => console.error('Connect Error', err));

        tiktokConnection.on('roomUser', data => {
            socket.emit('viewerUpdate', { viewerCount: data.viewerCount });
        });

        // 二重送信を防ぐため、1つのコネクションにつき1回だけemit
        tiktokConnection.on('chat', data => {
            socket.emit('chat', { nickname: data.nickname, comment: data.comment, msgId: data.msgId });
        });

        tiktokConnection.on('gift', data => {
            socket.emit('gift', { nickname: data.nickname, giftName: data.giftName });
        });
    });

    socket.on('disconnect', () => {
        if (tiktokConnection) tiktokConnection.disconnect();
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`System Online`));

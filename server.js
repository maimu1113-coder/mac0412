const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let tiktokConnection; // 接続を1つに固定

io.on('connection', (socket) => {
    socket.on('setTargetUser', (uniqueId) => {
        // 前の接続が残っていたら完全に停止させる
        if (tiktokConnection) {
            tiktokConnection.disconnect();
            tiktokConnection = null;
        }

        tiktokConnection = new WebcastPushConnection(uniqueId);

        tiktokConnection.connect().then(state => {
            // 接続成功時にデータを送信
            socket.emit('roomInfo', {
                nickname: state.roomInfo.owner.nickname,
                avatar: state.roomInfo.owner.avatar_thumb.url_list[0],
                followerCount: state.roomInfo.owner.stats.follower_count,
                viewerCount: state.viewerCount || 0
            });
        }).catch(err => console.error('Connect Error', err));

        // イベントリスナーも1回だけ登録されるように socket ではなく個別に管理
        tiktokConnection.on('roomUser', data => {
            socket.emit('viewerUpdate', { viewerCount: data.viewerCount });
        });

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
server.listen(PORT, () => console.log(`Server Ready`));

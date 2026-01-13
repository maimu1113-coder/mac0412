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
            const room = state.roomInfo;
            const owner = room.owner;
            
            // アイコンURLの取得を強化
            const avatarUrl = owner.avatar_large?.url_list[0] || owner.avatar_thumb?.url_list[0] || "";
            // フォロワー数の取得を多重化
            const followers = owner.stats?.follower_count || room.anchor_show_info?.follower_count || 0;

            socket.emit('roomInfo', {
                nickname: owner.nickname || uniqueId,
                avatar: avatarUrl,
                followerCount: followers,
                viewerCount: state.viewerCount || 0
            });
        }).catch(err => console.error('TikTok Connect Error:', err));

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
server.listen(PORT, () => console.log(`Mac Talk System Online`));

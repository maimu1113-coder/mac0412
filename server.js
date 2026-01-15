const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let tiktok = null;

io.on('connection', (socket) => {
    socket.on('setTarget', (id) => {
        if (tiktok) tiktok.disconnect();
        tiktok = new WebcastPushConnection(id);
        tiktok.connect().then(state => {
            io.emit('ready', {
                name: state.roomInfo.owner.nickname,
                icon: state.roomInfo.owner.avatar_thumb.url_list[0],
                viewers: state.viewerCount
            });
        }).catch(() => socket.emit('log', {m:'接続エラー', c:'#ff0050'}));

        tiktok.on('chat', d => io.emit('ev', {t:'chat', u:d.nickname, m:d.comment}));
        tiktok.on('gift', d => io.emit('ev', {t:'gift', u:d.nickname, g:d.giftName, n:d.repeatCount}));
        tiktok.on('follow', d => io.emit('ev', {t:'follow', u:d.nickname}));
        tiktok.on('roomUser', d => io.emit('up-v', d.viewerCount));
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('TikFinity UI Live'));

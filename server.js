const { WebcastPushConnection } = require('tiktok-live-connect');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    socket.on('start', (targetId) => {
        let tiktok = new WebcastPushConnection(targetId);
        tiktok.connect().then(() => {
            socket.emit('status', 'connected');
        }).catch(err => {
            socket.emit('status', 'error');
        });

        tiktok.on('chat', data => socket.emit('chat', { user: data.nickname, text: data.comment }));
        tiktok.on('gift', data => socket.emit('gift', { user: data.nickname, gift: data.giftName }));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

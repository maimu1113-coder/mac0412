const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    socket.on('start', (targetId) => {
        let tiktokConnection = new WebcastPushConnection(targetId);

        tiktokConnection.connect().then(state => {
            socket.emit('status', 'connected');
        }).catch(err => {
            socket.emit('status', 'error');
        });

        // チャット：nickname（表示名）を送るように変更
        tiktokConnection.on('chat', data => {
            socket.emit('chat', { 
                user: data.nickname || data.uniqueId, 
                text: data.comment 
            });
        });

        // ギフト：確実にデータを送る
        tiktokConnection.on('gift', data => {
            if (data.giftType === 1 && data.repeatEnd === false) return; 
            socket.emit('gift', { 
                user: data.nickname || data.uniqueId, 
                gift: data.giftName,
                count: data.repeatCount
            });
        });

        socket.on('disconnect', () => { tiktokConnection.disconnect(); });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });

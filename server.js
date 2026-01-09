const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('start', (targetId) => {
        let tiktokConnection = new WebcastPushConnection(targetId);

        tiktokConnection.connect().then(state => {
            console.log(`Connected to ${state.roomId}`);
            socket.emit('status', 'connected');
        }).catch(err => {
            console.error('Failed to connect', err);
            socket.emit('status', 'error');
        });

        tiktokConnection.on('chat', data => {
            socket.emit('chat', { user: data.uniqueId, text: data.comment });
        });

        tiktokConnection.on('gift', data => {
            socket.emit('gift', { user: data.uniqueId, gift: data.giftName });
        });

        socket.on('disconnect', () => {
            tiktokConnection.disconnect();
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

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
            console.log(`Connected to ${state.roomId}`);
        }).catch(err => {
            console.error('Failed to connect', err);
        });

        tiktokConnection.on('chat', data => {
            io.emit('chat', { nickname: data.nickname, comment: data.comment });
        });
    });

    socket.on('disconnect', () => {
        if (tiktokConnection) tiktokConnection.disconnect();
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

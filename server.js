const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ★ これが無いと画面は出ません
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("connected");

  socket.on("start", (id) => {
    console.log("START:", id);

    // テスト用：5秒ごとにコメント送信
    setInterval(() => {
      socket.emit("chat", {
        user: "テストユーザー",
        text: "コメントテストです"
      });
    }, 5000);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("Server running");
});

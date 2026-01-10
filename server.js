const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

/* ★ CORS 必須（iPhone + Render） */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* ★ public/index.html を配信 */
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("socket connected");

  socket.on("start", (id) => {
    console.log("START:", id);

    /* ★ 5秒ごとテストコメント */
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
  console.log("Server running on", PORT);
});

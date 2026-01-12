const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connect");
const axios = require("axios");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, transports: ["polling", "websocket"] });
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/tiktok/:id", async (req, res) => {
  try {
    const response = await axios.get(`https://www.tikwm.com/api/user/info?unique_id=${req.params.id}`);
    if (response.data && response.data.data) { res.json(response.data.data); }
    else { res.status(404).json({ error: "NotFound" }); }
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

io.on("connection", (socket) => {
  let tiktokLive;
  socket.on("connect-live", (id) => {
    if (tiktokLive) tiktokLive.disconnect();
    tiktokLive = new WebcastPushConnection(id);
    tiktokLive.connect().then(() => socket.emit("live-status", "🟢 LIVE接続完了！")).catch(() => socket.emit("live-status", "❌ オフライン"));
    tiktokLive.on("chat", (data) => socket.emit("new-comment", { user: data.uniqueId, text: data.comment }));
  });
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
server.listen(PORT);

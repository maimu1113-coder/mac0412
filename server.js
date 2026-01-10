require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");
const OpenAI = require("openai");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.static("public"));

/* ===== 記憶領域 ===== */
const memory = {};
const preferences = {};
let lastChatTime = Date.now();
let currentTheme = "雑談";

/* ===== 人格定義 ===== */
const THEMES = {
  雑談: "親しみやすい日本人女性配信者",
  釣り: "釣り好きで元気な女性配信者",
  深夜: "落ち着いた眠そうな女性配信者"
};

const PERSONAS = {
  main: "配信の進行役として自然に話す",
  boke: "少し天然でボケる",
  tsukkomi: "関西弁でツッコむ"
};

/* ===== AI関数 ===== */
async function askAI(system, text) {
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: text }
    ]
  });
  return r.choices[0].message.content;
}

/* ===== 無言時に話題振り ===== */
setInterval(async () => {
  if (Date.now() - lastChatTime > 30000) {
    const topic = await askAI(
      "あなたは配信を盛り上げる女性",
      "視聴者に話題を1つ振って"
    );
    io.emit("ai", { text: topic });
    lastChatTime = Date.now();
  }
}, 5000);

/* ===== Socket ===== */
io.on("connection", socket => {
  socket.on("start", async targetId => {
    const tiktok = new WebcastPushConnection(targetId);

    try {
      await tiktok.connect();
      socket.emit("ai", { text: "接続完了！コメント読んでいくね" });
    } catch {
      socket.emit("ai", { text: "接続失敗…" });
      return;
    }

    tiktok.on("chat", async data => {
      const user = data.nickname || data.uniqueId;
      const text = data.comment;
      lastChatTime = Date.now();

      memory[user] = memory[user] || [];
      memory[user].push(text);

      if (/釣り/.test(text)) {
        preferences[user] = preferences[user] || [];
        if (!preferences[user].includes("釣り")) preferences[user].push("釣り");
      }

      if (text.startsWith("テーマ変更")) {
        const t = text.replace("テーマ変更", "").trim();
        if (THEMES[t]) {
          currentTheme = t;
          socket.emit("ai", { text: `${t}モードに切り替えたよ` });
          return;
        }
      }

      const main = await askAI(THEMES[currentTheme], text);
      const boke = await askAI(PERSONAS.boke, text);
      const tsukkomi = await askAI(PERSONAS.tsukkomi, text);

      socket.emit("ai", {
        text: `${user}さん\n${main}\n${boke}\n${tsukkomi}`
      });
    });

    tiktok.on("gift", data => {
      socket.emit("ai", {
        text: `${data.nickname || data.uniqueId}さん、${data.giftName}ありがとう！`
      });
    });

    socket.on("disconnect", () => tiktok.disconnect());
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Server running"));

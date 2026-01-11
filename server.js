import express from "express";
import http from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import { WebcastPushConnection } from "tiktok-live-connector";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* ===== メモリー ===== */
const userMemory = {};
let lastCommentTime = Date.now();
let idleTimer = null;

/* ===== 感情分析 ===== */
function analyzeEmotion(text) {
  if (/w|笑|😂|🤣/.test(text)) return "happy";
  if (/悲|つら|泣/.test(text)) return "sad";
  if (/怒|ムカ/.test(text)) return "angry";
  return "normal";
}

/* ===== 絵文字除去 ===== */
function removeEmoji(text) {
  return text.replace(/([\u{1F300}-\u{1FAFF}])/gu, "");
}

/* ===== ChatGPT ===== */
async function askGPT(name, text, emotion) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは女性配信AI。感情は${emotion}。滑らかに話してください。`
        },
        {
          role: "user",
          content: `${name}：${text}`
        }
      ]
    })
  });
  const j = await res.json();
  return j.choices[0].message.content;
}

/* ===== VoiceVox ===== */
async function voicevoxSpeak(text) {
  const base = process.env.VOICEVOX_URL;

  const q = await fetch(
    `${base}/audio_query?text=${encodeURIComponent(text)}&speaker=1`,
    { method: "POST" }
  ).then(r => r.json());

  const v = await fetch(
    `${base}/synthesis?speaker=1`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q)
    }
  );

  const buf = await v.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

/* ===== 無言時AIトーク ===== */
function startIdleTalk(socket) {
  if (idleTimer) clearInterval(idleTimer);

  idleTimer = setInterval(async () => {
    if (Date.now() - lastCommentTime > 30000) {
      lastCommentTime = Date.now();

      const topic = await askGPT(
        "配信者AI",
        "コメントが少ないので話題を振ってください",
        "normal"
      );

      const voice = await voicevoxSpeak(topic);
      socket.emit("voice", voice);
      socket.emit("subtitle", topic);
    }
  }, 10000);
}

/* ===== Socket ===== */
io.on("connection", socket => {

  socket.on("ping", () => {});

  socket.on("start", async targetId => {
    const tiktok = new WebcastPushConnection(targetId);

    try {
      await tiktok.connect();
      socket.emit("status", "connected");
    } catch {
      socket.emit("status", "error");
      return;
    }

    startIdleTalk(socket);

    tiktok.on("chat", async data => {
      lastCommentTime = Date.now();

      const userId = data.uniqueId;
      const name = data.nickname || userId;
      const text = removeEmoji(data.comment);

      userMemory[userId] = name;
      const emotion = analyzeEmotion(text);

      const reply = await askGPT(name, text, emotion);
      const voice = await voicevoxSpeak(reply);

      socket.emit("voice", voice);
      socket.emit("subtitle", reply);
    });

    socket.on("disconnect", () => {
      tiktok.disconnect();
    });
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

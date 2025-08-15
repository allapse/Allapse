import express from "express";
import { Client, middleware } from "@line/bot-sdk";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
const client = new Client(config);

// 只給 /webhook 保留 raw body
app.post(
  "/webhook",
  express.raw({ type: "*/*" }),
  middleware(config),
  async (req, res) => {
    Promise.all(req.body.events.map(handleEvent)).then((result) =>
      res.json(result)
    );
  }
);

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return null;

  const userMessage = event.message.text;

  // 限制 7 字內文字
  if (userMessage.length <= 7) {
    const { data, error } = await supabase
      .from("submissions")
      .insert([
        {
          user_id: event.source.userId,
          text_content: userMessage,
          timestamp: new Date().toISOString()
        }
      ]);
    if (error) console.log(error);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "已收到你的挑戰！👍"
    });
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `你說了：「${userMessage}」`
  });
}

// 可選首頁
app.get("/", (req, res) => {
  res.send("<h1>想像力極限挑戰 LINE Bot</h1>");
});

export default app;
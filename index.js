import express from "express";
import { Client, middleware } from "@line/bot-sdk";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
const client = new Client(config);

// LINE webhook middleware
app.post("/webhook", middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

// 處理訊息
const generateQuotation = require('./generateQuotation');
const fs = require('fs');

async function handleTextMessage(event) {
  if (event.message.text === '報價單測試') {
    const pdfPath = await generateQuotation({
      clientName: '測試客戶',
      items: [
        { name: '網站開發', price: 5000, qty: 1 },
        { name: '主機租用', price: 1000, qty: 3 }
      ]
    });

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '報價單已生成！但 LINE 不支援直接發 PDF，你需要給一個下載連結。'
    });

    // 你可以把 PDF 上傳到雲端（例如 S3、Vercel Storage、Google Drive）
    // 然後回覆那個連結
  }
}


app.get("/", (req, res) => {
  res.send("Allapse LINE BOT is running.");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

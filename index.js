import express from "express";
import { middleware, Client } from "@line/bot-sdk";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname 替代
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();

app.post("/webhook", middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.trim();

  if (userMessage === "生成報價單") {
    const pdfPath = path.join(__dirname, "quote.pdf");
    generateQuotePDF(pdfPath);

    // 假設部署在 Vercel，提供靜態檔案下載
    const fileUrl = `${process.env.BASE_URL}/quote.pdf`;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `報價單已生成：${fileUrl}`,
    });
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: "輸入「生成報價單」即可獲得範例 PDF 報價單。",
  });
}

function generateQuotePDF(filePath) {
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(20).text("報價單", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`公司名稱：Allapse Studio`);
  doc.text(`日期：${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.text(`品項：AI 聊天機器人開發`);
  doc.text(`金額：NT$ 30,000`);
  doc.text(`備註：含部署與簡易維護`);

  doc.end();
}

// 靜態檔案提供（報價單 PDF）
app.use(express.static(__dirname));

app.listen(process.env.PORT || 3000, () => {
  console.log("LINE Bot server running");
});

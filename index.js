import express from "express";
import { Client, middleware } from "@line/bot-sdk";
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from "pdfkit";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
const client = new Client(config);

// __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 首頁路由
app.get("/", (req, res) => {
  res.send(`
    <h1>LINE 報價單系統</h1>
    <p>這是用 PDFKit 生成 PDF 的範例。</p>
    <p><a href="/quote.pdf" target="_blank">預覽報價單 PDF</a></p>
  `);
});

// LINE Webhook
app.post("/webhook", middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  // 如果用戶輸入「報價單」，回覆下載連結
  if (userMessage.includes("報價單")) {
    const pdfUrl = "https://allapse.vercel.app/quote.pdf"; // 這裡換成你的 Vercel domain
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `這是您的報價單下載連結：\n${pdfUrl}`
    });
  }

  // 其他訊息就原封不動回覆
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `你說了：「${userMessage}」`
  });
}

// PDF 生成路由
app.get('/quote.pdf', (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="quote.pdf"');

  const doc = new PDFDocument();

  doc.pipe(res);

  // 絕對路徑載入字型
  const fontPath = path.join(__dirname, 'fonts', 'NotoSansTC-Regular.ttf');
  doc.font(fontPath);

  doc.fontSize(20).text("報價單", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text("客戶名稱：測試公司");
  doc.text("服務內容：網站開發");
  doc.text("金額：NT$ 30,000");
  doc.text("交付日期：2025/08/30");
  doc.text("付款方式：50% 預付款，50% 驗收後支付");

  doc.end();
});

// ❌ 刪掉 app.listen()
// ✅ 改成 export default，讓 Vercel 可以呼叫
export default app;

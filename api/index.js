import express from "express";
import { Client, middleware } from "@line/bot-sdk";
import { createClient } from "@supabase/supabase-js";

// 環境變數
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

// 初始化 LINE Bot 與 Supabase
const client = new Client({
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: LINE_CHANNEL_SECRET
});
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Express App
const app = express();

// LINE middleware
app.post("/webhook", middleware({
  channelSecret: LINE_CHANNEL_SECRET
}), async (req, res) => {
  try {
    const events = req.body.events;
    await Promise.all(events.map(handleEvent));
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error" });
  }
});

// 處理每一個事件
async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const userId = event.source.userId;
  const text = event.message.text.trim().slice(0, 7); // 強制限制 7 字
  const replyText = await handleChallenge(userId, text);

  await client.replyMessage(event.replyToken, {
    type: "text",
    text: replyText
  });
}

// 挑戰文字處理
async function handleChallenge(userId, textContent) {
  // 查詢是否有人提交過這個文字
  const { data: existingText, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('text_content', textContent)
    .single()
    .maybeSingle();

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return '系統錯誤';
  }

  if (existingText) {
    if (existingText.user_id === userId) {
      // 同人修改文字（更新 timestamp）
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ timestamp: new Date().toISOString() })
        .eq('submission_id', existingText.submission_id);

      if (updateError) {
        console.error(updateError);
        return '系統錯誤';
      }
      return '已更新挑戰';
    } else {
      // 不同人提交相同文字 → duplicate_count +1
      const { error: dupError } = await supabase
        .from('submissions')
        .update({ duplicate_count: existingText.duplicate_count + 1 })
        .eq('submission_id', existingText.submission_id);

      if (dupError) {
        console.error(dupError);
        return '系統錯誤';
      }
      return '重複';
    }
  } else {
    // 完全新挑戰 → insert
    const { error: insertError } = await supabase
      .from('submissions')
      .insert([{
        user_id: userId,
        text_content: textContent,
        timestamp: new Date().toISOString(),
        duplicate_count: 1
      }]);

    if (insertError) {
      console.error(insertError);
      return '系統錯誤';
    }
    return '收到挑戰';
  }
}

// 可選首頁測試頁
app.get("/", (req, res) => {
  res.send(`
    <h1>想像力極限挑戰 LINE Bot</h1>
    <p>透過 LINE 傳訊息參加挑戰，文字限制 7 字內。</p>
  `);
});

// 不要 app.listen()，Vercel 會自動處理
export default app;
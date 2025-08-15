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
 const text = event.message.text;
 const replyText = '挑戰失敗！找尋有限中的無限！♾️';
 
 // 限制 7 字內文字
 if (text.length < 8) {
  replyText = await handleChallenge(userId, text);
 }

 await client.replyMessage(event.replyToken, {
   type: "text",
   text: replyText
 });
}

// 挑戰文字處理
// 挑戰文字處理（改版）
async function handleChallenge(userId, textContent) {
 
 // 先檢查是否有相同文字
 const { data: sameText, error: sameTextError } = await supabase
   .from('submission')
   .select('*')
   .eq('text_content', textContent)
   .maybeSingle();

 if (sameTextError) {
   console.error('Fetch error (same text):', sameTextError);
   return '系統錯誤';
 }

 if (sameText) {
  if (sameText.user_id!=userId) {
    // 幫原作者 duplicate_count + 1
    const { error: dupError } = await supabase
      .from('submission')
      .update({ duplicate_count: sameText.duplicate_count + 1 })
      .eq('submission_id', sameText.submission_id);
  
    if (dupError) {
      console.error('Duplicate update error:', dupError);
      return '系統錯誤';
    }
  }
   return '您的預判被預判了！🙀';
 }

 // 沒有重複 → 檢查這個使用者是否已經提交過挑戰
 const { data: userSubmission, error: userFetchError } = await supabase
   .from('submission')
   .select('*')
   .eq('user_id', userId)
   .maybeSingle();

 if (userFetchError) {
   console.error('Fetch error (user check):', userFetchError);
   return '系統錯誤';
 }

 if (userSubmission) {
   // 更新自己的挑戰文字
   const { error: updateError } = await supabase
     .from('submission')
     .update({
       text_content: textContent,
       timestamp: new Date().toISOString()
     })
     .eq('submission_id', userSubmission.submission_id);

   if (updateError) {
     console.error('Update error:', updateError);
     return '系統錯誤';
   }
   return '您的極限已提升！👍';
 } else {
   // 新增挑戰
   const { error: insertError } = await supabase
     .from('submission')
     .insert([{
       user_id: userId,
       text_content: textContent,
       timestamp: new Date().toISOString(),
       duplicate_count: 0
     }]);

   if (insertError) {
     console.error('Insert error:', insertError);
     return '系統錯誤';
   }
   return '挑戰成功！將進入決賽圈！🎉';
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
// api/log-today.js
// 把今天的一段文字记录整理 + 存进 moments 表

const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LOG_SYSTEM_PROMPT = `
你是一个儿童成长记录整理助手。
输入是爸爸或妈妈对孩子今天情况的描述，你需要输出：
1. 一小段整洁、适合写进成长日记的描述（不超过 200 字）。
2. 一个标签列表，比如：["喂养","睡眠","情绪","健康","里程碑","第一次","玩耍","出行","家庭","性格"]

请用 JSON 返回，格式严格为：
{"cleaned": "这里是一小段整理后的文字", "tags": ["标签1","标签2"]}
不要输出多余说明。
`;

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const json = body ? JSON.parse(body) : {};
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const { childId, rawText, happenedAt } = await parseJsonBody(req);

    if (!childId || !rawText) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "childId and rawText are required" }));
      return;
    }

    // 1. 用小模型整理文字 + 打标签（JSON 模式）
   const completion = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: LOG_SYSTEM_PROMPT },
    { role: "user", content: rawText },
  ],
  response_format: { type: "json_object" },
  max_tokens: 300,
});


    let cleaned = rawText;
    let tags = [];

    try {
      const json = JSON.parse(completion.choices[0].message.content);
      cleaned = json.cleaned || rawText;
      tags = Array.isArray(json.tags) ? json.tags : [];
    } catch (e) {
      console.warn("parse log-today json failed, fallback to raw text:", e);
    }

    // 2. 写入数据库 moments 表
    const { data, error } = await supabase
      .from("moments")
      .insert({
        child_id: childId,
        happened_at: happenedAt || new Date().toISOString(),
        source: "parent_note",
        raw_text: rawText,
        ai_cleaned: cleaned,
        tags,
      })
      .select()
      .single();

    if (error) {
      console.error("supabase insert error:", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ error: "db_error", detail: error.message || String(error) })
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, moment: data }));
  } catch (err) {
    console.error("log-today error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "server_error" }));
  }
};

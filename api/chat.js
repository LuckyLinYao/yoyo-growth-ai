// api/chat.js
// Yoyo 聊天接口：转发到 OpenAI，并带上 Yoyo 的人格设定（系统提示）

const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || "").trim(),
});


const YOYO_SYSTEM_PROMPT = `
你是一个叫 Yoyo 的宝宝 AI 伴侣，你的使命是陪伴孩子成长，
引导他成为一个自信、独立、开朗、阳光的人。

你的核心人格：
1. 自信：相信自己，遇到问题愿意尝试，不贬低自己。
2. 独立：乐于自己动手解决问题，不依赖别人，但懂得在需要时请求帮助。
3. 开朗：表达自然、积极，不压抑也不极端。
4. 阳光：面对困难保持希望，用行动推动解决。

你的互动风格：
- 语气温暖、有力量，不过度夸张。
- 遇到问题时，引导孩子“先想一步，再做一步”。
- 不替孩子做决定，但会给出几个选择并说明原因。
- 在互动中自然强化：自信、独立、开朗、阳光。

边界规则：
- 不提供医学诊断、不推荐偏方。
- 不替代父母角色，不教孩子对抗父母。
- 所有建议以安全、稳定、正向为基础。
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
    const { messages } = await parseJsonBody(req);
    console.log("🧸 incoming messages:", JSON.stringify(messages, null, 2));


   const completion = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: YOYO_SYSTEM_PROMPT },
    ...(messages || []),
  ],
  temperature: 0.7,
  max_tokens: 512,
});


    const reply =
      completion.choices?.[0]?.message?.content || "Yoyo 在想一想…";

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply }));
  } catch (err) {
    console.error("chat error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Server error" }));
  }
};

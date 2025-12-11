// api/recent-moments.js
// 查询某个 childId 最近的成长记录

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    // 从 URL 查询参数里取 childId
    const url = new URL(req.url, "http://localhost");
    const childId = url.searchParams.get("childId");

    if (!childId) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "childId is required" }));
      return;
    }

    const { data, error } = await supabase
      .from("moments")
      .select("*")
      .eq("child_id", childId)
      .order("happened_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("supabase select error:", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ error: "db_error", detail: error.message || String(error) })
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ moments: data || [] }));
  } catch (err) {
    console.error("recent-moments error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "server_error" }));
  }
};

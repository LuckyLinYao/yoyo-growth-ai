// TODO: recent-moments 查询接口将在连接数据库后完善
export default function handler(req, res) {
  res.status(200).json({ moments: [] });
}

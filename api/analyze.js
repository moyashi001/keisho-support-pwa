const { extractTweetId, fetchTweet } = require("../lib/xApi");
const { extractConditions } = require("../lib/conditionExtractor");
const { generateReply } = require("../lib/replyGenerator");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POSTのみ対応しています。" });
    return;
  }

  try {
    const { url } = req.body || {};
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      res.status(400).json({ error: "ツイートURLからIDを取得できませんでした。" });
      return;
    }

    const tweetData = await fetchTweet(tweetId);
    const conditions = extractConditions(tweetData);
    const reply = generateReply(conditions);

    res.status(200).json({ tweetData, conditions, reply });
  } catch (err) {
    console.error("[analyze] failed:", err.message, err.data || "");

    if (err.code === 402) {
      res.status(502).json({ error: "X APIの利用枠(クレジット)が不足しています。開発者ポータルでプラン・利用状況を確認してください。" });
      return;
    }
    if (err.code === 429) {
      res.status(502).json({ error: "X APIのレート制限に達しました。しばらく待ってから再度お試しください。" });
      return;
    }

    res.status(500).json({ error: "ツイートの解析に失敗しました。URLやAPIキーを確認してください。" });
  }
};

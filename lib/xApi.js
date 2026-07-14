const { TwitterApi } = require("twitter-api-v2");

let cachedClient = null;
function getClient() {
  if (!process.env.X_BEARER_TOKEN) {
    throw new Error("X_BEARER_TOKEN が未設定です。Vercelの環境変数を確認してください。");
  }
  if (!cachedClient) {
    cachedClient = new TwitterApi(process.env.X_BEARER_TOKEN).readOnly;
  }
  return cachedClient;
}

/**
 * ツイートURLからツイートIDを抽出する。
 * 対応形式: https://twitter.com/user/status/123..., https://x.com/user/status/123...?s=20
 */
function extractTweetId(url) {
  if (!url) return null;
  const match = String(url).match(/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * X API v2 からツイート本文・ハッシュタグ・画像・投稿者情報を取得する。
 */
async function fetchTweet(tweetId) {
  const client = getClient();
  const { data: tweet, includes } = await client.v2.singleTweet(tweetId, {
    expansions: ["author_id", "attachments.media_keys"],
    "tweet.fields": ["text", "entities", "created_at"],
    "user.fields": ["name", "username"],
    "media.fields": ["url", "preview_image_url", "type"],
  });

  const author = includes?.users?.[0];
  const media = includes?.media ?? [];
  const hashtags = (tweet.entities?.hashtags ?? []).map((h) => h.tag);
  const mentions = (tweet.entities?.mentions ?? []).map((m) => m.username);
  const images = media
    .filter((m) => m.type === "photo")
    .map((m) => m.url || m.preview_image_url)
    .filter(Boolean);

  return {
    tweetId,
    text: tweet.text,
    hashtags,
    mentions,
    images,
    createdAt: tweet.created_at,
    author: author
      ? { id: author.id, name: author.name, username: author.username }
      : null,
  };
}

module.exports = { extractTweetId, fetchTweet };

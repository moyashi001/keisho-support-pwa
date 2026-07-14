const MAX_LENGTH = 130;

const OPENERS = [
  "{product}、すごく気になっていました！",
  "{product}、写真を見て思わず目を引かれました！",
  "{product}気になってました、素敵ですね！",
  "{product}、パッケージからも魅力が伝わってきます！",
];

const PRAISES = [
  "{company}さんの新しい取り組み、いつも楽しみにしています。",
  "{company}さんらしい丁寧な作りが伝わってきます。",
  "{company}さんの商品はいつも生活の中で活躍しています。",
  "{company}さんのアイデア、毎回驚かされます。",
];

const CLOSERS = [
  "当選を楽しみにしています！",
  "使ってみるのが今から楽しみです！",
  "ぜひ試してみたいです！",
  "当たったら大切に使いたいです！",
];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function fillTemplate(template, { product, company }) {
  return template
    .replace("{product}", product || "こちらの商品")
    .replace("{company}", company || "");
}

function truncateToLimit(text, limit) {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + "…";
}

/**
 * 応募条件をもとに、130文字以内の自然なリプライ文を生成する。
 * 文面は候補テンプレートからその都度組み合わせて作るため、応募のたびに表現が変わる
 * (毎回同一文面のコピペにならないようにするための自然なバリエーション)。
 */
function generateReply(conditions) {
  const { productName, companyName, hashtags, replyContentSpec } = conditions;

  const opener = fillTemplate(pickRandom(OPENERS), { product: productName });
  const praise = companyName ? fillTemplate(pickRandom(PRAISES), { company: companyName }) : "";
  const closer = pickRandom(CLOSERS);
  const tagText = hashtags.length > 0 ? hashtags.map((h) => `#${h}`).join(" ") : "";

  let candidate = [opener, praise, closer, tagText].filter(Boolean).join(" ");

  if (candidate.length > MAX_LENGTH) {
    // ハッシュタグは条件を満たすため必ず残し、本文側を削って調整する
    const bodyLimit = MAX_LENGTH - (tagText ? tagText.length + 1 : 0);
    const body = [opener, praise, closer].filter(Boolean).join(" ");
    candidate = [truncateToLimit(body, bodyLimit), tagText].filter(Boolean).join(" ");
  }

  return {
    text: candidate,
    length: candidate.length,
    note: replyContentSpec
      ? `このツイートは「${replyContentSpec}」という指定があります。内容が合っているか投稿前に確認してください。`
      : null,
  };
}

module.exports = { generateReply, MAX_LENGTH };

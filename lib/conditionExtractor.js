/**
 * ツイート本文から懸賞応募条件を抽出する。
 * 日本語の懸賞ツイートでよく使われる表現をキーワード/正規表現で判定する簡易ロジック。
 */
function extractConditions(tweetData) {
  const text = tweetData.text || "";

  const followRequired = /フォロー|フォロ\s*&|フォロバ/.test(text);
  const repostRequired = /RT|リポスト|リツイート/i.test(text);
  const hashtagRequired = tweetData.hashtags.length > 0 && /ハッシュタグ|タグをつけて|#\S+\s*(を付けて|をつけて)/.test(text + tweetData.hashtags.join(""));
  const replyRequired = /リプライ|コメント|返信/.test(text);

  // リプライ内容の指定 (「〇〇と一言」「感想をコメント」など自由記述系か、固定文言指定かの目安)
  let replyContentSpec = null;
  const freeCommentMatch = text.match(/(感想|コメント|一言|意気込み)[をと][^\n。!!]{0,20}/);
  if (freeCommentMatch) {
    replyContentSpec = freeCommentMatch[0];
  }

  const companyName = tweetData.author?.name ?? null;
  // 商品名の抽出は本文中の「」『』【】で囲まれた語を優先し、無ければハッシュタグ由来の語を候補にする
  const quotedMatch = text.match(/[「『【]([^」』】]{2,20})[」』】]/);
  const productName = quotedMatch ? quotedMatch[1] : (tweetData.hashtags[0] ?? null);

  return {
    followRequired,
    repostRequired,
    hashtagRequired,
    replyRequired,
    replyContentSpec,
    hashtags: tweetData.hashtags,
    companyName,
    productName,
  };
}

module.exports = { extractConditions };

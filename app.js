(function () {
  "use strict";

  var current = null; // 現在解析中のツイート情報 (保存はしない。画面遷移中のみ保持)

  // ---- タブ / 画面切り替え ----
  var tabButtons = Array.prototype.slice.call(document.querySelectorAll(".tab-btn"));
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));

  function showScreen(name) {
    screens.forEach(function (s) { s.classList.toggle("is-active", s.id === "screen-" + name); });
    tabButtons.forEach(function (b) { b.classList.toggle("is-active", b.dataset.tab === name); });
  }

  function enableTab(name) {
    var btn = tabButtons.find(function (b) { return b.dataset.tab === name; });
    if (btn) btn.disabled = false;
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.disabled) return;
      showScreen(btn.dataset.tab);
    });
  });

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- ツイートURLからID抽出 (Intent URL生成用。API通信は行わない) ----
  function extractTweetId(url) {
    if (!url) return null;
    var match = String(url).match(/status\/(\d+)/);
    return match ? match[1] : null;
  }

  // ---- 本文からハッシュタグを抽出 ----
  function extractHashtags(text) {
    var matches = String(text || "").match(/#([^\s#。、！？!?,.]+)/g) || [];
    return matches.map(function (m) { return m.slice(1); });
  }

  // ---- 応募条件抽出 (日本語の懸賞ツイートでよくある表現をキーワード判定) ----
  function extractConditions(text, hashtags, companyName) {
    var followRequired = /フォロー|フォロ\s*&|フォロバ/.test(text);
    var repostRequired = /RT|リポスト|リツイート/i.test(text);
    var hashtagRequired = hashtags.length > 0 && /ハッシュタグ|タグをつけて|を付けて|をつけて/.test(text);
    var replyRequired = /リプライ|コメント|返信/.test(text);

    var replyContentSpec = null;
    var freeCommentMatch = text.match(/(感想|コメント|一言|意気込み)[をと][^\n。!!]{0,20}/);
    if (freeCommentMatch) replyContentSpec = freeCommentMatch[0];

    // 商品名は「」『』(固有名詞に使われやすい)を優先し、無ければ【】、それも無ければハッシュタグを使う
    var quotedMatch = text.match(/[「『]([^」』]{2,20})[」』]/) || text.match(/【([^】]{2,20})】/);
    var productName = quotedMatch ? quotedMatch[1] : (hashtags[0] || null);

    return {
      followRequired: followRequired,
      repostRequired: repostRequired,
      hashtagRequired: hashtagRequired,
      replyRequired: replyRequired,
      replyContentSpec: replyContentSpec,
      hashtags: hashtags,
      companyName: companyName || null,
      productName: productName,
    };
  }

  // ---- リプライ文生成 (テンプレートの組み合わせをその都度変えて自然なバリエーションにする) ----
  var OPENERS = [
    "{product}、すごく気になっていました！",
    "{product}、写真を見て思わず目を引かれました！",
    "{product}気になってました、素敵ですね！",
    "{product}、パッケージからも魅力が伝わってきます！",
  ];
  var PRAISES = [
    "{company}さんの新しい取り組み、いつも楽しみにしています。",
    "{company}さんらしい丁寧な作りが伝わってきます。",
    "{company}さんの商品はいつも生活の中で活躍しています。",
    "{company}さんのアイデア、毎回驚かされます。",
  ];
  var CLOSERS = [
    "当選を楽しみにしています！",
    "使ってみるのが今から楽しみです！",
    "ぜひ試してみたいです！",
    "当たったら大切に使いたいです！",
  ];
  var MAX_LENGTH = 130;

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function fillTemplate(template, product, company) {
    return template.replace("{product}", product || "こちらの商品").replace("{company}", company || "");
  }

  function truncateToLimit(text, limit) {
    if (text.length <= limit) return text;
    return text.slice(0, limit - 1) + "…";
  }

  function generateReply(conditions) {
    var opener = fillTemplate(pickRandom(OPENERS), conditions.productName, conditions.companyName);
    var praise = conditions.companyName ? fillTemplate(pickRandom(PRAISES), conditions.productName, conditions.companyName) : "";
    var closer = pickRandom(CLOSERS);
    var tagText = conditions.hashtags.length > 0 ? conditions.hashtags.map(function (h) { return "#" + h; }).join(" ") : "";

    var candidate = [opener, praise, closer, tagText].filter(Boolean).join(" ");

    if (candidate.length > MAX_LENGTH) {
      var bodyLimit = MAX_LENGTH - (tagText ? tagText.length + 1 : 0);
      var body = [opener, praise, closer].filter(Boolean).join(" ");
      candidate = [truncateToLimit(body, bodyLimit), tagText].filter(Boolean).join(" ");
    }

    return {
      text: candidate,
      note: conditions.replyContentSpec
        ? "このツイートは「" + conditions.replyContentSpec + "」という指定があります。内容が合っているか投稿前に確認してください。"
        : null,
    };
  }

  // ---- 画面1: 解析 ----
  var tweetTextInput = document.getElementById("tweet-text-input");
  var companyNameInput = document.getElementById("company-name-input");
  var accountNameInput = document.getElementById("account-name-input");
  var urlInput = document.getElementById("tweet-url-input");
  var analyzeBtn = document.getElementById("analyze-btn");
  var analyzeError = document.getElementById("analyze-error");

  analyzeBtn.addEventListener("click", function () {
    var text = tweetTextInput.value.trim();
    analyzeError.textContent = "";
    if (!text) {
      analyzeError.textContent = "ツイート本文を貼り付けてください。";
      return;
    }

    var hashtags = extractHashtags(text);
    var conditions = extractConditions(text, hashtags, companyNameInput.value.trim());
    var reply = generateReply(conditions);

    current = {
      tweetText: text,
      tweetId: extractTweetId(urlInput.value.trim()),
      authorUsername: accountNameInput.value.trim() || null,
      companyName: conditions.companyName,
      productName: conditions.productName,
      hashtags: conditions.hashtags,
      followRequired: conditions.followRequired,
      repostRequired: conditions.repostRequired,
      hashtagRequired: conditions.hashtagRequired,
      replyRequired: conditions.replyRequired,
      replyContentSpec: conditions.replyContentSpec,
      replyText: reply.text,
      replyNote: reply.note,
      followDone: false,
      repostDone: false,
      replyDone: false,
    };

    renderConditions();
    enableTab("conditions");
    enableTab("reply");
    enableTab("action");
    showScreen("conditions");
  });

  // ---- 画面2: 条件表示 ----
  function conditionRowHtml(label, required) {
    var cls = required ? "condition-required" : "condition-optional";
    var text = required ? "必須" : "不要";
    return '<div class="condition-row"><span>' + label + "</span><span class=\"" + cls + "\">" + text + "</span></div>";
  }

  function renderConditions() {
    var el = document.getElementById("conditions-content");
    if (!current) return;
    var html = "";
    html += '<div class="section-label">企業名 / 商品名</div>';
    html += "<p>" + escapeHtml(current.companyName || "(不明)") + " / " + escapeHtml(current.productName || "(不明)") + "</p>";
    html += '<div class="section-label">応募条件</div>';
    html += conditionRowHtml("フォロー", current.followRequired);
    html += conditionRowHtml("リポスト", current.repostRequired);
    html += conditionRowHtml("ハッシュタグ", current.hashtagRequired);
    html += conditionRowHtml("リプライ", current.replyRequired);
    if (current.hashtags && current.hashtags.length) {
      html += "<p>タグ: " + current.hashtags.map(function (h) { return "#" + escapeHtml(h); }).join(" ") + "</p>";
    }
    if (current.replyContentSpec) {
      html += '<p class="note-text">指定内容: ' + escapeHtml(current.replyContentSpec) + "</p>";
    }
    html += '<div class="section-label">元ツイート本文</div>';
    html += '<div class="tweet-text-box">' + escapeHtml(current.tweetText) + "</div>";
    el.innerHTML = html;
  }

  document.getElementById("to-reply-btn").addEventListener("click", function () {
    renderReplyScreen();
    showScreen("reply");
  });

  // ---- 画面3: リプライ編集 ----
  var replyTextarea = document.getElementById("reply-textarea");
  var replyCounter = document.getElementById("reply-counter");
  var replyNote = document.getElementById("reply-note");

  function renderReplyScreen() {
    if (!current) return;
    replyTextarea.value = current.replyText;
    replyNote.textContent = current.replyNote || "";
    updateCounter();
  }

  function updateCounter() {
    replyCounter.textContent = String(130 - replyTextarea.value.length);
  }

  replyTextarea.addEventListener("input", updateCounter);

  document.getElementById("to-action-btn").addEventListener("click", function () {
    var text = replyTextarea.value.trim();
    if (!text) {
      alert("リプライ文を入力してください。");
      return;
    }
    if (text.length > 130) {
      alert("130文字を超えています。");
      return;
    }
    current.replyText = text;
    renderActionScreen();
    showScreen("action");
  });

  // ---- 画面4: 応募操作 (Intent URLを開くのみ。自動投稿はしない) ----
  function buildIntentUrls(entry) {
    var intents = {};
    if (entry.authorUsername) {
      intents.follow = "https://twitter.com/intent/follow?screen_name=" + encodeURIComponent(entry.authorUsername);
    }
    if (entry.tweetId) {
      intents.repost = "https://twitter.com/intent/retweet?tweet_id=" + encodeURIComponent(entry.tweetId);
      intents.reply = "https://twitter.com/intent/tweet?in_reply_to=" + encodeURIComponent(entry.tweetId) +
        "&text=" + encodeURIComponent(entry.replyText || "");
    }
    return intents;
  }

  function renderActionScreen() {
    if (!current) return;
    var intents = buildIntentUrls(current);
    Array.prototype.slice.call(document.querySelectorAll(".action-block")).forEach(function (block) {
      var action = block.dataset.action;
      var link = block.querySelector(".intent-link");
      var doneBtn = block.querySelector(".done-btn");
      if (intents[action]) {
        link.href = intents[action];
        link.classList.remove("hidden");
        link.classList.remove("is-disabled");
      } else {
        link.removeAttribute("href");
        link.classList.add("is-disabled");
      }
      var isDone = current[action + "Done"];
      doneBtn.classList.toggle("is-done", !!isDone);
      doneBtn.textContent = isDone ? "完了済み" : "完了にする";
    });
  }

  Array.prototype.slice.call(document.querySelectorAll(".done-btn")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!current) return;
      var action = btn.dataset.action;
      current[action + "Done"] = true;
      renderActionScreen();
    });
  });

  // 初期表示
  showScreen("analyze");
})();

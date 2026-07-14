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

  // ---- 画面1: 解析 ----
  var urlInput = document.getElementById("tweet-url-input");
  var analyzeBtn = document.getElementById("analyze-btn");
  var analyzeError = document.getElementById("analyze-error");
  var analyzeLoading = document.getElementById("analyze-loading");

  analyzeBtn.addEventListener("click", function () {
    var url = urlInput.value.trim();
    analyzeError.textContent = "";
    if (!url) {
      analyzeError.textContent = "ツイートURLを入力してください。";
      return;
    }

    analyzeBtn.disabled = true;
    analyzeLoading.classList.remove("hidden");

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.error || "解析に失敗しました。");
          return body;
        });
      })
      .then(function (result) {
        current = {
          tweetUrl: url,
          tweetId: result.tweetData.tweetId,
          tweetText: result.tweetData.text,
          companyName: result.conditions.companyName,
          authorUsername: result.tweetData.author ? result.tweetData.author.username : null,
          productName: result.conditions.productName,
          hashtags: result.conditions.hashtags,
          followRequired: result.conditions.followRequired,
          repostRequired: result.conditions.repostRequired,
          hashtagRequired: result.conditions.hashtagRequired,
          replyRequired: result.conditions.replyRequired,
          replyContentSpec: result.conditions.replyContentSpec,
          replyText: result.reply.text,
          replyNote: result.reply.note,
          followDone: false,
          repostDone: false,
          replyDone: false,
        };
        renderConditions();
        enableTab("conditions");
        enableTab("reply");
        enableTab("action");
        showScreen("conditions");
      })
      .catch(function (err) {
        analyzeError.textContent = err.message;
      })
      .finally(function () {
        analyzeBtn.disabled = false;
        analyzeLoading.classList.add("hidden");
      });
  });

  // ---- 画面2: 条件表示 ----
  function conditionRowHtml(label, required) {
    var cls = required ? "condition-required" : "condition-optional";
    var text = required ? "必須" : "不要";
    return '<div class="condition-row"><span>' + label + "</span><span class=\"" + cls + "\">" + text + "</span></div>";
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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

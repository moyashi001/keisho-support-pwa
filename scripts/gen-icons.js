// シンプルな単色+文字アイコンを生成する (外部デザインツールが使えない環境向けの簡易プレースホルダー)
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const BG = { r: 0x3b, g: 0x6f, b: 0xe0 }; // theme_color と合わせる
const OUT_DIR = path.join(__dirname, "..", "icons");

function drawFilledRoundedSquare(png, size, radius, color) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const inCorner = isOutsideRoundedRect(x, y, size, radius);
      if (inCorner) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      } else {
        png.data[idx] = color.r;
        png.data[idx + 1] = color.g;
        png.data[idx + 2] = color.b;
        png.data[idx + 3] = 255;
      }
    }
  }
}

function isOutsideRoundedRect(x, y, size, r) {
  const corners = [
    [r, r],
    [size - r, r],
    [r, size - r],
    [size - r, size - r],
  ];
  for (const [cx, cy] of corners) {
    const inCornerBox =
      (x < r && cy === r && y < r) ||
      (x < r && cy === size - r && y > size - r) ||
      (x > size - r && cy === r && y < r) ||
      (x > size - r && cy === size - r && y > size - r);
  }
  // 角丸判定 (4隅のみ距離チェック、それ以外は矩形内)
  if (x < r && y < r) return dist(x, y, r, r) > r;
  if (x > size - r && y < r) return dist(x, y, size - r, r) > r;
  if (x < r && y > size - r) return dist(x, y, r, size - r) > r;
  if (x > size - r && y > size - r) return dist(x, y, size - r, size - r) > r;
  return false;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// 中央に「懸」の代わりのシンプルなギフトボックス風マークを白線で描く
function drawMark(png, size, color) {
  const cx = size / 2;
  const cy = size / 2;
  const boxSize = size * 0.4;
  const half = boxSize / 2;
  const thickness = Math.max(2, Math.floor(size * 0.035));

  function setPixel(x, y) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (size * Math.floor(y) + Math.floor(x)) << 2;
    png.data[idx] = color.r;
    png.data[idx + 1] = color.g;
    png.data[idx + 2] = color.b;
    png.data[idx + 3] = 255;
  }

  function strokeRect(x0, y0, x1, y1) {
    for (let t = 0; t < thickness; t++) {
      for (let x = x0; x <= x1; x++) {
        setPixel(x, y0 + t);
        setPixel(x, y1 - t);
      }
      for (let y = y0; y <= y1; y++) {
        setPixel(x0 + t, y);
        setPixel(x1 - t, y);
      }
    }
  }

  // 箱の本体
  strokeRect(cx - half, cy - half * 0.4, cx + half, cy + half);
  // リボン(縦)
  for (let y = cy - half * 0.4; y <= cy + half; y++) {
    for (let t = 0; t < thickness; t++) {
      setPixel(cx - thickness / 2 + t, y);
    }
  }
  // ふた
  strokeRect(cx - half * 1.15, cy - half * 0.75, cx + half * 1.15, cy - half * 0.4);
}

function generate(size, { maskablePadding = 0 } = {}) {
  const png = new PNG({ width: size, height: size });
  const radius = maskablePadding > 0 ? 0 : Math.floor(size * 0.18);
  drawFilledRoundedSquare(png, size, radius, BG);
  const white = { r: 255, g: 255, b: 255 };
  drawMark(png, size, white);
  return png;
}

function writePng(png, filename) {
  const outPath = path.join(OUT_DIR, filename);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outPath, buffer);
  console.log("generated:", outPath);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
writePng(generate(192), "icon-192.png");
writePng(generate(512), "icon-512.png");
writePng(generate(512, { maskablePadding: 1 }), "icon-maskable-512.png");
writePng(generate(180), "apple-touch-icon.png");

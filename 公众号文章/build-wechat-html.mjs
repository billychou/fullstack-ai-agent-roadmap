// 将公众号 Markdown 源稿转换为「微信编辑器可用」的内联样式 HTML
// 用法: node build-wechat-html.mjs <文章.md> [输出.html]
// 使用: 浏览器打开输出文件 → 全选 → 复制 → 粘贴到公众号编辑器（图片若未随粘贴上传，按图注从 static/ 拖入即可）
import fs from 'node:fs';
import path from 'node:path';

const mdPath = path.resolve(process.argv[2]);
const outPath = process.argv[3] ? path.resolve(process.argv[3]) : mdPath.replace(/\.md$/, '.html');
const base = path.dirname(mdPath);
let lines = fs.readFileSync(mdPath, 'utf8').split('\n');

// 去掉 frontmatter
if (lines[0]?.trim() === '---') {
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end > 0) lines = lines.slice(end + 1);
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#7c3aed;font-weight:bold;">$1</strong>')
  .replace(/`([^`]+)`/g, '<code style="background:#f3f0ff;color:#5b21b6;font-size:90%;padding:2px 6px;border-radius:4px;font-family:Menlo,Consolas,monospace;">$1</code>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a style="color:#2563eb;text-decoration:underline;">$1</a>');

const P = 'margin:20px 0;font-size:16px;line-height:1.85;color:#3f3f3f;letter-spacing:0.5px;text-align:justify;';
const out = [];
let list = null; // 'ul' | 'ol'
const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

for (const raw of lines) {
  const line = raw.trimEnd();
  const t = line.trim();
  if (!t) { closeList(); continue; }
  if (/^---+$/.test(t)) { closeList(); out.push('<hr style="border:none;border-top:1px dashed #d8d3f0;margin:30px auto;">'); continue; }
  if (t.startsWith('# ')) { closeList(); out.push(`<h1 style="font-size:22px;font-weight:800;color:#1e1b4b;line-height:1.5;margin:8px 0 24px;text-align:center;">${inline(t.slice(2))}</h1>`); continue; }
  if (t.startsWith('## ')) { closeList(); out.push(`<h2 style="font-size:18px;font-weight:800;color:#1e1b4b;margin:36px 0 16px;padding-left:12px;border-left:4px solid #7c3aed;line-height:1.4;">${inline(t.slice(3))}</h2>`); continue; }
  if (t.startsWith('> ')) { closeList(); out.push(`<blockquote style="margin:22px 0;padding:14px 18px;background:#f7f4ff;border-left:4px solid #7c3aed;border-radius:0 10px 10px 0;color:#5b21b6;font-size:15.5px;line-height:1.8;">${inline(t.slice(2))}</blockquote>`); continue; }
  const img = t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (img) { closeList();
    const src = /^https?:/.test(img[2]) ? img[2] : 'file://' + path.resolve(base, img[2]);
    out.push(`<figure style="margin:26px 0;text-align:center;"><img src="${src}" alt="${esc(img[1])}" style="width:100%;border-radius:10px;display:block;margin:0 auto;box-shadow:0 2px 12px rgba(30,27,75,.08);"><figcaption style="margin-top:10px;font-size:13px;color:#9ca3af;letter-spacing:1px;">${esc(img[1])}</figcaption></figure>`);
    continue; }
  const ul = t.match(/^[-*] (.+)$/);
  if (ul) { if (list !== 'ul') { closeList(); out.push('<ul style="margin:18px 0;padding-left:1.6em;list-style:disc;">'); list = 'ul'; }
    out.push(`<li style="margin:8px 0;font-size:16px;line-height:1.8;color:#3f3f3f;">${inline(ul[1])}</li>`); continue; }
  const ol = t.match(/^\d+[.、] (.+)$/);
  if (ol) { if (list !== 'ol') { closeList(); out.push('<ol style="margin:18px 0;padding-left:1.6em;">'); list = 'ol'; }
    out.push(`<li style="margin:8px 0;font-size:16px;line-height:1.8;color:#3f3f3f;">${inline(ol[1])}</li>`); continue; }
  closeList();
  out.push(`<p style="${P}">${inline(t)}</p>`);
}
closeList();

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(path.basename(mdPath, '.md'))}</title>
</head>
<body style="margin:0;background:#f6f6f6;">
<section style="max-width:677px;margin:0 auto;background:#fff;padding:36px 22px 48px;font-family:-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;">
${out.join('\n')}
</section>
</body>
</html>
`;
fs.writeFileSync(outPath, html);
console.log('✓', outPath);

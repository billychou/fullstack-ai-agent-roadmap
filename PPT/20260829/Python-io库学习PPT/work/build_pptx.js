const { PptxGenJS, path, SLIDE_W, SLIDE_H, imgOpts, gradientMaskB64 } = require("./build_header.js");

const C = { canvas: "0A0A0F", ink: "FAFAFA", accent: "F59E0B", support: "71717A", card: "1A1A24", card2: "12121A", edge: "2E2E38" };
const FONTS = { display: "冬青黑体简体中文", body: "冬青黑体简体中文", mono: "Courier New" };
const RADIUS = 0.11;
const RADIUS_CARD = 0.17;

const BG = path.resolve(__dirname, "../images/ai_bg_content.png");

// ═══ 通用 helper ═══
const deck = new PptxGenJS();
deck.layout = "LAYOUT_WIDE";
deck.title = `Python io 库深度解析`;

const glow = () => ({ type: "outer", blur: 28, offset: 0, angle: 0, color: C.accent, opacity: 0.22 });
const elev = () => ({ type: "outer", blur: 12, offset: 4, angle: 135, color: "000000", opacity: 0.35 });

function newPage() {
  const s = deck.addSlide();
  s.background = { path: BG };
  return s;
}

// 氛围光球（3 个同心椭圆模拟柔光）
function orb(s, cx, cy, r) {
  const layers = [[1.0, 97], [0.72, 95], [0.45, 92]];
  for (const [k, tr] of layers) {
    s.addShape(deck.shapes.OVAL, {
      x: cx - r * k, y: cy - r * k, w: 2 * r * k, h: 2 * r * k,
      fill: { color: C.accent, transparency: tr }, line: { type: "none" },
    });
  }
}

// 玻璃卡片
function glass(s, x, y, w, h, opts = {}) {
  s.addShape(deck.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: opts.radius || RADIUS_CARD,
    fill: { color: opts.solid ? C.card : C.card, transparency: opts.solid ? 0 : 38 },
    line: { color: opts.line || C.edge, width: 1 },
    shadow: opts.noShadow ? undefined : elev(),
  });
}

// 页标题（mono 小标签 + 大标题）
function pgTitle(s, label, title) {
  s.addText(label, { x: 0.62, y: 0.42, w: 9, h: 0.3, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.accent, charSpacing: 2 });
  s.addText(title, { x: 0.6, y: 0.74, w: 12.1, h: 0.62, margin: 0, fontFace: FONTS.display, fontSize: 27, bold: true, color: C.ink });
}

// 原生琥珀圆点 bullet 配置
const BUL = { code: "25CF", color: C.accent };

// ═══ P1 封面 ═══
{
  const s = newPage();
  orb(s, 6.66, 2.9, 3.4);
  s.addText(`PYTHON STANDARD LIBRARY · IO MODULE`, { x: 2.4, y: 2.06, w: 8.53, h: 0.34, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 13, color: C.accent, charSpacing: 3 });
  s.addText(`Python io 库深度解析`, { x: 1.2, y: 2.56, w: 10.93, h: 1.25, margin: 0, align: "center", fontFace: FONTS.display, fontSize: 58, bold: true, color: C.ink, charSpacing: 1 });
  s.addShape(deck.shapes.RECTANGLE, { x: 6.16, y: 3.98, w: 1.0, h: 0.035, fill: { color: C.accent }, line: { type: "none" } });
  s.addText(`从底层原理到具体应用`, { x: 2.4, y: 4.22, w: 8.53, h: 0.5, margin: 0, align: "center", fontFace: FONTS.body, fontSize: 22, color: C.support });
  s.addText(`三类 I/O · 缓冲机制 · 内存流 · 性能实测`, { x: 2.4, y: 4.86, w: 8.53, h: 0.4, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 13, color: C.support, charSpacing: 1 });
}

// ═══ P2 目录 ═══
{
  const s = newPage();
  s.addText(`CONTENTS`, { x: 0.62, y: 1.3, w: 4, h: 0.3, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.accent, charSpacing: 3 });
  s.addText(`目录`, { x: 0.6, y: 1.66, w: 4, h: 0.9, margin: 0, fontFace: FONTS.display, fontSize: 40, bold: true, color: C.ink });
  s.addText(`四章学习路线：从认识模块、拆解原理，到实战应用与性能调优。`, { x: 0.62, y: 2.7, w: 3.6, h: 1.6, margin: 0, fontFace: FONTS.body, fontSize: 14, color: C.support, lineSpacingMultiple: 1.5 });
  s.addShape(deck.shapes.RECTANGLE, { x: 0.62, y: 2.56, w: 0.9, h: 0.035, fill: { color: C.accent }, line: { type: "none" } });

  const items = [
    ["01", `认识 io 模块`, `统一流处理入口的定位，三类 I/O 的职责边界`],
    ["02", `底层原理`, `IOBase 类层次、缓冲机制、编码与换行转换`],
    ["03", `应用实战`, `文件读写、StringIO/BytesIO 内存流、标准流重定向`],
    ["04", `性能与最佳实践`, `实测性能对比、大文件处理、常见陷阱规避`],
  ];
  const x0 = 5.0, w0 = 7.7;
  items.forEach((it, i) => {
    const y = 1.3 + i * 1.42;
    s.addText(it[0], { x: x0, y: y, w: 1.15, h: 1.1, margin: 0, fontFace: FONTS.mono, fontSize: 34, bold: true, color: C.accent, valign: "middle" });
    s.addText(it[1], { x: x0 + 1.35, y: y + 0.08, w: w0 - 1.35, h: 0.5, margin: 0, fontFace: FONTS.display, fontSize: 21, bold: true, color: C.ink });
    s.addText(it[2], { x: x0 + 1.35, y: y + 0.6, w: w0 - 1.35, h: 0.42, margin: 0, fontFace: FONTS.body, fontSize: 14, color: C.support });
    if (i < 3) s.addShape(deck.shapes.LINE, { x: x0, y: y + 1.24, w: w0, h: 0, line: { color: C.edge, width: 1 } });
  });
}

// ═══ P3 章节页 · 第一章 ═══
{
  const s = newPage();
  orb(s, 6.66, 3.4, 3.0);
  s.addText(`CHAPTER 01`, { x: 2.4, y: 2.28, w: 8.53, h: 0.34, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 13, color: C.accent, charSpacing: 3 });
  s.addText(`认识 io 模块`, { x: 1.6, y: 2.72, w: 10.13, h: 1.05, margin: 0, align: "center", fontFace: FONTS.display, fontSize: 48, bold: true, color: C.ink });
  s.addShape(deck.shapes.RECTANGLE, { x: 6.06, y: 3.96, w: 1.2, h: 0.035, fill: { color: C.accent }, line: { type: "none" } });
  s.addText([
    { text: `io 模块在 Python 中扮演什么角色？`, options: { breakLine: true } },
    { text: `三类 I/O 各自处理什么数据？`, options: { breakLine: true } },
    { text: `为什么需要统一的流抽象？`, options: {} },
  ], { x: 3.6, y: 4.3, w: 6.13, h: 1.5, margin: 0, align: "center", fontFace: FONTS.body, fontSize: 15, color: C.support, lineSpacingMultiple: 1.6 });
}

// ═══ P4 io 是统一流处理入口 ═══
{
  const s = newPage();
  pgTitle(s, `OVERVIEW`, `io 是 Python 的统一流处理入口`);

  s.addText([
    { text: `核心地位：`, options: { bold: true, color: C.ink, breakLine: true } },
    { text: `io 模块是 Python 处理各类流（stream）的核心设施，内建函数 open() 本身就定义在 io 模块中——日常文件操作的底层实现完全由 io 提供。`, options: { color: C.support, breakLine: true, bullet: false } },
    { text: `三类分工：`, options: { bold: true, color: C.ink, breakLine: true } },
    { text: `文本 I/O 处理 str，负责编码解码与换行转换；二进制 I/O 处理 bytes，提供缓冲优化；原始 I/O 直接对接操作系统文件描述符，不带任何缓冲。`, options: { color: C.support, breakLine: true } },
    { text: `统一接口：`, options: { bold: true, color: C.ink, breakLine: true } },
    { text: `无论磁盘文件、内存缓冲区还是标准输入输出，所有流对象都遵循同一套接口契约（read / write / seek / close / flush），代码可在不同流之间无缝切换。`, options: { color: C.support } },
  ], { x: 0.62, y: 1.7, w: 6.5, h: 5.1, margin: 0, fontFace: FONTS.body, fontSize: 15, valign: "middle", lineSpacingMultiple: 1.4, paraSpaceAfter: 10 });

  // 右侧：三类流纵向卡片
  const cx = 7.9, cw = 4.8;
  const tiers = [
    [`文本流`, `str · 编码与换行`],
    [`二进制流`, `bytes · 缓冲优化`],
    [`原始流`, `系统调用 · 直通内核`],
  ];
  tiers.forEach((t, i) => {
    const y = 1.9 + i * 1.72;
    glass(s, cx, y, cw, 1.18, { line: i === 0 ? C.accent : C.edge, noShadow: i !== 0 });
    s.addText(t[0], { x: cx + 0.35, y: y + 0.18, w: cw - 0.7, h: 0.44, margin: 0, fontFace: FONTS.display, fontSize: 18, bold: true, color: C.ink });
    s.addText(t[1], { x: cx + 0.35, y: y + 0.64, w: cw - 0.7, h: 0.36, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: i === 0 ? C.accent : C.support });
    if (i < 2) {
      s.addShape(deck.shapes.LINE, { x: cx + cw / 2, y: y + 1.18, w: 0, h: 0.34, line: { color: C.support, width: 1 } });
      s.addShape(deck.shapes.OVAL, { x: cx + cw / 2 - 0.05, y: y + 1.48, w: 0.1, h: 0.1, fill: { color: C.support }, line: { type: "none" } });
    }
  });
}

const bul = () => ({ code: "25CF", color: C.accent });

// ═══ P5 三类 I/O 与典型代表 ═══
{
  const s = newPage();
  pgTitle(s, `THREE CATEGORIES`, `三类 I/O 与典型代表`);
  const cols = [
    [`TEXT I/O`, `文本流 · str`, [`TextIOWrapper`, `StringIO`], `在字节流之上完成编码 / 解码与换行符标准化转换，是日常文件读写的最外层。`],
    [`BUFFERED I/O`, `二进制缓冲流 · bytes`, [`BufferedReader`, `BufferedWriter`, `BufferedRandom`, `BytesIO`], `在原始 I/O 之上加内存缓冲区，把零散小读写合并为批量操作，减少系统调用开销。`],
    [`RAW I/O`, `原始流 · bytes`, [`FileIO`], `直接封装操作系统文件描述符，每次读写都对应一次系统调用，通常作为缓冲层的底层依赖。`],
  ];
  cols.forEach((c, i) => {
    const x = 0.8 + i * 4.03, w = 3.83;
    glass(s, x, 1.85, w, 4.75);
    s.addText(c[0], { x: x + 0.3, y: 2.12, w: w - 0.6, h: 0.3, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.accent, charSpacing: 2 });
    s.addText(c[1], { x: x + 0.3, y: 2.48, w: w - 0.6, h: 0.5, margin: 0, fontFace: FONTS.display, fontSize: 19, bold: true, color: C.ink });
    s.addShape(deck.shapes.LINE, { x: x + 0.3, y: 3.12, w: w - 0.6, h: 0, line: { color: C.edge, width: 1 } });
    s.addText(c[2].map((t, j) => ({ text: t, options: { breakLine: j < c[2].length - 1 } })),
      { x: x + 0.3, y: 3.3, w: w - 0.6, h: 1.5, margin: 0, fontFace: FONTS.mono, fontSize: 13, color: C.ink, paraSpaceAfter: 6 });
    s.addText(c[3], { x: x + 0.3, y: 4.95, w: w - 0.6, h: 1.5, margin: 0, fontFace: FONTS.body, fontSize: 13, color: C.support, lineSpacingMultiple: 1.4, valign: "top" });
  });
}

// ═══ P6 章节页 · 第二章 ═══
{
  const s = newPage();
  orb(s, 6.66, 3.4, 3.0);
  s.addText(`CHAPTER 02`, { x: 2.4, y: 2.28, w: 8.53, h: 0.34, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 13, color: C.accent, charSpacing: 3 });
  s.addText(`底层原理`, { x: 1.6, y: 2.72, w: 10.13, h: 1.05, margin: 0, align: "center", fontFace: FONTS.display, fontSize: 48, bold: true, color: C.ink });
  s.addShape(deck.shapes.RECTANGLE, { x: 6.06, y: 3.96, w: 1.2, h: 0.035, fill: { color: C.accent }, line: { type: "none" } });
  s.addText(`把镜头拉近到源码层面：类层次如何组织三类 I/O，缓冲层如何用内存换性能，TextIOWrapper 如何在 str 与 bytes 之间做翻译。`, { x: 3.0, y: 4.3, w: 7.33, h: 1.2, margin: 0, align: "center", fontFace: FONTS.body, fontSize: 15, color: C.support, lineSpacingMultiple: 1.6 });
}

// ═══ P7 类层次全景 ═══
{
  const s = newPage();
  pgTitle(s, `CLASS HIERARCHY`, `类层次全景 · IOBase 家族`);

  // 根节点
  glass(s, 5.37, 1.66, 2.6, 0.72, { line: C.accent, radius: RADIUS, noShadow: true });
  s.addText(`IOBase · 根基类`, { x: 5.37, y: 1.66, w: 2.6, h: 0.72, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 15, bold: true, color: C.ink });
  // 主干连线
  s.addShape(deck.shapes.LINE, { x: 6.665, y: 2.38, w: 0, h: 0.46, line: { color: C.support, width: 1 } });
  s.addShape(deck.shapes.LINE, { x: 2.5, y: 2.84, w: 8.33, h: 0, line: { color: C.support, width: 1 } });
  [2.5, 6.665, 10.83].forEach(cx => s.addShape(deck.shapes.LINE, { x: cx, y: 2.84, w: 0, h: 0.34, line: { color: C.support, width: 1 } }));

  // 三条支线
  const branches = [
    [0.9, `RawIOBase`, `原始字节 · 无缓冲`],
    [5.07, `BufferedIOBase`, `二进制 · 带缓冲`],
    [9.23, `TextIOBase`, `文本 · str`],
  ];
  branches.forEach(b => {
    glass(s, b[0], 3.18, 3.2, 0.68, { radius: RADIUS, noShadow: true });
    s.addText(b[1], { x: b[0], y: 3.22, w: 3.2, h: 0.34, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 14, bold: true, color: C.ink });
    s.addText(b[2], { x: b[0], y: 3.54, w: 3.2, h: 0.28, margin: 0, align: "center", fontFace: FONTS.body, fontSize: 12, color: C.accent });
  });

  // 支线到代表类的连线
  s.addShape(deck.shapes.LINE, { x: 2.5, y: 3.86, w: 0, h: 0.32, line: { color: C.support, width: 1 } });
  s.addShape(deck.shapes.LINE, { x: 6.665, y: 3.86, w: 0, h: 0.32, line: { color: C.support, width: 1 } });
  s.addShape(deck.shapes.LINE, { x: 10.83, y: 3.86, w: 0, h: 0.32, line: { color: C.support, width: 1 } });

  // 代表类
  glass(s, 1.4, 4.18, 2.2, 0.56, { radius: RADIUS, noShadow: true });
  s.addText(`FileIO`, { x: 1.4, y: 4.18, w: 2.2, h: 0.56, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 13, color: C.ink });

  const buffered = [[4.82, 4.18, `BufferedReader`], [6.72, 4.18, `BufferedWriter`], [4.82, 4.88, `BufferedRandom`], [6.72, 4.88, `BytesIO`]];
  buffered.forEach(b => {
    glass(s, b[0], b[1], 1.76, 0.56, { radius: RADIUS, noShadow: true });
    s.addText(b[2], { x: b[0], y: b[1], w: 1.76, h: 0.56, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 12, color: C.ink });
  });

  const texts = [[9.73, 4.18, `TextIOWrapper`], [9.73, 4.88, `StringIO`]];
  texts.forEach(b => {
    glass(s, b[0], b[1], 2.2, 0.56, { radius: RADIUS, noShadow: true });
    s.addText(b[2], { x: b[0], y: b[1], w: 2.2, h: 0.56, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 13, color: C.ink });
  });

  s.addShape(deck.shapes.LINE, { x: 0.8, y: 5.9, w: 11.73, h: 0, line: { color: C.edge, width: 1 } });
  s.addText([
    { text: `open() 按模式自动返回对应层的对象：`, options: { bold: true, color: C.ink, breakLine: true } },
    { text: `'r' → TextIOWrapper(BufferedReader(FileIO))　　'rb' → BufferedReader(FileIO)　　'rb' + buffering=0 → 裸 FileIO`, options: { color: C.support } },
  ], { x: 1.2, y: 6.1, w: 10.93, h: 1.0, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 13, lineSpacingMultiple: 1.5 });
}

// ═══ P8 为什么需要缓冲 ═══
{
  const s = newPage();
  pgTitle(s, `BUFFERING`, `为什么需要缓冲`);

  s.addText(`一滴一滴搬 vs 一桶一桶搬`, { x: 0.62, y: 1.72, w: 6.5, h: 0.6, margin: 0, fontFace: FONTS.display, fontSize: 24, bold: true, color: C.accent });
  s.addText([
    { text: `每次 read() / write() 最终都要穿越用户态进入内核态，触发一次系统调用——上下文切换的开销远大于内存拷贝本身。`, options: { bullet: bul(), breakLine: true } },
    { text: `逐字节读写 1MB 文件 = 发起一百万次系统调用，绝大部分时间花在切换而非数据传输上。`, options: { bullet: bul(), breakLine: true } },
    { text: `缓冲层在用户态维护一块内存（默认 128KB）：写入先攒进去，满了或 flush 才一次性交给内核；读取一次拉回一整块，后续请求直接从内存取。`, options: { bullet: bul(), breakLine: true } },
    { text: `实测印证：逐字节读 1MB，FileIO 耗时 1.06 秒，加一层 BufferedReader 后仅 0.036 秒，提速近 30 倍。`, options: { bullet: bul() } },
  ], { x: 0.62, y: 2.5, w: 6.5, h: 4.3, margin: 0, fontFace: FONTS.body, fontSize: 15, color: "D4D4D8", lineSpacingMultiple: 1.35, paraSpaceAfter: 12, valign: "top" });

  // 右侧对比示意
  glass(s, 7.7, 1.72, 5.0, 5.1);
  s.addText(`WITHOUT BUFFERING`, { x: 8.0, y: 1.95, w: 4.4, h: 0.3, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.support, charSpacing: 2 });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    s.addShape(deck.shapes.RIGHT_ARROW, { x: 8.15 + c * 0.82, y: 2.42 + r * 0.42, w: 0.56, h: 0.2, fill: { color: C.support }, line: { type: "none" } });
  }
  s.addText(`逐字节 · 百万次系统调用`, { x: 8.0, y: 3.42, w: 4.4, h: 0.35, margin: 0, fontFace: FONTS.body, fontSize: 13, color: C.support });
  s.addShape(deck.shapes.LINE, { x: 8.0, y: 3.98, w: 4.4, h: 0, line: { color: C.edge, width: 1 } });
  s.addText(`WITH BUFFERING`, { x: 8.0, y: 4.2, w: 4.4, h: 0.3, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.accent, charSpacing: 2 });
  s.addShape(deck.shapes.RIGHT_ARROW, { x: 8.15, y: 4.68, w: 4.1, h: 0.62, fill: { color: C.accent }, line: { type: "none" }, shadow: { type: "outer", blur: 28, offset: 0, angle: 0, color: C.accent, opacity: 0.22 } });
  s.addText(`批量 · 只需少量调用`, { x: 8.0, y: 5.5, w: 4.4, h: 0.35, margin: 0, fontFace: FONTS.body, fontSize: 13, color: C.ink });
  s.addText(`read 1MB byte-by-byte：1.06s → 0.036s`, { x: 8.0, y: 6.05, w: 4.4, h: 0.4, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.support });
}

// ═══ P9 三种缓冲模式与刷新时机 ═══
{
  const s = newPage();
  pgTitle(s, `BUFFERING MODES`, `三种缓冲模式与刷新时机`);
  s.addText(`open() 的 buffering 参数`, { x: 0.62, y: 1.58, w: 6, h: 0.3, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.accent, charSpacing: 1 });

  const head = (t) => ({ text: t, options: { bold: true, color: C.accent, fill: { color: C.card } } });
  const cell = (t, first, i) => ({ text: t, options: { color: first ? C.ink : "D4D4D8", bold: !!first, fill: { color: i % 2 ? C.card2 : "101018" } } });
  const data = [
    [`0`, `无缓冲`, `每次 write 立即触发系统调用`, `串口设备、实时管道`],
    [`1`, `行缓冲`, `遇到换行符就刷新（仅文本模式）`, `终端交互、日志实时输出`],
    [`>1`, `全缓冲（指定大小）`, `攒满指定字节数后刷新`, `大文件批量处理`],
    [`-1（默认）`, `全缓冲（128KB）`, `使用 io.DEFAULT_BUFFER_SIZE`, `绝大多数文件操作`],
  ];
  const rows = [[head(`buffering 取值`), head(`模式`), head(`行为`), head(`典型场景`)]];
  data.forEach((d, i) => rows.push([cell(d[0], true, i), cell(d[1], false, i), cell(d[2], false, i), cell(d[3], false, i)]));
  s.addTable(rows, { x: 0.62, y: 1.94, w: 12.1, colW: [1.9, 2.5, 4.5, 3.2], fontSize: 13, fontFace: FONTS.body, valign: "middle", border: { pt: 1, color: C.edge }, rowH: [0.5, 0.52, 0.52, 0.52, 0.52] });

  // 刷新时机流程
  s.addText(`数据何时真正落盘 · 四个刷新时机`, { x: 0.62, y: 4.62, w: 8, h: 0.3, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.accent, charSpacing: 1 });
  const boxY = 5.15, boxH = 0.66;
  glass(s, 0.8, boxY, 1.6, boxH, { radius: RADIUS, noShadow: true });
  s.addText(`write()`, { x: 0.8, y: boxY, w: 1.6, h: boxH, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 13, color: C.ink });
  s.addShape(deck.shapes.LINE, { x: 2.5, y: boxY + boxH / 2, w: 0.5, h: 0, line: { color: C.support, width: 1, endArrowType: "arrow" } });
  glass(s, 3.1, boxY, 1.9, boxH, { radius: RADIUS, line: C.accent, noShadow: true });
  s.addText(`用户态缓冲区`, { x: 3.1, y: boxY, w: 1.9, h: boxH, margin: 0, align: "center", valign: "middle", fontFace: FONTS.body, fontSize: 13, bold: true, color: C.ink });
  s.addShape(deck.shapes.LINE, { x: 5.1, y: boxY + boxH / 2, w: 0.5, h: 0, line: { color: C.support, width: 1, endArrowType: "arrow" } });

  const triggers = [[`缓冲区写满`, 5.7, 4.92], [`close() 关闭`, 7.55, 4.92], [`行缓冲遇换行`, 5.7, 5.62], [`手动 flush()`, 7.55, 5.62]];
  triggers.forEach(t => {
    glass(s, t[1], t[2], 1.75, 0.52, { radius: 0.26, noShadow: true });
    s.addText(t[0], { x: t[1], y: t[2], w: 1.75, h: 0.52, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 12, color: C.ink });
  });
  s.addShape(deck.shapes.LINE, { x: 9.4, y: boxY + boxH / 2, w: 0.5, h: 0, line: { color: C.support, width: 1, endArrowType: "arrow" } });
  glass(s, 10.0, boxY, 2.0, boxH, { radius: RADIUS, noShadow: true });
  s.addText(`磁盘存储`, { x: 10.0, y: boxY, w: 2.0, h: boxH, margin: 0, align: "center", valign: "middle", fontFace: FONTS.body, fontSize: 13, bold: true, color: C.ink });

  s.addText(`注意：flush() ≠ 落盘——它只刷到操作系统页缓存；关键数据还需 os.fsync(f.fileno()) 强制写入物理介质。`, { x: 0.8, y: 6.45, w: 11.7, h: 0.5, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.support });
}

// ═══ P10 TextIOWrapper ═══
{
  const s = newPage();
  pgTitle(s, `TEXT LAYER`, `TextIOWrapper · 编码与换行转换`);

  // 左侧管道图
  const pipeY = 3.0;
  glass(s, 0.9, pipeY, 1.6, 0.9, { radius: RADIUS, noShadow: true });
  s.addText(`str`, { x: 0.9, y: pipeY, w: 1.6, h: 0.9, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 18, bold: true, color: C.accent });
  glass(s, 3.15, 2.3, 2.5, 2.3, { radius: RADIUS, line: C.accent, noShadow: true });
  s.addText(`TextIOWrapper`, { x: 3.15, y: 2.5, w: 2.5, h: 0.4, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 15, bold: true, color: C.ink });
  s.addText(`encoding='utf-8'`, { x: 3.15, y: 3.15, w: 2.5, h: 0.35, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 12, color: C.support });
  s.addText(`newline=None`, { x: 3.15, y: 3.55, w: 2.5, h: 0.35, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 12, color: C.support });
  glass(s, 6.3, pipeY, 1.6, 0.9, { radius: RADIUS, noShadow: true });
  s.addText(`bytes`, { x: 6.3, y: pipeY, w: 1.6, h: 0.9, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 18, bold: true, color: C.ink });
  // 箭头：上层写入方向（向右），下层读取方向（向左）
  s.addShape(deck.shapes.LINE, { x: 2.55, y: pipeY + 0.26, w: 0.55, h: 0, line: { color: C.accent, width: 1.5, endArrowType: "arrow" } });
  s.addShape(deck.shapes.LINE, { x: 5.7, y: pipeY + 0.26, w: 0.55, h: 0, line: { color: C.accent, width: 1.5, endArrowType: "arrow" } });
  s.addShape(deck.shapes.LINE, { x: 2.55, y: pipeY + 0.64, w: 0.55, h: 0, line: { color: C.support, width: 1.5, beginArrowType: "arrow" } });
  s.addShape(deck.shapes.LINE, { x: 5.7, y: pipeY + 0.64, w: 0.55, h: 0, line: { color: C.support, width: 1.5, beginArrowType: "arrow" } });
  s.addText(`encode · 写入`, { x: 2.4, y: 2.42, w: 1.4, h: 0.3, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 12, color: C.accent });
  s.addText(`decode · 读取`, { x: 2.4, y: 4.05, w: 1.4, h: 0.3, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 12, color: C.support });
  s.addText(`文本层包裹在缓冲层之外：str ⇄ bytes 的双向翻译官`, { x: 0.9, y: 4.85, w: 7.0, h: 0.8, margin: 0, align: "center", fontFace: FONTS.body, fontSize: 13, color: C.support, lineSpacingMultiple: 1.4 });

  // 右侧要点
  s.addText(`① 编码转换`, { x: 8.35, y: 1.85, w: 4.4, h: 0.4, margin: 0, fontFace: FONTS.display, fontSize: 16, bold: true, color: C.accent });
  s.addText(`写入时把 str 按指定 encoding（utf-8、gbk 等）编码为 bytes 交给下层缓冲流；读取时反向解码为 str。不显式指定 encoding 时，Python 使用 locale.getpreferredencoding()——它随操作系统而变，是跨平台乱码的头号原因。`, { x: 8.35, y: 2.3, w: 4.4, h: 1.85, margin: 0, fontFace: FONTS.body, fontSize: 13, color: "D4D4D8", lineSpacingMultiple: 1.45, valign: "top" });
  s.addText(`② 换行符转换`, { x: 8.35, y: 4.25, w: 4.4, h: 0.4, margin: 0, fontFace: FONTS.display, fontSize: 16, bold: true, color: C.accent });
  s.addText(`读取时 newline=None 启用通用换行模式：\\n、\\r\\n、\\r 统一转为 \\n；写入时 newline=None 把 \\n 转为 os.linesep（Windows 即 \\r\\n）；newline='' 或 '\\n' 则原样透传、不做转换。`, { x: 8.35, y: 4.7, w: 4.4, h: 1.6, margin: 0, fontFace: FONTS.body, fontSize: 13, color: "D4D4D8", lineSpacingMultiple: 1.45, valign: "top" });
  s.addText(`生产代码务必显式 encoding='utf-8'`, { x: 8.35, y: 6.5, w: 4.4, h: 0.4, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.accent });
}

// ═══ P11 一次 write 的完整旅程 ═══
{
  const s = newPage();
  pgTitle(s, `A WRITE'S JOURNEY`, `一次 write 的完整旅程`);

  const steps = [
    [`1`, `write() 调用`, `Python 代码调用 TextIOWrapper.write()`],
    [`2`, `编码与换行`, `按 encoding 编码为 bytes，并按 newline 参数做换行转换`],
    [`3`, `进入缓冲区`, `bytes 写入 BufferedWriter 的内存缓冲区，尚未触及磁盘`],
    [`4`, `系统调用`, `缓冲区满或 flush() 时，经 FileIO 发起 OS write() 调用`],
    [`5`, `页缓存`, `数据进入操作系统页缓存，对程序而言已写完`],
    [`6`, `落盘`, `内核择机将脏页刷入物理存储，fsync() 可强制同步`],
  ];
  const cw = 1.93, gap = 0.075, x0 = 0.62, cy = 2.59;
  s.addShape(deck.shapes.LINE, { x: x0 + cw / 2, y: cy, w: (cw + gap) * 5, h: 0, line: { color: C.edge, width: 1 } });
  steps.forEach((st, i) => {
    const x = x0 + i * (cw + gap);
    s.addShape(deck.shapes.OVAL, { x: x + cw / 2 - 0.21, y: cy - 0.21, w: 0.42, h: 0.42, fill: { color: C.accent }, line: { type: "none" }, shadow: { type: "outer", blur: 28, offset: 0, angle: 0, color: C.accent, opacity: 0.22 } });
    s.addText(st[0], { x: x + cw / 2 - 0.21, y: cy - 0.21, w: 0.42, h: 0.42, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 14, bold: true, color: C.canvas });
    glass(s, x, 2.98, cw, 2.35, { noShadow: true });
    s.addText(st[1], { x: x + 0.12, y: 3.14, w: cw - 0.24, h: 0.45, margin: 0, align: "center", fontFace: FONTS.display, fontSize: 14, bold: true, color: C.ink });
    s.addText(st[2], { x: x + 0.14, y: 3.62, w: cw - 0.28, h: 1.6, margin: 0, align: "center", fontFace: FONTS.body, fontSize: 12, color: C.support, lineSpacingMultiple: 1.35, valign: "top" });
  });
  s.addText(`你的一次 write，穿越了四层抽象`, { x: 2.4, y: 5.62, w: 8.53, h: 0.6, margin: 0, align: "center", fontFace: FONTS.display, fontSize: 22, bold: true, color: C.ink });
  s.addShape(deck.shapes.RECTANGLE, { x: 6.16, y: 6.32, w: 1.0, h: 0.035, fill: { color: C.accent }, line: { type: "none" } });
  s.addText(`文本层只管编码与换行，缓冲层只管批量化，原始层只管系统调用——彼此独立、可替换`, { x: 1.6, y: 6.52, w: 10.13, h: 0.5, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 12, color: C.support });
}

// ═══ P12 章节页 · 第三章 ═══
{
  const s = newPage();
  orb(s, 6.66, 3.4, 3.0);
  s.addText(`CHAPTER 03`, { x: 2.4, y: 2.28, w: 8.53, h: 0.34, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 13, color: C.accent, charSpacing: 3 });
  s.addText(`应用实战`, { x: 1.6, y: 2.72, w: 10.13, h: 1.05, margin: 0, align: "center", fontFace: FONTS.display, fontSize: 48, bold: true, color: C.ink });
  s.addShape(deck.shapes.RECTANGLE, { x: 6.06, y: 3.96, w: 1.2, h: 0.035, fill: { color: C.accent }, line: { type: "none" } });
  s.addText(`文件、内存与标准流——io 大显身手的三类真实场景。`, { x: 3.0, y: 4.3, w: 7.33, h: 0.9, margin: 0, align: "center", fontFace: FONTS.body, fontSize: 15, color: C.support, lineSpacingMultiple: 1.6 });
}

// ═══ P13 文件读写实战 ═══
{
  const s = newPage();
  pgTitle(s, `FILE I/O IN PRACTICE`, `文件读写实战 · open 与 with`);

  glass(s, 0.8, 1.8, 6.0, 4.9, { solid: true });
  s.addText(`READ & WRITE · WITH OPEN`, { x: 1.1, y: 2.02, w: 5.4, h: 0.3, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.accent, charSpacing: 2 });
  s.addText(`# 读取：逐行迭代，内存友好
with open("data.txt", "r",
          encoding="utf-8") as f:
    for line in f:
        process(line)

# 写入：覆盖模式
with open("log.txt", "w",
          encoding="utf-8") as f:
    f.write("hello, io")`, { x: 1.1, y: 2.45, w: 5.4, h: 4.0, margin: 0, fontFace: FONTS.mono, fontSize: 13, color: "E4E4E7", lineSpacingMultiple: 1.35, valign: "top" });

  const groups = [
    [`WITH`, `离开代码块自动关闭，即使发生异常也不会泄漏文件句柄。`],
    [`MODE`, `r 读 / w 写并截断 / a 追加 / x 独占创建；加 b 切换二进制，加 + 开启读写。`],
    [`ENCODING`, `文本模式务必显式 encoding='utf-8'，否则默认编码随操作系统而变，跨平台易乱码。`],
    [`BUFFERING`, `0 无缓冲（仅二进制）/ 1 行缓冲（仅文本）/ >1 指定字节数 / -1 默认 128KB。`],
  ];
  groups.forEach((g, i) => {
    const y = 1.9 + i * 1.24;
    s.addText(g[0], { x: 7.35, y, w: 5.2, h: 0.32, margin: 0, fontFace: FONTS.mono, fontSize: 13, bold: true, color: C.accent, charSpacing: 2 });
    s.addText(g[1], { x: 7.35, y: y + 0.36, w: 5.2, h: 0.82, margin: 0, fontFace: FONTS.body, fontSize: 13, color: "D4D4D8", lineSpacingMultiple: 1.35, valign: "top" });
    if (i < 3) s.addShape(deck.shapes.LINE, { x: 7.35, y: y + 1.14, w: 5.2, h: 0, line: { color: C.edge, width: 1 } });
  });
}

// ═══ P14 StringIO 与 BytesIO ═══
{
  const s = newPage();
  pgTitle(s, `IN-MEMORY STREAMS`, `内存流 · StringIO 与 BytesIO`);

  glass(s, 0.8, 1.85, 5.4, 3.35);
  s.addText(`StringIO`, { x: 1.1, y: 2.05, w: 4.8, h: 0.5, margin: 0, fontFace: FONTS.mono, fontSize: 22, bold: true, color: C.accent });
  s.addText(`内存中的文本流 · 处理 str`, { x: 1.1, y: 2.58, w: 4.8, h: 0.35, margin: 0, fontFace: FONTS.body, fontSize: 13, color: C.support });
  s.addText([
    { text: `构造后即可 write() / read() / seek() / tell()`, options: { bullet: bul(), breakLine: true } },
    { text: `getvalue() 一次性取出全部文本内容`, options: { bullet: bul(), breakLine: true } },
    { text: `适合文本数据的内存操作：拼接、捕获、模板生成`, options: { bullet: bul() } },
  ], { x: 1.1, y: 3.15, w: 4.8, h: 1.9, margin: 0, fontFace: FONTS.body, fontSize: 13, color: "D4D4D8", lineSpacingMultiple: 1.35, paraSpaceAfter: 8, valign: "top" });

  glass(s, 7.13, 1.85, 5.4, 3.35);
  s.addText(`BytesIO`, { x: 7.43, y: 2.05, w: 4.8, h: 0.5, margin: 0, fontFace: FONTS.mono, fontSize: 22, bold: true, color: C.ink });
  s.addText(`内存中的二进制流 · 处理 bytes`, { x: 7.43, y: 2.58, w: 4.8, h: 0.35, margin: 0, fontFace: FONTS.body, fontSize: 13, color: C.support });
  s.addText([
    { text: `可用 bytes 初始化内容：BytesIO(b"...")`, options: { bullet: bul(), breakLine: true } },
    { text: `同样支持完整文件接口：读写、seek、tell`, options: { bullet: bul(), breakLine: true } },
    { text: `适合二进制数据：图片、zip、网络载荷`, options: { bullet: bul() } },
  ], { x: 7.43, y: 3.15, w: 4.8, h: 1.9, margin: 0, fontFace: FONTS.body, fontSize: 13, color: "D4D4D8", lineSpacingMultiple: 1.35, paraSpaceAfter: 8, valign: "top" });

  // VS 标记（位于两卡间隙内）
  s.addShape(deck.shapes.OVAL, { x: 6.42, y: 3.3, w: 0.5, h: 0.5, fill: { color: C.accent }, line: { type: "none" }, shadow: { type: "outer", blur: 28, offset: 0, angle: 0, color: C.accent, opacity: 0.22 } });
  s.addText(`VS`, { x: 6.42, y: 3.3, w: 0.5, h: 0.5, margin: 0, align: "center", valign: "middle", fontFace: FONTS.display, fontSize: 14, bold: true, color: C.canvas });

  glass(s, 0.8, 5.55, 11.73, 1.15, { solid: true, radius: RADIUS });
  s.addText([
    { text: `共同点 · 内存中的文件：`, options: { bold: true, color: C.accent, breakLine: true } },
    { text: `无需磁盘 I/O · 完整实现 IOBase 接口 · 可作为任何接受文件对象的函数的输入输出`, options: { color: "D4D4D8" } },
  ], { x: 1.2, y: 5.62, w: 10.93, h: 1.0, margin: 0, align: "center", valign: "middle", fontFace: FONTS.body, fontSize: 14, lineSpacingMultiple: 1.4 });
}

// ═══ P15 内存流四个实战场景 ═══
{
  const s = newPage();
  pgTitle(s, `USE CASES`, `内存流 · 四个实战场景`);
  const cases = [
    [`1`, `单元测试模拟文件`, `把 BytesIO 传给需要文件对象的函数（json.load、csv.reader），无需创建临时文件，测试更干净、更快速。`],
    [`2`, `捕获 print 输出`, `用 contextlib.redirect_stdout(StringIO()) 将标准输出重定向到内存流，收集内容后直接做断言。`],
    [`3`, `高效拼接大量字符串`, `循环 write() 再 getvalue()，避免 += 反复分配临时对象；万级行数的拼接场景性能提升显著。`],
    [`4`, `数据格式中转站`, `zipfile.ZipFile(BytesIO(), 'w')、csv.writer(StringIO()) 直接在内存生成结构化数据，用于网络上传、API 响应、邮件附件，全程不落盘。`],
  ];
  cases.forEach((cse, i) => {
    const x = 0.8 + (i % 2) * 6.0, y = 1.8 + Math.floor(i / 2) * 2.5;
    glass(s, x, y, 5.73, 2.3);
    s.addShape(deck.shapes.OVAL, { x: x + 0.3, y: y + 0.3, w: 0.46, h: 0.46, fill: { color: C.accent }, line: { type: "none" } });
    s.addText(cse[0], { x: x + 0.3, y: y + 0.3, w: 0.46, h: 0.46, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 15, bold: true, color: C.canvas });
    s.addText(cse[1], { x: x + 0.95, y: y + 0.3, w: 4.5, h: 0.5, margin: 0, fontFace: FONTS.display, fontSize: 16, bold: true, color: C.ink, valign: "middle" });
    s.addText(cse[2], { x: x + 0.32, y: y + 0.98, w: 5.1, h: 1.2, margin: 0, fontFace: FONTS.body, fontSize: 13, color: C.support, lineSpacingMultiple: 1.4, valign: "top" });
  });
}

// ═══ P16 标准流与输出重定向 ═══
{
  const s = newPage();
  pgTitle(s, `STANDARD STREAMS`, `标准流与输出重定向`);

  const streams = [
    [`sys.stdin`, `标准输入`, `文本流，默认读取键盘输入`],
    [`sys.stdout`, `标准输出`, `行缓冲，print() 的写入目标`],
    [`sys.stderr`, `标准错误`, `错误信息即时可见`],
  ];
  streams.forEach((st, i) => {
    const x = 0.8 + i * 4.11;
    glass(s, x, 1.72, 3.9, 1.3, { noShadow: true });
    s.addText(st[0], { x: x + 0.3, y: 1.88, w: 3.3, h: 0.4, margin: 0, fontFace: FONTS.mono, fontSize: 16, bold: true, color: C.accent });
    s.addText(`${st[1]} · ${st[2]}`, { x: x + 0.3, y: 2.34, w: 3.3, h: 0.55, margin: 0, fontFace: FONTS.body, fontSize: 13, color: C.support, lineSpacingMultiple: 1.3 });
  });

  glass(s, 0.8, 3.35, 7.0, 2.55, { solid: true });
  s.addText(`import io, contextlib

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print("hello io")

assert buf.getvalue() == "hello io\\n"`, { x: 1.1, y: 3.55, w: 6.4, h: 2.2, margin: 0, fontFace: FONTS.mono, fontSize: 13, color: "E4E4E7", lineSpacingMultiple: 1.3, valign: "top" });

  s.addText([
    { text: `print(..., file=某流) 可把输出写到任意文件对象，包括内存流`, options: { bullet: bul(), breakLine: true } },
    { text: `redirect_stdout 在 with 块内整体捕获一段代码的全部 print 输出，常用于测试断言`, options: { bullet: bul(), breakLine: true } },
    { text: `print(..., flush=True) 立即刷新缓冲区，避免日志延迟`, options: { bullet: bul() } },
  ], { x: 8.15, y: 3.45, w: 4.55, h: 2.5, margin: 0, fontFace: FONTS.body, fontSize: 13, color: "D4D4D8", lineSpacingMultiple: 1.35, paraSpaceAfter: 8, valign: "top" });

  s.addText(`print() 的本质：向 sys.stdout.write() 写入文本再刷新——三个标准流都是 io 体系的 TextIOWrapper 对象`, { x: 0.8, y: 6.25, w: 11.73, h: 0.5, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 12, color: C.support });
}

// ═══ P17 章节页 · 第四章 ═══
{
  const s = newPage();
  orb(s, 6.66, 3.4, 3.0);
  s.addText(`CHAPTER 04`, { x: 2.4, y: 2.28, w: 8.53, h: 0.34, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 13, color: C.accent, charSpacing: 3 });
  s.addText(`性能与最佳实践`, { x: 1.6, y: 2.72, w: 10.13, h: 1.05, margin: 0, align: "center", fontFace: FONTS.display, fontSize: 48, bold: true, color: C.ink });
  s.addShape(deck.shapes.RECTANGLE, { x: 6.06, y: 3.96, w: 1.2, h: 0.035, fill: { color: C.accent }, line: { type: "none" } });
  s.addText(`让数字说话：实测性能对比、大文件处理与避坑清单。`, { x: 3.0, y: 4.3, w: 7.33, h: 0.9, margin: 0, align: "center", fontFace: FONTS.body, fontSize: 15, color: C.support, lineSpacingMultiple: 1.6 });
}

// ═══ P18 性能对比 ═══
{
  const s = newPage();
  pgTitle(s, `BENCHMARK · MEASURED`, `性能对比 · 缓冲带来的差距`);

  s.addChart(deck.charts.BAR, [
    { name: `无缓冲 FileIO`, labels: [`读取 1MB（逐字节）`, `写入 1MB（逐字节）`], values: [1.06, 4.0] },
    { name: `缓冲后`, labels: [`读取 1MB（逐字节）`, `写入 1MB（逐字节）`], values: [0.04, 0.08] },
  ], {
    x: 0.62, y: 1.75, w: 7.0, h: 4.6, barDir: "col",
    chartColors: [C.support, C.accent],
    chartArea: { fill: { color: C.card2 } },
    catAxisLabelColor: "A1A1AA", valAxisLabelColor: "A1A1AA",
    catAxisLabelFontSize: 12, valAxisLabelFontSize: 12,
    valGridLine: { color: C.edge, size: 0.5 }, catGridLine: { style: "none" },
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: C.ink, dataLabelFontSize: 12,
    showLegend: true, legendPos: "b", legendColor: "A1A1AA", legendFontSize: 12,
    showTitle: true, title: `逐字节读写 1MB 文件耗时（秒）`, titleColor: C.ink, titleFontSize: 14,
    valAxisMaxVal: 4.6,
  });

  glass(s, 8.1, 1.75, 4.6, 2.0);
  s.addText(`29.5×`, { x: 8.4, y: 1.95, w: 2.4, h: 0.9, margin: 0, fontFace: FONTS.display, fontSize: 44, bold: true, color: C.accent });
  s.addText(`读取提速`, { x: 10.7, y: 2.05, w: 1.8, h: 0.4, margin: 0, fontFace: FONTS.display, fontSize: 15, bold: true, color: C.ink });
  s.addText(`1.06s → 0.036s`, { x: 10.7, y: 2.48, w: 1.9, h: 0.4, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.support });

  glass(s, 8.1, 3.95, 4.6, 2.0);
  s.addText(`48.6×`, { x: 8.4, y: 4.15, w: 2.4, h: 0.9, margin: 0, fontFace: FONTS.display, fontSize: 44, bold: true, color: C.accent });
  s.addText(`写入提速`, { x: 10.7, y: 4.25, w: 1.8, h: 0.4, margin: 0, fontFace: FONTS.display, fontSize: 15, bold: true, color: C.ink });
  s.addText(`4.00s → 0.082s`, { x: 10.7, y: 4.68, w: 1.9, h: 0.4, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.support });

  s.addText(`仅加一层缓冲，同样的操作快了一个数量级`, { x: 8.1, y: 6.1, w: 4.6, h: 0.6, margin: 0, fontFace: FONTS.display, fontSize: 14, bold: true, color: C.ink, valign: "top" });
  s.addText(`测试条件：Python 3.14.6 · 1MB 文件 · 逐字节读写 · 本机 SSD 实测`, { x: 0.62, y: 6.85, w: 12.1, h: 0.35, margin: 0, fontFace: FONTS.mono, fontSize: 12, color: C.support });
}

// ═══ P19 大文件的正确打开方式 ═══
{
  const s = newPage();
  pgTitle(s, `LARGE FILES`, `大文件的正确打开方式`);

  glass(s, 0.8, 1.8, 5.9, 4.1);
  s.addText(`反例 · 一次性读入`, { x: 1.1, y: 2.0, w: 5.3, h: 0.45, margin: 0, fontFace: FONTS.display, fontSize: 17, bold: true, color: "F87171" });
  s.addText([
    { text: `f.read() 把整个文件读进一个字符串——文件多大，内存就吃多大；`, options: { bullet: bul(), breakLine: true } },
    { text: `f.readlines() 生成包含所有行的完整列表，内存占用同样随文件大小膨胀。`, options: { bullet: bul() } },
  ], { x: 1.1, y: 2.55, w: 5.3, h: 1.35, margin: 0, fontFace: FONTS.body, fontSize: 13, color: "D4D4D8", lineSpacingMultiple: 1.35, paraSpaceAfter: 8, valign: "top" });
  s.addText(`content = f.read()        # 全部读入
lines   = f.readlines()   # 建完整列表`, { x: 1.1, y: 4.15, w: 5.3, h: 1.3, margin: 0, fontFace: FONTS.mono, fontSize: 13, color: C.support, lineSpacingMultiple: 1.4, valign: "top" });

  glass(s, 6.93, 1.8, 5.9, 4.1, { line: C.accent });
  s.addText(`正解 · 流式处理`, { x: 7.23, y: 2.0, w: 5.3, h: 0.45, margin: 0, fontFace: FONTS.display, fontSize: 17, bold: true, color: C.accent });
  s.addText([
    { text: `for line in f 惰性迭代——每次只在内存保留一行，占用恒定 O(1)；`, options: { bullet: bul(), breakLine: true } },
    { text: `二进制大文件分块读取，每块 64KB，边读边写实现流式复制。`, options: { bullet: bul() } },
  ], { x: 7.23, y: 2.55, w: 5.3, h: 1.35, margin: 0, fontFace: FONTS.body, fontSize: 13, color: "D4D4D8", lineSpacingMultiple: 1.35, paraSpaceAfter: 8, valign: "top" });
  s.addText(`for line in f:               # 惰性迭代
    process(line)

while chunk := f.read(65536):  # 分块读
    out.write(chunk)`, { x: 7.23, y: 4.15, w: 5.3, h: 1.55, margin: 0, fontFace: FONTS.mono, fontSize: 13, color: "E4E4E7", lineSpacingMultiple: 1.3, valign: "top" });

  glass(s, 0.8, 6.15, 12.03, 0.75, { solid: true, radius: RADIUS });
  s.addText([
    { text: `核心原则：`, options: { bold: true, color: C.accent } },
    { text: `永远不要让文件大小决定内存峰值——内存占用 O(1) 而非 O(n)`, options: { color: C.ink } },
  ], { x: 0.8, y: 6.15, w: 12.03, h: 0.75, margin: 0, align: "center", valign: "middle", fontFace: FONTS.body, fontSize: 15 });
}

// ═══ P20 常见陷阱与最佳实践 ═══
{
  const s = newPage();
  pgTitle(s, `PITFALLS & BEST PRACTICES`, `常见陷阱与最佳实践清单`);

  s.addText(`常见陷阱`, { x: 0.8, y: 1.62, w: 5.9, h: 0.4, margin: 0, fontFace: FONTS.display, fontSize: 16, bold: true, color: C.support });
  s.addText(`对策`, { x: 7.23, y: 1.62, w: 5.6, h: 0.4, margin: 0, fontFace: FONTS.display, fontSize: 16, bold: true, color: C.accent });
  s.addShape(deck.shapes.LINE, { x: 6.93, y: 1.65, w: 0, h: 5.1, line: { color: C.edge, width: 1 } });

  const pairs = [
    [[`忘记 close`, `资源泄漏、未刷新的数据丢失`], `永远用 with 语句，自动关闭文件`],
    [[`忘写 encoding`, `默认编码随平台而变，跨机器乱码`], `文本模式显式 encoding='utf-8'`],
    [[`文本与二进制模式混淆`, `文本流不能传 bytes，二进制流不能传 str`], `按数据类型选择 t / b 模式`],
    [[`文本模式传 buffering=0`, `直接抛出 ValueError`], `无缓冲仅限二进制；文本用 1 行缓冲或 >1 全缓冲`],
    [[`以为 flush() 即落盘`, `只刷到 OS 页缓存，断电仍可能丢数据`], `关键数据 flush() 后再调 os.fsync()`],
  ];
  pairs.forEach((p, i) => {
    const y = 2.2 + i * 1.0;
    s.addText([
      { text: p[0][0], options: { bold: true, color: C.ink, breakLine: true } },
      { text: p[0][1], options: { color: C.support } },
    ], { x: 0.8, y, w: 5.9, h: 0.86, margin: 0, fontFace: FONTS.body, fontSize: 13, lineSpacingMultiple: 1.3, valign: "top" });
    s.addShape(deck.shapes.RECTANGLE, { x: 7.23, y: y + 0.12, w: 0.1, h: 0.1, fill: { color: C.accent }, line: { type: "none" } });
    s.addText(p[1], { x: 7.5, y, w: 5.3, h: 0.86, margin: 0, fontFace: FONTS.body, fontSize: 13, bold: true, color: "E4E4E7", valign: "top" });
    if (i < 4) s.addShape(deck.shapes.LINE, { x: 0.8, y: y + 0.94, w: 12.03, h: 0, line: { color: C.edge, width: 0.75 } });
  });
}

// ═══ P21 要点回顾 ═══
{
  const s = newPage();
  pgTitle(s, `RECAP`, `要点回顾 · 六个关键收获`);
  const recaps = [
    [`1`, `统一流入口`, `open() 就定义在 io 模块；文本 / 二进制 / 原始三类 I/O 各司其职，覆盖字符串到系统调用的完整链路。`],
    [`2`, `类层次三线`, `IOBase 分出 Raw / Buffered / Text 三条支线，open() 按 mode 自动组装对应对象。`],
    [`3`, `缓冲即批量`, `把昂贵的系统调用合并为批量操作，默认缓冲区 128KB，buffering 参数切换三种策略。`],
    [`4`, `编码与换行`, `TextIOWrapper 负责 str ⇄ bytes 与换行规范化，务必显式 encoding='utf-8'。`],
    [`5`, `内存流双雄`, `StringIO / BytesIO 是内存中的文件：测试模拟、输出捕获、字符串拼接、数据中转。`],
    [`6`, `实测提速`, `缓冲带来数十倍提速；大文件用逐行迭代或分块读取，别让文件大小决定内存峰值。`],
  ];
  recaps.forEach((r, i) => {
    const x = 0.8 + (i % 2) * 6.0, y = 1.72 + Math.floor(i / 2) * 1.78;
    glass(s, x, y, 5.73, 1.6, { noShadow: true });
    s.addShape(deck.shapes.OVAL, { x: x + 0.26, y: y + 0.26, w: 0.42, h: 0.42, fill: { color: C.accent }, line: { type: "none" } });
    s.addText(r[0], { x: x + 0.26, y: y + 0.26, w: 0.42, h: 0.42, margin: 0, align: "center", valign: "middle", fontFace: FONTS.mono, fontSize: 14, bold: true, color: C.canvas });
    s.addText(r[1], { x: x + 0.85, y: y + 0.26, w: 4.6, h: 0.42, margin: 0, fontFace: FONTS.display, fontSize: 15, bold: true, color: C.ink, valign: "middle" });
    s.addText(r[2], { x: x + 0.28, y: y + 0.78, w: 5.2, h: 0.75, margin: 0, fontFace: FONTS.body, fontSize: 12, color: C.support, lineSpacingMultiple: 1.3, valign: "top" });
  });
}

// ═══ P22 结尾页 ═══
{
  const s = newPage();
  orb(s, 6.66, 2.7, 3.2);
  s.addText(`理解流的三层抽象，读写从此心中有数`, { x: 1.4, y: 2.15, w: 10.53, h: 0.95, margin: 0, align: "center", fontFace: FONTS.display, fontSize: 34, bold: true, color: C.ink });
  s.addShape(deck.shapes.RECTANGLE, { x: 6.06, y: 3.25, w: 1.2, h: 0.035, fill: { color: C.accent }, line: { type: "none" } });

  s.addText(`动手练习`, { x: 3.4, y: 3.75, w: 6.53, h: 0.4, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 13, color: C.accent, charSpacing: 3 });
  s.addText([
    { text: `用 io.StringIO + redirect_stdout 捕获一段 print 输出并断言内容`, options: { bullet: bul(), breakLine: true } },
    { text: `对 1MB 文件分别用 FileIO 与 BufferedReader 逐字节读取计时，亲手验证缓冲提速`, options: { bullet: bul(), breakLine: true } },
    { text: `用 BytesIO + zipfile 在内存中生成一个 zip 归档并写出`, options: { bullet: bul() } },
  ], { x: 3.1, y: 4.2, w: 7.13, h: 1.8, margin: 0, fontFace: FONTS.body, fontSize: 14, color: "D4D4D8", lineSpacingMultiple: 1.35, paraSpaceAfter: 10, valign: "top" });

  s.addText(`PYTHON IO DEEP DIVE · THANKS FOR WATCHING`, { x: 2.4, y: 6.5, w: 8.53, h: 0.4, margin: 0, align: "center", fontFace: FONTS.mono, fontSize: 12, color: C.support, charSpacing: 2 });
}

// 末页署名（硬性）
{
  const slides = deck.slides;
  const last = slides[slides.length - 1];
  last.addText(`千问AI生成`, { x: SLIDE_W - 3.1, y: 0.14, w: 2.9, h: 0.34, align: "right", valign: "middle", margin: 0, fontFace: FONTS.body, fontSize: 12, color: "8A8A93" });
}

deck.writeFile({ fileName: path.join(__dirname, "..", `Python-io库学习PPT.pptx`) });

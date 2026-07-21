import "./style.css";

type Tool =
  | "select"
  | "mosaic"
  | "ellipse"
  | "line"
  | "arrow"
  | "freehand"
  | "text"
  | "number";
type Point = { x: number; y: number };
type BaseAnnotation = { id: string };
type MosaicAnnotation = BaseAnnotation & {
  type: "mosaic";
  x: number;
  y: number;
  width: number;
  height: number;
  blockSize: number;
};
type ShapeAnnotation = BaseAnnotation & {
  type: "ellipse" | "line" | "arrow";
  start: Point;
  end: Point;
  color: string;
  lineWidth: number;
};
type FreehandAnnotation = BaseAnnotation & {
  type: "freehand";
  points: Point[];
  color: string;
  lineWidth: number;
};
type TextAnnotation = BaseAnnotation & {
  type: "text";
  position: Point;
  content: string;
  color: string;
  fontSize: number;
};
type NumberAnnotation = BaseAnnotation & {
  type: "number";
  position: Point;
  value: number;
  color: string;
  size: number;
};
type Annotation =
  | MosaicAnnotation
  | ShapeAnnotation
  | FreehandAnnotation
  | TextAnnotation
  | NumberAnnotation;

const TEXT_FONT_FAMILY = '"Hiragino Sans", "Yu Gothic UI", "Yu Gothic", sans-serif';
const measureCanvas = document.createElement("canvas");
const measureContext = measureCanvas.getContext("2d")!;

const icons = {
  image: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 2-2 5 5"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5h7l2-2h9v13H3z"/><path d="M3 9h18"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7-5 5 5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></svg>`,
  redo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/></svg>`,
  download: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></svg>`,
  select: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 3 13 9-6 2-3 6z"/></svg>`,
  mosaic: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>`,
  ellipse: `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="7"/></svg>`,
  line: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 20 4"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 20 4"/><path d="M11 4h9v9"/></svg>`,
  freehand: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17c3-8 5 3 8-5s4 5 10-4"/></svg>`,
  text: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14M12 5v14M8.5 19h7"/></svg>`,
  number: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10.5 9.5 12.5 8v8M10.5 16h4"/></svg>`,
  fit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>`,
  zoomIn: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M10.5 7v7M7 10.5h7"/></svg>`,
  zoomOut: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7 10.5h7"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8zM6 7l1 14h10l1-14M10 11v6M14 11v6"/></svg>`,
};

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">${icons.image}</span>
        <span class="brand-name">モザイクマーカー</span>
      </div>
      <div class="toolbar-group">
        <button class="btn" id="openButton" title="画像を開く (Ctrl/⌘ + O)">${icons.folder}<span>画像を開く</span></button>
        <input class="hidden" id="fileInput" type="file" accept="image/png,image/jpeg,image/webp" />
      </div>
      <span class="toolbar-divider"></span>
      <div class="toolbar-group">
        <button class="btn icon-only" id="undoButton" title="元に戻す (Ctrl/⌘ + Z)" aria-label="元に戻す" disabled>${icons.undo}</button>
        <button class="btn icon-only" id="redoButton" title="やり直す (Ctrl/⌘ + Shift + Z)" aria-label="やり直す" disabled>${icons.redo}</button>
        <button class="btn icon-only" id="deleteButton" title="選択した要素を削除 (Delete)" aria-label="選択した要素を削除" disabled>${icons.trash}</button>
      </div>
      <span class="toolbar-divider"></span>
      <div class="toolbar-group">
        <button class="btn icon-only" id="zoomOutButton" title="縮小" aria-label="縮小" disabled>${icons.zoomOut}</button>
        <button class="btn" id="zoomResetButton" title="100%表示" disabled><span id="zoomLabel">100%</span></button>
        <button class="btn icon-only" id="zoomInButton" title="拡大" aria-label="拡大" disabled>${icons.zoomIn}</button>
        <button class="btn icon-only" id="fitButton" title="画面に合わせる (0)" aria-label="画面に合わせる" disabled>${icons.fit}</button>
      </div>
      <span class="spacer"></span>
      <button class="btn primary" id="downloadButton" disabled>${icons.download}<span>ダウンロード</span></button>
    </header>

    <aside class="tools-panel" aria-label="描画ツール">
      ${toolButton("select", "選択", "V", icons.select)}
      ${toolButton("mosaic", "モザイク", "M", icons.mosaic)}
      ${toolButton("ellipse", "赤丸", "E", icons.ellipse)}
      ${toolButton("line", "直線", "L", icons.line)}
      ${toolButton("arrow", "矢印", "A", icons.arrow)}
      ${toolButton("freehand", "手描き", "P", icons.freehand)}
      ${toolButton("text", "テキスト", "T", icons.text)}
      ${toolButton("number", "番号", "N", icons.number)}
    </aside>

    <section class="workspace" id="workspace">
      <div class="canvas-scroller" id="canvasScroller">
        <div class="canvas-stage" id="canvasStage">
          <canvas id="editorCanvas" class="hidden" aria-label="画像編集キャンバス"></canvas>
        </div>
      </div>
      <div class="empty-state" id="emptyState">
        <div class="empty-card" id="dropCard">
          <div class="empty-icon">${icons.image}</div>
          <h1>画像をここにドロップ</h1>
          <p>またはファイルを選択してください。<br />スクリーンショットは Ctrl/⌘ + V でも貼り付けられます。</p>
          <button class="btn primary" id="emptyOpenButton">${icons.folder}<span>画像を選択</span></button>
          <p class="privacy">画像は外部へ送信されません。すべてこの端末内で処理されます。</p>
        </div>
      </div>
      <div class="inline-text-editor hidden" id="inlineTextEditor">
        <textarea id="textEditorInput" rows="1" aria-label="テキストを入力" placeholder="テキストを入力"></textarea>
        <span>Enterで確定・Shift＋Enterで改行・Escでキャンセル</span>
      </div>
    </section>

    <aside class="settings-panel">
      <h2 class="panel-title">描画設定</h2>
      <div class="setting">
        <label class="setting-label" for="colorInput">描画色</label>
        <div class="color-row">
          <input id="colorInput" type="color" value="#ef4444" />
          <input class="color-text" id="colorText" type="text" value="#EF4444" maxlength="7" aria-label="描画色コード" />
        </div>
      </div>
      <div class="setting">
        <label class="setting-label" for="textSizeInput">
          <span>文字サイズ</span><span class="value-badge" id="textSizeValue">40 px</span>
        </label>
        <input id="textSizeInput" type="range" min="16" max="120" step="2" value="40" />
        <p class="setting-hint">テキストツールで入力する文字の大きさです。</p>
      </div>
      <div class="setting">
        <label class="setting-label" for="numberSizeSelect">番号サイズ</label>
        <select class="select" id="numberSizeSelect">
          <option value="72">小</option>
          <option value="96" selected>中（おすすめ）</option>
          <option value="128">大</option>
        </select>
        <p class="setting-hint">目立ちやすいように、「小」でも十分大きく表示します。</p>
      </div>
      <div class="setting">
        <label class="setting-label" for="lineWidthInput">
          <span>線の太さ</span><span class="value-badge" id="lineWidthValue">8 px</span>
        </label>
        <input id="lineWidthInput" type="range" min="2" max="40" value="8" />
      </div>
      <div class="setting">
        <label class="setting-label" for="mosaicInput">
          <span>モザイクの粗さ</span><span class="value-badge" id="mosaicValue">16 px</span>
        </label>
        <input id="mosaicInput" type="range" min="4" max="64" step="2" value="16" />
        <p class="setting-hint">値を大きくするとモザイクが粗くなります。</p>
      </div>
      <div class="setting">
        <label class="setting-label" for="formatSelect">保存形式</label>
        <select class="select" id="formatSelect">
          <option value="png">PNG（高画質）</option>
          <option value="jpeg">JPEG（軽量）</option>
        </select>
      </div>
      <div class="setting hidden" id="qualitySetting">
        <label class="setting-label" for="qualityInput">
          <span>JPEG品質</span><span class="value-badge" id="qualityValue">92%</span>
        </label>
        <input id="qualityInput" type="range" min="50" max="100" value="92" />
      </div>
      <div class="privacy-note">
        <strong>プライバシー</strong><br />
        読み込んだ画像と編集内容はブラウザのメモリ内だけに保持され、外部へ送信されません。
      </div>
    </aside>

    <footer class="statusbar" role="status">
      <span class="status-message" id="statusMessage">画像を開くか、貼り付けて開始してください</span>
      <span class="status-meta" id="statusMeta">画像未選択</span>
    </footer>
    <div class="toast" id="toast"></div>
  </main>
`;

function toolButton(tool: Tool, label: string, shortcut: string, icon: string): string {
  return `<button class="tool-btn${tool === "select" ? " active" : ""}" data-tool="${tool}" title="${label} (${shortcut})" aria-label="${label}" aria-pressed="${tool === "select"}">${icon}<span>${label}</span><kbd>${shortcut}</kbd></button>`;
}

const canvas = getElement<HTMLCanvasElement>("editorCanvas");
const ctx = canvas.getContext("2d", { alpha: true })!;
const workspace = getElement<HTMLElement>("workspace");
const canvasScroller = getElement<HTMLDivElement>("canvasScroller");
const emptyState = getElement<HTMLDivElement>("emptyState");
const dropCard = getElement<HTMLDivElement>("dropCard");
const fileInput = getElement<HTMLInputElement>("fileInput");
const undoButton = getElement<HTMLButtonElement>("undoButton");
const redoButton = getElement<HTMLButtonElement>("redoButton");
const deleteButton = getElement<HTMLButtonElement>("deleteButton");
const downloadButton = getElement<HTMLButtonElement>("downloadButton");
const zoomOutButton = getElement<HTMLButtonElement>("zoomOutButton");
const zoomInButton = getElement<HTMLButtonElement>("zoomInButton");
const zoomResetButton = getElement<HTMLButtonElement>("zoomResetButton");
const fitButton = getElement<HTMLButtonElement>("fitButton");
const zoomLabel = getElement<HTMLSpanElement>("zoomLabel");
const colorInput = getElement<HTMLInputElement>("colorInput");
const colorText = getElement<HTMLInputElement>("colorText");
const textSizeInput = getElement<HTMLInputElement>("textSizeInput");
const textSizeValue = getElement<HTMLSpanElement>("textSizeValue");
const numberSizeSelect = getElement<HTMLSelectElement>("numberSizeSelect");
const lineWidthInput = getElement<HTMLInputElement>("lineWidthInput");
const lineWidthValue = getElement<HTMLSpanElement>("lineWidthValue");
const mosaicInput = getElement<HTMLInputElement>("mosaicInput");
const mosaicValue = getElement<HTMLSpanElement>("mosaicValue");
const formatSelect = getElement<HTMLSelectElement>("formatSelect");
const qualitySetting = getElement<HTMLDivElement>("qualitySetting");
const qualityInput = getElement<HTMLInputElement>("qualityInput");
const qualityValue = getElement<HTMLSpanElement>("qualityValue");
const statusMessage = getElement<HTMLSpanElement>("statusMessage");
const statusMeta = getElement<HTMLSpanElement>("statusMeta");
const toast = getElement<HTMLDivElement>("toast");
const inlineTextEditor = getElement<HTMLDivElement>("inlineTextEditor");
const textEditorInput = getElement<HTMLTextAreaElement>("textEditorInput");

let sourceImage: HTMLImageElement | null = null;
let sourceFileName = "image";
let annotations: Annotation[] = [];
let undoStack: Annotation[][] = [];
let redoStack: Annotation[][] = [];
let currentTool: Tool = "select";
let selectedId: string | null = null;
let zoom = 1;
let dirty = false;
let interaction:
  | { mode: "draw"; start: Point; draft: Annotation }
  | { mode: "move"; start: Point; original: Annotation; id: string }
  | null = null;
let spacePressed = false;
let panning:
  | { startX: number; startY: number; scrollLeft: number; scrollTop: number }
  | null = null;
let renderPending = false;
let toastTimer = 0;
let textEditSession:
  | {
      annotationId: string | null;
      position: Point;
      color: string;
      fontSize: number;
    }
  | null = null;

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element not found: ${id}`);
  return element as T;
}

function cloneAnnotations(items = annotations): Annotation[] {
  return structuredClone(items);
}

function uuid(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function setTool(tool: Tool): void {
  if (textEditSession) commitTextEditing();
  currentTool = tool;
  selectedId = null;
  canvas.dataset.tool = tool;
  document.querySelectorAll<HTMLButtonElement>(".tool-btn").forEach((button) => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateControls();
  scheduleRender();
}

function scheduleRender(): void {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    render();
  });
}

function render(): void {
  if (!sourceImage) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceImage, 0, 0);
  for (const annotation of annotations) {
    drawAnnotation(ctx, annotation, sourceImage);
  }
  if (interaction?.mode === "draw") {
    drawAnnotation(ctx, interaction.draft, sourceImage);
  }
  if (selectedId) {
    const selected = annotations.find((item) => item.id === selectedId);
    if (selected) drawSelection(ctx, selected);
  }
}

function drawAnnotation(
  target: CanvasRenderingContext2D,
  annotation: Annotation,
  image: CanvasImageSource,
): void {
  target.save();
  if (annotation.type === "mosaic") {
    drawMosaic(target, annotation, image);
  } else if (annotation.type === "text") {
    drawText(target, annotation);
  } else if (annotation.type === "number") {
    drawNumber(target, annotation);
  } else if (annotation.type === "freehand") {
    if (annotation.points.length > 1) {
      target.strokeStyle = annotation.color;
      target.lineWidth = annotation.lineWidth;
      target.lineCap = "round";
      target.lineJoin = "round";
      target.beginPath();
      target.moveTo(annotation.points[0].x, annotation.points[0].y);
      for (const point of annotation.points.slice(1)) target.lineTo(point.x, point.y);
      target.stroke();
    }
  } else {
    target.strokeStyle = annotation.color;
    target.lineWidth = annotation.lineWidth;
    target.lineCap = "round";
    target.lineJoin = "round";
    if (annotation.type === "ellipse") {
      const centerX = (annotation.start.x + annotation.end.x) / 2;
      const centerY = (annotation.start.y + annotation.end.y) / 2;
      const radiusX = Math.abs(annotation.end.x - annotation.start.x) / 2;
      const radiusY = Math.abs(annotation.end.y - annotation.start.y) / 2;
      target.beginPath();
      target.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      target.stroke();
    } else {
      target.beginPath();
      target.moveTo(annotation.start.x, annotation.start.y);
      target.lineTo(annotation.end.x, annotation.end.y);
      target.stroke();
      if (annotation.type === "arrow") drawArrowHead(target, annotation);
    }
  }
  target.restore();
}

function textLines(content: string): string[] {
  return content.replace(/\r\n?/g, "\n").split("\n");
}

function textLineHeight(fontSize: number): number {
  return fontSize * 1.25;
}

function textOutlineWidth(fontSize: number): number {
  return Math.max(3, fontSize * 0.12);
}

function applyTextFont(target: CanvasRenderingContext2D, fontSize: number): void {
  target.font = `700 ${fontSize}px ${TEXT_FONT_FAMILY}`;
  target.textBaseline = "top";
  target.textAlign = "left";
}

function drawText(target: CanvasRenderingContext2D, annotation: TextAnnotation): void {
  applyTextFont(target, annotation.fontSize);
  target.lineJoin = "round";
  target.strokeStyle = "#ffffff";
  target.lineWidth = textOutlineWidth(annotation.fontSize);
  target.fillStyle = annotation.color;
  const lineHeight = textLineHeight(annotation.fontSize);
  textLines(annotation.content).forEach((line, index) => {
    const y = annotation.position.y + index * lineHeight;
    target.strokeText(line, annotation.position.x, y);
    target.fillText(line, annotation.position.x, y);
  });
}

function drawNumber(target: CanvasRenderingContext2D, annotation: NumberAnnotation): void {
  const radius = annotation.size / 2;
  target.fillStyle = annotation.color;
  target.beginPath();
  target.arc(annotation.position.x, annotation.position.y, radius, 0, Math.PI * 2);
  target.fill();

  const digits = String(annotation.value).length;
  const fontScale = digits >= 3 ? 0.4 : digits === 2 ? 0.48 : 0.58;
  target.font = `700 ${annotation.size * fontScale}px ${TEXT_FONT_FAMILY}`;
  target.fillStyle = "#ffffff";
  target.textAlign = "center";
  target.textBaseline = "middle";
  target.fillText(String(annotation.value), annotation.position.x, annotation.position.y + 0.5);
}

function drawMosaic(
  target: CanvasRenderingContext2D,
  annotation: MosaicAnnotation,
  image: CanvasImageSource,
): void {
  const rect = normalizeRect(annotation.x, annotation.y, annotation.width, annotation.height);
  if (rect.width < 1 || rect.height < 1) return;
  const block = Math.max(2, annotation.blockSize);
  const smallWidth = Math.max(1, Math.ceil(rect.width / block));
  const smallHeight = Math.max(1, Math.ceil(rect.height / block));
  const small = document.createElement("canvas");
  small.width = smallWidth;
  small.height = smallHeight;
  const smallCtx = small.getContext("2d")!;
  smallCtx.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    smallWidth,
    smallHeight,
  );
  target.save();
  target.imageSmoothingEnabled = false;
  target.drawImage(small, 0, 0, smallWidth, smallHeight, rect.x, rect.y, rect.width, rect.height);
  target.restore();
}

function drawArrowHead(target: CanvasRenderingContext2D, annotation: ShapeAnnotation): void {
  const angle = Math.atan2(
    annotation.end.y - annotation.start.y,
    annotation.end.x - annotation.start.x,
  );
  const length = Math.max(14, annotation.lineWidth * 3);
  target.beginPath();
  target.moveTo(annotation.end.x, annotation.end.y);
  target.lineTo(
    annotation.end.x - length * Math.cos(angle - Math.PI / 6),
    annotation.end.y - length * Math.sin(angle - Math.PI / 6),
  );
  target.moveTo(annotation.end.x, annotation.end.y);
  target.lineTo(
    annotation.end.x - length * Math.cos(angle + Math.PI / 6),
    annotation.end.y - length * Math.sin(angle + Math.PI / 6),
  );
  target.stroke();
}

function drawSelection(target: CanvasRenderingContext2D, annotation: Annotation): void {
  const box = annotationBounds(annotation);
  target.save();
  target.strokeStyle = "#2563eb";
  target.fillStyle = "#ffffff";
  target.lineWidth = Math.max(1.5, 1.5 / zoom);
  target.setLineDash([7 / zoom, 5 / zoom]);
  target.strokeRect(box.x - 5 / zoom, box.y - 5 / zoom, box.width + 10 / zoom, box.height + 10 / zoom);
  target.setLineDash([]);
  const handle = 7 / zoom;
  for (const point of [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height },
  ]) {
    target.fillRect(point.x - handle / 2, point.y - handle / 2, handle, handle);
    target.strokeRect(point.x - handle / 2, point.y - handle / 2, handle, handle);
  }
  target.restore();
}

function normalizeRect(x: number, y: number, width: number, height: number) {
  return {
    x: width < 0 ? x + width : x,
    y: height < 0 ? y + height : y,
    width: Math.abs(width),
    height: Math.abs(height),
  };
}

function annotationBounds(annotation: Annotation) {
  if (annotation.type === "mosaic") {
    return normalizeRect(annotation.x, annotation.y, annotation.width, annotation.height);
  }
  if (annotation.type === "text") {
    applyTextFont(measureContext, annotation.fontSize);
    const lines = textLines(annotation.content);
    const outline = textOutlineWidth(annotation.fontSize) / 2;
    const width = Math.max(1, ...lines.map((line) => measureContext.measureText(line).width));
    return {
      x: annotation.position.x - outline,
      y: annotation.position.y - outline,
      width: width + outline * 2,
      height: lines.length * textLineHeight(annotation.fontSize) + outline * 2,
    };
  }
  if (annotation.type === "number") {
    return {
      x: annotation.position.x - annotation.size / 2,
      y: annotation.position.y - annotation.size / 2,
      width: annotation.size,
      height: annotation.size,
    };
  }
  if (annotation.type === "freehand") {
    const xs = annotation.points.map((point) => point.x);
    const ys = annotation.points.map((point) => point.y);
    const padding = annotation.lineWidth / 2;
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: minX - padding,
      y: minY - padding,
      width: Math.max(1, Math.max(...xs) - minX + padding * 2),
      height: Math.max(1, Math.max(...ys) - minY + padding * 2),
    };
  }
  const padding = annotation.lineWidth / 2;
  return {
    x: Math.min(annotation.start.x, annotation.end.x) - padding,
    y: Math.min(annotation.start.y, annotation.end.y) - padding,
    width: Math.abs(annotation.end.x - annotation.start.x) + padding * 2,
    height: Math.abs(annotation.end.y - annotation.start.y) + padding * 2,
  };
}

function pointerToImage(event: Pick<MouseEvent, "clientX" | "clientY">): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / zoom, 0, canvas.width),
    y: clamp((event.clientY - rect.top) / zoom, 0, canvas.height),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hitTest(point: Point): Annotation | null {
  const tolerance = Math.max(7 / zoom, 5);
  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index];
    if (annotation.type === "mosaic") {
      const box = annotationBounds(annotation);
      if (pointInBox(point, box, tolerance)) return annotation;
    } else if (annotation.type === "text") {
      if (pointInBox(point, annotationBounds(annotation), tolerance)) return annotation;
    } else if (annotation.type === "number") {
      if (
        Math.hypot(point.x - annotation.position.x, point.y - annotation.position.y) <=
        annotation.size / 2 + tolerance
      ) {
        return annotation;
      }
    } else if (annotation.type === "ellipse") {
      const centerX = (annotation.start.x + annotation.end.x) / 2;
      const centerY = (annotation.start.y + annotation.end.y) / 2;
      const radiusX = Math.abs(annotation.end.x - annotation.start.x) / 2;
      const radiusY = Math.abs(annotation.end.y - annotation.start.y) / 2;
      if (radiusX > 0 && radiusY > 0) {
        const value =
          ((point.x - centerX) ** 2) / radiusX ** 2 +
          ((point.y - centerY) ** 2) / radiusY ** 2;
        const edgeTolerance = tolerance / Math.max(radiusX, radiusY);
        if (Math.abs(value - 1) < Math.max(0.12, edgeTolerance * 2)) return annotation;
      }
    } else if (annotation.type === "freehand") {
      for (let i = 1; i < annotation.points.length; i += 1) {
        if (
          distanceToSegment(point, annotation.points[i - 1], annotation.points[i]) <=
          tolerance + annotation.lineWidth / 2
        ) {
          return annotation;
        }
      }
    } else if (
      distanceToSegment(point, annotation.start, annotation.end) <=
      tolerance + annotation.lineWidth / 2
    ) {
      return annotation;
    }
  }
  return null;
}

function pointInBox(
  point: Point,
  box: { x: number; y: number; width: number; height: number },
  tolerance: number,
): boolean {
  return (
    point.x >= box.x - tolerance &&
    point.x <= box.x + box.width + tolerance &&
    point.y >= box.y - tolerance &&
    point.y <= box.y + box.height + tolerance
  );
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    0,
    1,
  );
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function createDraft(point: Point): Annotation {
  const id = uuid();
  if (currentTool === "mosaic") {
    return {
      id,
      type: "mosaic",
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      blockSize: Number(mosaicInput.value),
    };
  }
  if (currentTool === "freehand") {
    return {
      id,
      type: "freehand",
      points: [point],
      color: colorInput.value,
      lineWidth: Number(lineWidthInput.value),
    };
  }
  return {
    id,
    type: currentTool as "ellipse" | "line" | "arrow",
    start: point,
    end: point,
    color: colorInput.value,
    lineWidth: Number(lineWidthInput.value),
  };
}

function updateDraft(draft: Annotation, point: Point, start: Point): void {
  if (draft.type === "mosaic") {
    draft.width = point.x - start.x;
    draft.height = point.y - start.y;
  } else if (draft.type === "freehand") {
    const last = draft.points.at(-1)!;
    if (Math.hypot(point.x - last.x, point.y - last.y) >= 1.5 / zoom) {
      draft.points.push(point);
    }
  } else if (draft.type === "ellipse" || draft.type === "line" || draft.type === "arrow") {
    draft.end = point;
  }
}

function isValidAnnotation(annotation: Annotation): boolean {
  const box = annotationBounds(annotation);
  if (annotation.type === "freehand") return annotation.points.length > 1;
  return box.width >= 2 && box.height >= (annotation.type === "line" || annotation.type === "arrow" ? 0 : 2);
}

function moveAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
  const moved = structuredClone(annotation);
  if (moved.type === "mosaic") {
    moved.x += dx;
    moved.y += dy;
  } else if (moved.type === "text" || moved.type === "number") {
    moved.position.x += dx;
    moved.position.y += dy;
  } else if (moved.type === "freehand") {
    moved.points = moved.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
  } else {
    moved.start.x += dx;
    moved.start.y += dy;
    moved.end.x += dx;
    moved.end.y += dy;
  }
  return moved;
}

function commitChange(previous: Annotation[]): void {
  undoStack.push(previous);
  if (undoStack.length > 100) undoStack.shift();
  redoStack = [];
  dirty = true;
  updateControls();
}

function undo(): void {
  const previous = undoStack.pop();
  if (!previous) return;
  redoStack.push(cloneAnnotations());
  annotations = previous;
  selectedId = null;
  dirty = true;
  updateControls();
  scheduleRender();
}

function redo(): void {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(cloneAnnotations());
  annotations = next;
  selectedId = null;
  dirty = true;
  updateControls();
  scheduleRender();
}

function deleteSelected(): void {
  if (!selectedId) return;
  const previous = cloneAnnotations();
  annotations = annotations.filter((item) => item.id !== selectedId);
  selectedId = null;
  commitChange(previous);
  scheduleRender();
  showToast("選択した要素を削除しました");
}

function nextNumberValue(): number {
  const usedNumbers = annotations
    .filter((annotation): annotation is NumberAnnotation => annotation.type === "number")
    .map((annotation) => annotation.value);
  return usedNumbers.length === 0 ? 1 : Math.max(...usedNumbers) + 1;
}

function addNumberAnnotation(position: Point): void {
  const previous = cloneAnnotations();
  const annotation: NumberAnnotation = {
    id: uuid(),
    type: "number",
    position,
    value: nextNumberValue(),
    color: colorInput.value,
    size: Number(numberSizeSelect.value),
  };
  annotations.push(annotation);
  selectedId = annotation.id;
  commitChange(previous);
  statusMessage.textContent = `番号${annotation.value}を追加しました`;
  scheduleRender();
}

function resizeTextEditor(): void {
  textEditorInput.style.height = "auto";
  textEditorInput.style.height = `${clamp(textEditorInput.scrollHeight, 44, 180)}px`;
  requestAnimationFrame(positionTextEditor);
}

function positionTextEditor(): void {
  if (!textEditSession || inlineTextEditor.classList.contains("hidden")) return;
  const canvasRect = canvas.getBoundingClientRect();
  const workspaceRect = workspace.getBoundingClientRect();
  const xScale = canvasRect.width / canvas.width;
  const yScale = canvasRect.height / canvas.height;
  const anchorLeft = canvasRect.left - workspaceRect.left + textEditSession.position.x * xScale;
  const anchorTop = canvasRect.top - workspaceRect.top + textEditSession.position.y * yScale;
  const editorWidth = Math.min(360, Math.max(220, workspace.clientWidth - 32));
  const editorHeight = inlineTextEditor.offsetHeight || 104;
  const left = clamp(anchorLeft, 8, Math.max(8, workspace.clientWidth - editorWidth - 8));
  const top = clamp(anchorTop, 8, Math.max(8, workspace.clientHeight - editorHeight - 8));
  inlineTextEditor.style.left = `${left}px`;
  inlineTextEditor.style.top = `${top}px`;
  inlineTextEditor.style.width = `${editorWidth}px`;
  textEditorInput.style.fontSize = `${clamp(textEditSession.fontSize * zoom, 16, 72)}px`;
  textEditorInput.style.color = textEditSession.color;
}

function startTextEditing(position: Point, annotation?: TextAnnotation): void {
  if (textEditSession) commitTextEditing();
  textEditSession = {
    annotationId: annotation?.id ?? null,
    position: annotation?.position ?? position,
    color: annotation?.color ?? colorInput.value,
    fontSize: annotation?.fontSize ?? Number(textSizeInput.value),
  };
  textEditorInput.value = annotation?.content ?? "";
  inlineTextEditor.classList.remove("hidden");
  resizeTextEditor();
  positionTextEditor();
  requestAnimationFrame(() => {
    positionTextEditor();
    textEditorInput.focus();
    if (annotation) textEditorInput.select();
  });
}

function cancelTextEditing(): void {
  textEditSession = null;
  textEditorInput.value = "";
  inlineTextEditor.classList.add("hidden");
}

function commitTextEditing(): void {
  if (!textEditSession) return;
  const session = textEditSession;
  const content = textEditorInput.value.replace(/\r\n?/g, "\n").trim();
  textEditSession = null;
  inlineTextEditor.classList.add("hidden");
  textEditorInput.value = "";

  if (session.annotationId) {
    const index = annotations.findIndex((annotation) => annotation.id === session.annotationId);
    if (index < 0 || annotations[index].type !== "text") return;
    const existing = annotations[index] as TextAnnotation;
    if (content === existing.content) return;
    const previous = cloneAnnotations();
    if (content) {
      annotations[index] = { ...existing, content };
      statusMessage.textContent = "テキストを更新しました";
    } else {
      annotations.splice(index, 1);
      selectedId = null;
      statusMessage.textContent = "空のテキストを削除しました";
    }
    commitChange(previous);
    scheduleRender();
    return;
  }

  if (!content) return;
  const previous = cloneAnnotations();
  const annotation: TextAnnotation = {
    id: uuid(),
    type: "text",
    position: session.position,
    content,
    color: session.color,
    fontSize: session.fontSize,
  };
  annotations.push(annotation);
  selectedId = annotation.id;
  commitChange(previous);
  statusMessage.textContent = "テキストを追加しました";
  scheduleRender();
}

function updateControls(): void {
  const hasImage = Boolean(sourceImage);
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
  deleteButton.disabled = !selectedId;
  downloadButton.disabled = !hasImage;
  zoomOutButton.disabled = !hasImage;
  zoomInButton.disabled = !hasImage;
  zoomResetButton.disabled = !hasImage;
  fitButton.disabled = !hasImage;
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  if (sourceImage) {
    statusMeta.textContent = `${sourceImage.naturalWidth} × ${sourceImage.naturalHeight}px · ${annotations.length}個の要素`;
  } else {
    statusMeta.textContent = "画像未選択";
  }
}

async function openFile(file: File): Promise<void> {
  if (textEditSession) commitTextEditing();
  if (!file.type.startsWith("image/")) {
    showToast("PNG、JPEG、WebP画像を選択してください", true);
    return;
  }
  if (dirty && !window.confirm("保存していない編集があります。別の画像を開きますか？")) return;
  try {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("decode"));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("size");
    if (image.naturalWidth * image.naturalHeight > 100_000_000) {
      URL.revokeObjectURL(url);
      showToast("画像が大きすぎます。1億画素以下の画像を使用してください", true);
      return;
    }
    sourceImage = image;
    sourceFileName = stripExtension(file.name || "screenshot");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    annotations = [];
    undoStack = [];
    redoStack = [];
    selectedId = null;
    dirty = false;
    emptyState.classList.add("hidden");
    canvas.classList.remove("hidden");
    URL.revokeObjectURL(url);
    requestAnimationFrame(() => fitToScreen());
    statusMessage.textContent = `${file.name || "貼り付けた画像"}を読み込みました`;
    updateControls();
    scheduleRender();
  } catch {
    showToast("画像を読み込めませんでした。別の画像をお試しください", true);
  }
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "image";
}

function setZoom(nextZoom: number): void {
  if (!sourceImage) return;
  const centerX = canvasScroller.scrollLeft + canvasScroller.clientWidth / 2;
  const centerY = canvasScroller.scrollTop + canvasScroller.clientHeight / 2;
  const ratio = nextZoom / zoom;
  zoom = clamp(nextZoom, 0.05, 4);
  canvas.style.width = `${canvas.width * zoom}px`;
  canvas.style.height = `${canvas.height * zoom}px`;
  requestAnimationFrame(() => {
    canvasScroller.scrollLeft = centerX * ratio - canvasScroller.clientWidth / 2;
    canvasScroller.scrollTop = centerY * ratio - canvasScroller.clientHeight / 2;
    positionTextEditor();
  });
  updateControls();
  scheduleRender();
}

function fitToScreen(): void {
  if (!sourceImage) return;
  const availableWidth = Math.max(100, canvasScroller.clientWidth - 96);
  const availableHeight = Math.max(100, canvasScroller.clientHeight - 96);
  const nextZoom = Math.min(1, availableWidth / canvas.width, availableHeight / canvas.height);
  zoom = clamp(nextZoom, 0.05, 4);
  canvas.style.width = `${canvas.width * zoom}px`;
  canvas.style.height = `${canvas.height * zoom}px`;
  canvasScroller.scrollLeft = 0;
  canvasScroller.scrollTop = 0;
  positionTextEditor();
  updateControls();
  scheduleRender();
}

async function downloadImage(): Promise<void> {
  if (!sourceImage) return;
  downloadButton.disabled = true;
  const originalLabel = downloadButton.innerHTML;
  downloadButton.textContent = "書き出し中…";
  try {
    const output = document.createElement("canvas");
    output.width = sourceImage.naturalWidth;
    output.height = sourceImage.naturalHeight;
    const outputCtx = output.getContext("2d");
    if (!outputCtx) throw new Error("canvas");
    const format = formatSelect.value;
    if (format === "jpeg") {
      outputCtx.fillStyle = "#ffffff";
      outputCtx.fillRect(0, 0, output.width, output.height);
    }
    outputCtx.drawImage(sourceImage, 0, 0);
    for (const annotation of annotations) {
      drawAnnotation(outputCtx, annotation, sourceImage);
    }
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const quality = Number(qualityInput.value) / 100;
    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob(resolve, mime, format === "jpeg" ? quality : undefined),
    );
    if (!blob) throw new Error("blob");
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${sourceFileName}-edited.${format === "jpeg" ? "jpg" : "png"}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    dirty = false;
    statusMessage.textContent = `${link.download}を書き出しました`;
    showToast("画像をダウンロードしました");
  } catch {
    showToast("画像を書き出せませんでした。画像サイズを小さくしてお試しください", true);
  } finally {
    downloadButton.innerHTML = originalLabel;
    downloadButton.disabled = false;
  }
}

function showToast(message: string, error = false): void {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3000);
}

canvas.addEventListener("pointerdown", (event) => {
  if (!sourceImage) return;
  if (spacePressed || event.button === 1) {
    event.preventDefault();
    panning = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: canvasScroller.scrollLeft,
      scrollTop: canvasScroller.scrollTop,
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
    return;
  }
  if (event.button !== 0) return;
  const point = pointerToImage(event);
  if (currentTool === "select") {
    const hit = hitTest(point);
    selectedId = hit?.id ?? null;
    if (hit) {
      interaction = {
        mode: "move",
        start: point,
        original: structuredClone(hit),
        id: hit.id,
      };
      canvas.setPointerCapture(event.pointerId);
    }
    updateControls();
    scheduleRender();
    return;
  }
  if (currentTool === "text") {
    selectedId = null;
    startTextEditing(point);
    updateControls();
    scheduleRender();
    return;
  }
  if (currentTool === "number") {
    addNumberAnnotation(point);
    return;
  }
  const draft = createDraft(point);
  interaction = { mode: "draw", start: point, draft };
  canvas.setPointerCapture(event.pointerId);
  scheduleRender();
});

canvas.addEventListener("pointermove", (event) => {
  if (panning) {
    canvasScroller.scrollLeft = panning.scrollLeft - (event.clientX - panning.startX);
    canvasScroller.scrollTop = panning.scrollTop - (event.clientY - panning.startY);
    return;
  }
  if (!interaction) return;
  const point = pointerToImage(event);
  if (interaction.mode === "draw") {
    updateDraft(interaction.draft, point, interaction.start);
  } else {
    const moveInteraction = interaction;
    const dx = point.x - moveInteraction.start.x;
    const dy = point.y - moveInteraction.start.y;
    const index = annotations.findIndex((item) => item.id === moveInteraction.id);
    if (index >= 0) {
      annotations[index] = moveAnnotation(moveInteraction.original, dx, dy);
    }
  }
  scheduleRender();
});

canvas.addEventListener("pointerup", (event) => {
  if (panning) {
    panning = null;
    canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = "";
    return;
  }
  if (!interaction) return;
  if (interaction.mode === "draw") {
    if (isValidAnnotation(interaction.draft)) {
      const previous = cloneAnnotations();
      annotations.push(interaction.draft);
      commitChange(previous);
      statusMessage.textContent = "要素を追加しました";
    }
  } else {
    const moveInteraction = interaction;
    const moved = annotations.find((item) => item.id === moveInteraction.id);
    if (moved && JSON.stringify(moved) !== JSON.stringify(moveInteraction.original)) {
      const previous = cloneAnnotations();
      const index = previous.findIndex((item) => item.id === moveInteraction.id);
      if (index >= 0) previous[index] = moveInteraction.original;
      commitChange(previous);
      statusMessage.textContent = "要素を移動しました";
    }
  }
  interaction = null;
  canvas.releasePointerCapture(event.pointerId);
  updateControls();
  scheduleRender();
});

canvas.addEventListener("pointercancel", () => {
  if (interaction?.mode === "move") {
    const moveInteraction = interaction;
    const index = annotations.findIndex((item) => item.id === moveInteraction.id);
    if (index >= 0) annotations[index] = moveInteraction.original;
  }
  interaction = null;
  panning = null;
  canvas.style.cursor = "";
  scheduleRender();
});

canvas.addEventListener("dblclick", (event) => {
  if (!sourceImage || currentTool !== "select" || event.button !== 0) return;
  const hit = hitTest(pointerToImage(event));
  if (hit?.type !== "text") return;
  event.preventDefault();
  selectedId = hit.id;
  updateControls();
  scheduleRender();
  startTextEditing(hit.position, hit);
});

canvas.addEventListener(
  "wheel",
  (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom(zoom * (event.deltaY < 0 ? 1.1 : 0.9));
  },
  { passive: false },
);

document.querySelectorAll<HTMLButtonElement>(".tool-btn").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool as Tool));
});

getElement<HTMLButtonElement>("openButton").addEventListener("click", () => fileInput.click());
getElement<HTMLButtonElement>("emptyOpenButton").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void openFile(file);
  fileInput.value = "";
});
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
deleteButton.addEventListener("click", deleteSelected);
downloadButton.addEventListener("click", () => void downloadImage());
zoomOutButton.addEventListener("click", () => setZoom(zoom / 1.2));
zoomInButton.addEventListener("click", () => setZoom(zoom * 1.2));
zoomResetButton.addEventListener("click", () => setZoom(1));
fitButton.addEventListener("click", fitToScreen);

colorInput.addEventListener("input", () => {
  colorText.value = colorInput.value.toUpperCase();
});
colorText.addEventListener("change", () => {
  if (/^#[0-9a-f]{6}$/i.test(colorText.value)) {
    colorInput.value = colorText.value;
    colorText.value = colorText.value.toUpperCase();
  } else {
    colorText.value = colorInput.value.toUpperCase();
    showToast("色は #EF4444 の形式で入力してください", true);
  }
});
textSizeInput.addEventListener("input", () => {
  textSizeValue.textContent = `${textSizeInput.value} px`;
});
lineWidthInput.addEventListener("input", () => {
  lineWidthValue.textContent = `${lineWidthInput.value} px`;
});
mosaicInput.addEventListener("input", () => {
  mosaicValue.textContent = `${mosaicInput.value} px`;
});
formatSelect.addEventListener("change", () => {
  qualitySetting.classList.toggle("hidden", formatSelect.value !== "jpeg");
});
qualityInput.addEventListener("input", () => {
  qualityValue.textContent = `${qualityInput.value}%`;
});

textEditorInput.addEventListener("input", resizeTextEditor);
textEditorInput.addEventListener("keydown", (event) => {
  if (event.isComposing) return;
  if (event.key === "Escape") {
    event.preventDefault();
    cancelTextEditing();
  } else if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    commitTextEditing();
  }
});
textEditorInput.addEventListener("blur", () => {
  if (textEditSession) commitTextEditing();
});
canvasScroller.addEventListener("scroll", positionTextEditor, { passive: true });

for (const eventName of ["dragenter", "dragover"]) {
  window.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropCard.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  window.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropCard.classList.remove("dragging");
  });
}
window.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files[0];
  if (file) void openFile(file);
});

window.addEventListener("paste", (event) => {
  if ((event.target as HTMLElement).matches("input, textarea")) return;
  const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
    entry.type.startsWith("image/"),
  );
  const file = item?.getAsFile();
  if (file) {
    const namedFile = new File([file], `screenshot-${Date.now()}.png`, { type: file.type });
    void openFile(namedFile);
  }
});

window.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement;
  if (target.matches("input, select, textarea")) return;
  const command = event.metaKey || event.ctrlKey;
  if (command && event.key.toLowerCase() === "o") {
    event.preventDefault();
    fileInput.click();
  } else if (command && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  } else if (command && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
  } else if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelected();
  } else if (event.key === " ") {
    event.preventDefault();
    spacePressed = true;
    if (sourceImage) canvas.style.cursor = "grab";
  } else if (event.key === "0") {
    fitToScreen();
  } else {
    const shortcuts: Record<string, Tool> = {
      v: "select",
      m: "mosaic",
      e: "ellipse",
      l: "line",
      a: "arrow",
      p: "freehand",
      t: "text",
      n: "number",
    };
    const tool = shortcuts[event.key.toLowerCase()];
    if (tool) setTool(tool);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === " ") {
    spacePressed = false;
    if (!panning) canvas.style.cursor = "";
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

window.addEventListener("resize", () => {
  if (sourceImage && zoom < 1) updateControls();
  positionTextEditor();
});

setTool("select");
updateControls();

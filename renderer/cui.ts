import { canvas, ctx } from "./canvas";

const mouse = new DOMPoint(0, 0);

export const MousePosition: DOMPointReadOnly = mouse;

const MouseButtonDown = new Set<number>();
const MouseButtonUp = new Set<number>(Array.from({ length: 5 }, (_, i) => i));
const MouseButtonPressed = new Set<number>();
const MouseButtonReleased = new Set<number>();
const MouseButtonRepeated = new Set<number>();

let mouseCaptureId = -1;
let mouseCaptureNextId = 0;

function isMouseCaptured() {
  return mouseCaptureId !== -1;
}

function isMouseCapturedBy(id: number) {
  return mouseCaptureId === id;
}

function captureMouse(id: number) {
  if (isMouseCaptured()) throw new Error("Mouse capture already in use");
  mouseCaptureId = id;
}

function releaseMouse(id: number) {
  if (!isMouseCapturedBy(id)) throw new Error("Mouse capture not in use");
  mouseCaptureId = -1;
}

let mousePressPosition = new DOMPoint(
  Number.NEGATIVE_INFINITY,
  Number.NEGATIVE_INFINITY
);

let mouseReleasePosition = new DOMPoint(
  Number.NEGATIVE_INFINITY,
  Number.NEGATIVE_INFINITY
);

let debugRow = 0;
let debugColumn = 0;

function debug(...args: any[]) {
  ctx.fillStyle = "#FFF";
  ctx.fillText(args.join(" "), debugColumn, debugRow);
  debugRow += 16;
  if (debugRow > canvas.height) {
    debugRow = canvas.height / 2;
    debugColumn += canvas.width / 4;
    if (debugColumn > canvas.width) throw new Error("Too many debug messages");
  }
}

const MOUSE_BUTTON_NAMES = ["LEFT", "MIDDLE", "RIGHT", "FORWARD", "BACK"];

function getButtonList(buttons: Set<number>) {
  return Array.from(buttons)
    .map((button) => MOUSE_BUTTON_NAMES[button] ?? button)
    .join(", ");
}

export function debugMouseState() {
  debug("Mouse");
  debug("Position:", mouse.x, mouse.y);
  debug("Down:", getButtonList(MouseButtonDown));
  debug("Up:", getButtonList(MouseButtonUp));
  debug("Pressed:", getButtonList(MouseButtonPressed));
  debug("Repeated:", getButtonList(MouseButtonRepeated));
  debug("Released:", getButtonList(MouseButtonReleased));
}

export function isMouseButtonDown(button: number) {
  return MouseButtonDown.has(button);
}

export function isMouseDown() {
  return MouseButtonDown.size > 0;
}

export function isMouseButtonUp(button: number) {
  return MouseButtonUp.has(button);
}

export function isMouseUp() {
  return MouseButtonUp.size > 0;
}

export function isMouseButtonPressed(button: number) {
  return MouseButtonPressed.has(button);
}

export function isMouseButtonReleased(button: number) {
  return MouseButtonReleased.has(button);
}

function updateMouseButtonState() {
  for (const button of MouseButtonDown) {
    if (MouseButtonPressed.has(button)) {
      MouseButtonPressed.add(button);
      MouseButtonRepeated.add(button);
    } else if (!MouseButtonRepeated.has(button)) {
      MouseButtonPressed.add(button);
    } else {
      MouseButtonPressed.delete(button);
    }
  }
  for (const button of MouseButtonUp) {
    if (MouseButtonPressed.has(button) || MouseButtonRepeated.has(button)) {
      MouseButtonReleased.add(button);
    } else {
      MouseButtonReleased.delete(button);
    }
    MouseButtonRepeated.delete(button);
    MouseButtonPressed.delete(button);
  }
}

export function enter() {
  debugRow = canvas.height / 2;
  mouseCaptureNextId = 0;
  ctx.reset();
  updateMouseButtonState();
}

export function exit() {
  styles.length = 1;
  layouts.length = 1;
  viewports.length = 1;
  MouseButtonReleased.clear();
}

const outside = {
  clientX: Number.NEGATIVE_INFINITY,
  clientY: Number.NEGATIVE_INFINITY,
} as const;

const onmousemove = (e: { clientX: number; clientY: number }) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
};

(canvas.onmousemove = onmousemove)(outside);
canvas.onmouseout = () => onmousemove(outside);

canvas.onmousedown = (e) => {
  MouseButtonDown.add(e.button);
  MouseButtonUp.delete(e.button);
};

canvas.onmouseup = (e) => {
  MouseButtonUp.add(e.button);
  MouseButtonDown.delete(e.button);
};

canvas.oncontextmenu = (e) => {
  e.preventDefault();
};

type Length = number | `${number}px` | `${number}rem`;
type CornerRule =
  | Length
  | `${Length}/${Length}`
  | [x: Length, y: Length]
  | { x: Length; y: Length }
  | DOMPointInit;

interface StyleRule extends Record<string, unknown> {
  padding: PaddingRule;
  radius: RadiusRule;
  fill: CanvasStyle;
  stroke: CanvasStyle;
  color: CanvasStyle;
}

type QuadValue<T> = T | [T] | [T, T] | [T, T, T, T];

type PaddingRule = QuadValue<Length>;
type RadiusRule = QuadValue<CornerRule>;
type CanvasStyle = string | CanvasGradient | CanvasPattern;

const PseudoSelectors = ["hover", "active"] as const;
type PseudoSelector = (typeof PseudoSelectors)[number];

type StyleDefintion = Partial<StyleRule> &
  Partial<Record<PseudoSelector, Partial<StyleRule>>>;

interface Style extends Record<string, StyleDefintion> {}

const styles: Style[] = [
  {
    button: {
      padding: [".25rem", ".5rem"],
      radius: "2px",
      fill: "#333",
      color: "#EEE",
      hover: {
        fill: "#555",
        color: "#FFF",
      },
      active: {
        fill: "#111",
        color: "#DDD",
      },
    },
  },
];

export function pushStyle<T>(props: Record<string, T>) {
  const current = styles.at(-1);
  const rules = Object.create(null);
  for (const selector in props) {
    const next = Object.create(current?.[selector] ?? null);
    Object.assign(next, props[selector]);
    for (const prop in props[selector]) {
      if (PseudoSelectors.includes(prop as PseudoSelector)) {
        const psnext = Object.create(current?.[selector]?.[prop] ?? null);
        Object.assign(psnext, props[selector]?.[prop]);
        next[prop] = psnext;
      }
    }
    rules[selector] = next;
  }
  styles.push(rules);
}

export function popStyle() {
  if (styles.length === 1) return;
  styles.pop();
}

export function getStyle<K extends keyof StyleRule>(selector: string, key: K) {
  const style = styles.at(-1);
  if (selector.includes(":")) {
    const [main, pseudo] = selector.split(":");
    return style?.[main]?.[pseudo as PseudoSelector]?.[key] as
      | StyleRule[K]
      | undefined;
  }
  return style?.[selector]?.[key] as StyleRule[K] | undefined;
}

export function getPaddingRule(selector: string) {
  const rule = getStyle(selector, "padding");
  return parsePaddingRule(rule);
}

export function getRadiusRule(selector: string) {
  const rule = getStyle(selector, "radius");
  return parseRadiusRule(rule);
}

export function parseLength(rule: Length): number {
  if (typeof rule === "number") return rule;
  if (rule.endsWith("px")) return Math.ceil(parseFloat(rule));
  if (rule.endsWith("rem")) return parseFloat(rule) * 16;
  throw new Error("Invalid length");
}

export function parsePaddingRule(
  rule?: PaddingRule
): [number, number, number, number] {
  if (!rule) return [0, 0, 0, 0];
  if (typeof rule === "number") return [rule, rule, rule, rule];
  if (Array.isArray(rule)) {
    const [top, right = top, bottom = top, left = right] = rule;
    return [
      parseLength(top),
      parseLength(right),
      parseLength(bottom),
      parseLength(left),
    ];
  }
  if (typeof rule === "string") {
    const [top, right = top, bottom = top, left = right] = rule.split(" ");
    return parsePaddingRule([
      top as Length,
      right as Length,
      bottom as Length,
      left as Length,
    ]);
  }
  throw new Error("Invalid padding rule");
}

type CanvasRadii = QuadValue<number | DOMPointInit>;

export function parseRadiusRule(rule?: RadiusRule): CanvasRadii {
  if (!rule) return 0;
  if (typeof rule === "number") return rule;
  if (Array.isArray(rule)) {
    return rule.map(parseRadiusRule) as CanvasRadii;
  }
  if (typeof rule === "string") {
    const parts = rule.split(" ");
    return parts.map((part) =>
      part.includes("/")
        ? part.split("/").reduce((point, value, index) => {
            point[index == 0 ? "x" : "y"] = parseLength(value as Length);
            return point;
          }, {} as DOMPointInit)
        : parseLength(part as Length)
    ) as CanvasRadii;
  }
  throw new Error("Invalid radius rule");
}

const viewportPadding = Math.random() * 100;
const viewports: [x: number, y: number, width: number, height: number][] = [
  [
    viewportPadding,
    viewportPadding,
    canvas.width - viewportPadding * 2,
    canvas.height - viewportPadding * 2,
  ],
];

export function pushViewport(
  x: number,
  y: number,
  width: number,
  height: number
) {
  viewports.push([x, y, width, height]);
}

export function popViewport() {
  if (viewports.length === 1) return;
  viewports.pop();
}

export function getViewport(): [
  x: number,
  y: number,
  width: number,
  height: number
] {
  return viewports.at(-1)!;
}

export function checkState(
  x: number,
  y: number,
  width: number,
  height: number
) {
  const id = mouseCaptureNextId++;

  if (isMouseCapturedBy(id)) {
    const clicked = isMouseButtonReleased(0);

    if (clicked) releaseMouse(id);

    return [false, true, clicked];
  }

  if (isMouseCaptured()) return [false, false, false];

  const over = checkHover(x, y, width, height, mouse.x, mouse.y);
  const down = over && isMouseDown();

  if (down) captureMouse(id);

  return [over, down, false];
}

export function checkHover(
  x: number,
  y: number,
  width: number,
  height: number,
  px: number,
  py: number
) {
  const [vx, vy, vw, vh] = getViewport();

  return inRect(vx, vy, vw, vh, px, py) && inRect(x, y, width, height, px, py);
}

function inRect(
  x: number,
  y: number,
  width: number,
  height: number,
  px: number,
  py: number
) {
  return x <= px && px <= x + width && y <= py && py <= y + height;
}

interface FlexLayoutContext {
  type: "flex";
}

interface GridLayoutContext {
  type: "grid";
}

interface StackLayoutContext {
  type: "stack";
}

interface AbsoluteLayoutContext {
  type: "absolute";
}

interface FlowLayoutContext {
  type: "flow";
  rowStart: number;
  columnStart: number;
  maxRowHeight: number;
}

type LayoutContext = FlexLayoutContext | FlowLayoutContext;

const layouts: LayoutContext[] = [
  {
    type: "flow",
    rowStart: 0,
    columnStart: 0,
    maxRowHeight: 0,
  },
];

type EndFlow = () => void;
const NilFn = () => {};

export function flow(scope?: () => void): EndFlow {
  const flow = {
    type: "flow",
    rowStart: 0,
    columnStart: 0,
    maxRowHeight: 0,
  } as const;
  pushLayout(flow);
  if (scope) {
    scope();
    popLayoutTo(flow);
    return NilFn;
  } else {
    return () => popLayoutTo(flow);
  }
}

export function pushLayout(context: LayoutContext) {
  layouts.push(context);
}

function popLayoutTo(context: LayoutContext) {
  const index = layouts.indexOf(context);
  if (index === -1) throw new Error("Invalid layout context");
  layouts.splice(index);
}

export function popLayout() {
  if (layouts.length === 1) return;
  layouts.pop();
}

export function getLayout(): LayoutContext {
  return layouts.at(-1)!;
}

function calculateFlowLayout(
  xOffset: number,
  yOffset: number,
  width: number,
  height: number,
  flow: FlowLayoutContext
): [number, number, number, number] {
  const [vx, vy, vw, vh] = getViewport();

  const ox = vx + flow.columnStart + xOffset;
  const oy = vy + flow.rowStart + yOffset;

  const potentialRight = ox + width;
  const viewportRight = vx + vw;

  // ctx.lineWidth = 1;
  // ctx.strokeStyle = "#0FF";
  // ctx.beginPath();
  // if (flow.rowStart > 0) {
  //   ctx.moveTo(vx, vy + flow.rowStart);
  //   ctx.lineTo(vx + vw, vy + flow.rowStart);
  // }
  // ctx.stroke();

  // ctx.strokeStyle = "#FF0";
  // ctx.beginPath();
  // if (flow.columnStart > 0) {
  //   ctx.moveTo(vx + flow.columnStart, vy);
  //   ctx.lineTo(vx + flow.columnStart, vy + vh);
  // }
  // ctx.stroke();

  // ctx.strokeStyle = "#F00";
  // ctx.beginPath();
  // if (potentialRight > viewportRight) {
  //   ctx.moveTo(potentialRight, vy);
  //   ctx.lineTo(potentialRight, vy + vh);
  // }
  // ctx.stroke();

  flow.maxRowHeight = Math.max(flow.maxRowHeight, height);

  if (potentialRight < viewportRight) {
    flow.columnStart += width;

    return [ox, oy, width, height];
  }

  flow.rowStart += flow.maxRowHeight;
  flow.columnStart = 0;
  flow.maxRowHeight = 0;

  return calculateFlowLayout(xOffset, yOffset, width, height, flow);
}

export function debugViewport(debugColor = "#F0F") {
  const [vx, vy, vw, vh] = getViewport();
  ctx.strokeStyle = debugColor;
  ctx.strokeRect(vx, vy, vw, vh);
}

export function calculateLayout(
  x: number,
  y: number,
  width: number,
  height: number
): [number, number, number, number] {
  const context = getLayout();
  switch (context.type) {
    case "flow":
      return calculateFlowLayout(x, y, width, height, context);
    default:
      throw new Error("Invalid layout context");
  }
}

export function button(label: string): boolean {
  const measure = ctx.measureText(label);
  const ascent = measure.actualBoundingBoxAscent;
  const decent = measure.actualBoundingBoxDescent;

  const height = ascent + decent;
  const width = measure.width;

  const [pt, pr, pb, pl] = getPaddingRule("button");
  const [rx, ry, rw, rh] = calculateLayout(
    0,
    0,
    width + pr + pl,
    height + pt + pb
  );

  const [hover, active, click] = checkState(rx, ry, rw, rh);

  const pseudo = active ? ":active" : hover ? ":hover" : "";
  const id = `button${pseudo}`;

  const radius = getRadiusRule("button");
  const fill = getStyle(id, "fill");
  const stroke = getStyle(id, "stroke");
  const color = getStyle(id, "color")!;

  const scale = active ? 0.9 : hover ? 1.05 : 1;

  const center = [rx + rw * 0.5, ry + rh * 0.5] as const;

  ctx.save();
  ctx.translate(...center);
  ctx.scale(scale, scale);
  ctx.translate(-center[0], -center[1]);

  renderBox(rx, ry, rw, rh, radius, stroke, fill);

  ctx.fillStyle = color;
  ctx.fillText(label, rx + pl * scale, ry + (pt + ascent));

  ctx.restore();

  return click;
}

export function box(x: number, y: number, width: number, height: number) {
  const radii = getRadiusRule("box");
  const fill = getStyle("box", "fill");
  const stroke = getStyle("box", "stroke");

  const [rx, ry, rw, rh] = calculateLayout(x, y, width, height);

  ctx.save();
  renderBox(rx, ry, rw, rh, radii, stroke, fill);
  ctx.restore();
}

function renderBox(
  x: number,
  y: number,
  width: number,
  height: number,
  radii: CanvasRadii | undefined,
  stroke: CanvasStyle | undefined,
  fill: CanvasStyle | undefined
) {
  const useRoundRect = !!radii;
  const useStrokeRect = !!stroke && !useRoundRect;
  const useFillRect = !!fill && !useRoundRect;

  if (useRoundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radii);
    if (fill != null) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke != null) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  } else if (useStrokeRect) {
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x, y, width, height);
  } else if (useFillRect) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
  }
}

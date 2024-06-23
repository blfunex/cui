export const canvas = document.createElement("canvas");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

Object.assign(canvas.style, {
  position: "absolute",
  inset: "0",
} satisfies Partial<CSSStyleDeclaration>);

document.body.appendChild(canvas);

window.addEventListener("resize", resize);

resize();

export const ctx = canvas.getContext("2d", {
  // alpha: false,
  colorSpace: "srgb",
  desynchronized: true,
  willReadFrequently: false,
})!;

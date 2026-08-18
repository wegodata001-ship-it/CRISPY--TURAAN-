const UNSUPPORTED_COLOR = /oklab|oklch|color-mix|lab\(|lch\(|color\(/i;

const COLOR_PROPS = [
  "color",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "column-rule-color",
  "caret-color",
  "fill",
  "stroke",
] as const;

export const PDF_SAFE = {
  background: "#fffaf6",
  foreground: "#3f2c24",
  primary: "#eca772",
  secondary: "#f6e9df",
  border: "#eadbd2",
  muted: "#8f786c",
} as const;

export function isUnsupportedCssColor(value: string): boolean {
  return UNSUPPORTED_COLOR.test(value);
}

/** Browser canvas converts oklab/oklch/color-mix into a HEX string html2canvas can parse. */
export function cssColorToHex(color: string): string {
  if (!color || color === "transparent" || color === "none" || color === "rgba(0, 0, 0, 0)") {
    return "transparent";
  }
  if (typeof document === "undefined") return PDF_SAFE.foreground;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return PDF_SAFE.foreground;
    ctx.fillStyle = "#000000";
    ctx.fillStyle = color;
    return ctx.fillStyle || PDF_SAFE.foreground;
  } catch {
    return PDF_SAFE.foreground;
  }
}

function parseRgbChannels(color: string): [number, number, number] | null {
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const raw = color.replace("#", "").trim();
  const hex = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (hex.length !== 6 || /[^0-9a-f]/i.test(hex)) return null;
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

export function mixHexWithWhite(hex: string, amount = 0.08): string {
  const channels = parseRgbChannels(hex);
  if (!channels) return "#ffffff";
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(channels[0])}, ${mix(channels[1])}, ${mix(channels[2])})`;
}

export function hexToRgba(color: string, alpha: number): string {
  const channels = parseRgbChannels(color);
  if (!channels) return `rgba(26,20,16,${alpha})`;
  return `rgba(${channels[0]},${channels[1]},${channels[2]},${alpha})`;
}

export function isDarkColor(color: string): boolean {
  const channels = parseRgbChannels(color);
  if (!channels) return false;
  return (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000 < 140;
}

function sanitizeElementColors(el: HTMLElement, view: Window): void {
  const cs = view.getComputedStyle(el);
  for (const prop of COLOR_PROPS) {
    const value = cs.getPropertyValue(prop);
    if (value && isUnsupportedCssColor(value)) {
      el.style.setProperty(prop, cssColorToHex(value), "important");
    }
  }

  const bgImage = cs.backgroundImage;
  if (bgImage && bgImage !== "none" && isUnsupportedCssColor(bgImage) && !bgImage.includes("url(")) {
    el.style.setProperty("background-image", "none", "important");
  }

  if (isUnsupportedCssColor(cs.boxShadow)) {
    el.style.setProperty("box-shadow", "none", "important");
  }
  if (isUnsupportedCssColor(cs.textShadow)) {
    el.style.setProperty("text-shadow", "none", "important");
  }

  el.style.setProperty("backdrop-filter", "none", "important");
  el.style.setProperty("-webkit-backdrop-filter", "none", "important");
  el.style.setProperty("filter", "none", "important");
}

/**
 * Makes a node safe for HTML→canvas capture: HEX/RGB only, no scale, no oklab.
 * Use on the off-screen export tree — never on the scaled preview.
 */
export function preparePdfExportNode(node: HTMLElement): void {
  const view = node.ownerDocument.defaultView ?? window;
  node.classList.add("pdf-export-mode", "pdf-export-page");
  node.style.setProperty("transform", "none", "important");
  node.style.setProperty("width", "794px", "important");
  node.style.setProperty("height", "1123px", "important");
  node.style.setProperty("margin", "0", "important");
  node.style.setProperty("box-shadow", "none", "important");
  node.style.setProperty("overflow", "hidden", "important");
  node.style.setProperty("direction", "rtl", "important");
  node.style.setProperty("background-color", node.style.backgroundColor || PDF_SAFE.background, "important");
  node.style.setProperty("color", node.style.color || PDF_SAFE.foreground, "important");
  node.style.setProperty("border-color", PDF_SAFE.border, "important");
  node.style.setProperty("-webkit-print-color-adjust", "exact");
  node.style.setProperty("print-color-adjust", "exact");

  sanitizeElementColors(node, view);
  const tree = node.querySelectorAll<HTMLElement>("*");
  tree.forEach((el) => sanitizeElementColors(el, view));
}

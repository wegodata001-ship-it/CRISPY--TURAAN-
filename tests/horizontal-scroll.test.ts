import { describe, expect, it, vi } from "vitest";
import {
  getHorizontalOverflowState,
  scrollHorizontalBy,
} from "@/lib/dom/horizontal-scroll";

function mockRect(
  el: HTMLElement,
  rect: Partial<DOMRect> & Pick<DOMRect, "left" | "right" | "width">
) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    top: 0,
    bottom: 40,
    height: 40,
    x: rect.left,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect);
}

describe("getHorizontalOverflowState", () => {
  it("reports no overflow when content fits", () => {
    const container = document.createElement("div");
    const a = document.createElement("button");
    const b = document.createElement("button");
    container.append(a, b);
    Object.defineProperty(container, "scrollWidth", { value: 200 });
    Object.defineProperty(container, "clientWidth", { value: 200 });
    mockRect(container, { left: 0, right: 200, width: 200 });
    mockRect(a, { left: 0, right: 100, width: 100 });
    mockRect(b, { left: 100, right: 200, width: 100 });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      direction: "ltr",
    } as CSSStyleDeclaration);

    expect(getHorizontalOverflowState(container)).toEqual({
      canScrollStart: false,
      canScrollEnd: false,
      hasOverflow: false,
    });
  });

  it("detects end overflow in LTR", () => {
    const container = document.createElement("div");
    const a = document.createElement("button");
    const b = document.createElement("button");
    container.append(a, b);
    Object.defineProperty(container, "scrollWidth", { value: 400 });
    Object.defineProperty(container, "clientWidth", { value: 200 });
    mockRect(container, { left: 0, right: 200, width: 200 });
    mockRect(a, { left: 0, right: 100, width: 100 });
    mockRect(b, { left: 300, right: 400, width: 100 });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      direction: "ltr",
    } as CSSStyleDeclaration);

    expect(getHorizontalOverflowState(container)).toEqual({
      canScrollStart: false,
      canScrollEnd: true,
      hasOverflow: true,
    });
  });

  it("detects end overflow in RTL (last child past left edge)", () => {
    const container = document.createElement("div");
    const a = document.createElement("button");
    const b = document.createElement("button");
    container.append(a, b);
    Object.defineProperty(container, "scrollWidth", { value: 400 });
    Object.defineProperty(container, "clientWidth", { value: 200 });
    mockRect(container, { left: 0, right: 200, width: 200 });
    // first at inline-start (right), last clipped on the left
    mockRect(a, { left: 100, right: 200, width: 100 });
    mockRect(b, { left: -100, right: 0, width: 100 });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      direction: "rtl",
    } as CSSStyleDeclaration);

    expect(getHorizontalOverflowState(container)).toEqual({
      canScrollStart: false,
      canScrollEnd: true,
      hasOverflow: true,
    });
  });
});

describe("scrollHorizontalBy", () => {
  it("returns false when scroll cannot move", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollWidth", { value: 100 });
    Object.defineProperty(el, "clientWidth", { value: 100 });
    el.scrollLeft = 0;
    el.scrollBy = vi.fn();
    // children for overflow state
    const child = document.createElement("span");
    el.append(child);
    mockRect(el, { left: 0, right: 100, width: 100 });
    mockRect(child, { left: 0, right: 100, width: 100 });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      direction: "ltr",
    } as CSSStyleDeclaration);

    expect(scrollHorizontalBy(el, 40, "smooth")).toBe(false);
  });
});

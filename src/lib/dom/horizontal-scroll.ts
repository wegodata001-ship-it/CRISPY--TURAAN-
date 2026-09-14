/**
 * RTL-safe horizontal scroll helpers.
 * Avoid relying on a single scrollLeft convention across Chrome/Firefox/Safari.
 */

const EDGE_EPS = 2;

export type HorizontalOverflowState = {
  canScrollStart: boolean;
  canScrollEnd: boolean;
  hasOverflow: boolean;
};

/** Detect overflow using element boxes (works in LTR and RTL). */
export function getHorizontalOverflowState(
  container: HTMLElement
): HorizontalOverflowState {
  const maxScroll = container.scrollWidth - container.clientWidth;
  if (maxScroll <= EDGE_EPS) {
    return { canScrollStart: false, canScrollEnd: false, hasOverflow: false };
  }

  const children = Array.from(container.children) as HTMLElement[];
  if (children.length === 0) {
    return { canScrollStart: false, canScrollEnd: false, hasOverflow: false };
  }

  const cRect = container.getBoundingClientRect();
  const first = children[0]!.getBoundingClientRect();
  const last = children[children.length - 1]!.getBoundingClientRect();
  const dir = getComputedStyle(container).direction;

  if (dir === "rtl") {
    // inline-start = right, inline-end = left
    return {
      hasOverflow: true,
      canScrollStart: first.right > cRect.right + EDGE_EPS,
      canScrollEnd: last.left < cRect.left - EDGE_EPS,
    };
  }

  return {
    hasOverflow: true,
    canScrollStart: first.left < cRect.left - EDGE_EPS,
    canScrollEnd: last.right > cRect.right + EDGE_EPS,
  };
}

/**
 * Scroll horizontally by `delta` pixels toward the inline-end when positive.
 * Probes browser RTL scrollLeft sign so Chrome + Firefox both work.
 */
export function scrollHorizontalBy(
  container: HTMLElement,
  deltaTowardEnd: number,
  behavior: ScrollBehavior = "auto"
): boolean {
  if (deltaTowardEnd === 0) return false;

  const before = container.scrollLeft;
  container.scrollBy({ left: deltaTowardEnd, behavior });

  if (behavior === "smooth") {
    // Assume it will move if overflow exists in that direction
    const state = getHorizontalOverflowState(container);
    return deltaTowardEnd > 0 ? state.canScrollEnd : state.canScrollStart;
  }

  if (container.scrollLeft !== before) return true;

  // Firefox RTL often needs the opposite sign
  container.scrollBy({ left: -deltaTowardEnd, behavior });
  return container.scrollLeft !== before;
}

/** Content follows the pointer (natural drag). */
export function applyHorizontalDrag(container: HTMLElement, movementX: number): void {
  if (movementX === 0) return;
  const before = container.scrollLeft;
  container.scrollLeft = before - movementX;
  if (container.scrollLeft === before) {
    container.scrollLeft = before + movementX;
  }
}

/** Center a child in the scroller without scrolling the page vertically. */
export function scrollChildIntoHorizontalView(
  container: HTMLElement,
  child: HTMLElement,
  behavior: ScrollBehavior = "smooth"
): void {
  const cRect = container.getBoundingClientRect();
  const eRect = child.getBoundingClientRect();
  // Viewport-space delta: positive = child is to the right of center.
  // scrollBy({ left: +n }) shifts content leftward on screen in all major engines,
  // which moves a right-side child toward center (geometry, not scrollLeft sign).
  const visualDelta =
    (eRect.left + eRect.right) / 2 - (cRect.left + cRect.right) / 2;
  if (Math.abs(visualDelta) < EDGE_EPS) return;

  const before = container.scrollLeft;
  container.scrollBy({ left: visualDelta, behavior });
  if (behavior === "auto" && container.scrollLeft === before) {
    container.scrollBy({ left: -visualDelta, behavior });
  }
}

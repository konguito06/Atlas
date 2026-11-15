import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount rendered components so tests do not leak DOM into each other.
afterEach(cleanup);

// The simulated browser has no layout, and the document editor asks where
// the cursor is on screen. Answer "nowhere" instead of crashing.
const noRects = Object.assign([], {
  item: () => null,
}) as unknown as DOMRectList;
Range.prototype.getClientRects = () => noRects;
Range.prototype.getBoundingClientRect = () => new DOMRect();
document.elementFromPoint = () => null;

// Settings kept on the device must not carry over from one test to the next.
afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

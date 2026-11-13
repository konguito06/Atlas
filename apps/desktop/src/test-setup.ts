import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount rendered components so tests do not leak DOM into each other.
afterEach(cleanup);

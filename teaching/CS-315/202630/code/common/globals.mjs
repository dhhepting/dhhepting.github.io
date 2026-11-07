// Bridge for the unmodified textbook code: exposes the modern helpers as the
// globals the old scripts expect.
import * as MV from './MV.mjs';
import { initShaders } from './initShadersHTML.mjs';

// defineProperty rather than assignment: some names (e.g. `length`) collide
// with accessor properties on window, and plain assignment would throw.
for (const [name, value] of Object.entries({ ...MV, initShaders })) {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}

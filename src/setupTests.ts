// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom';

// =============================================================================
// setupTests.ts
// Test environment configuration for the TMK Modeller application.
//
// This file is executed automatically by Jest before every test suite,
// thanks to the "setupFilesAfterFramework" entry in the Jest / CRA config.
// Anything placed here runs once per test-file, after the test framework
// (Jest) has been installed in the environment but before any test code runs.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. JEST-DOM — EXTENDED DOM MATCHERS
// Importing this module augments Jest's `expect` with semantic, DOM-aware
// matchers such as:
//   • toBeInTheDocument()  — element exists in the rendered DOM
//   • toBeVisible()        — element is not hidden by CSS / attributes
//   • toBeDisabled()       — form control is disabled
//   • toHaveTextContent()  — element contains a specific string
//   • toHaveValue()        — input / select holds a given value
//   • toHaveStyle()        — element carries specific inline / computed styles
//
// These are far more expressive than plain `toBeTruthy()` or `not.toBeNull()`,
// and produce clearer failure messages when assertions fail.
//
// The wildcard import path '@testing-library/jest-dom' automatically pulls in
// the side-effect that registers the matchers — no named import is needed.
// -----------------------------------------------------------------------------
import '@testing-library/jest-dom';

// -----------------------------------------------------------------------------
// 2. LOCALSTORAGE MOCK
// App.tsx persists form state to localStorage and rehydrates on first render.
// jsdom (Jest's default browser emulator) ships a *real* localStorage
// implementation that persists data across tests in the same file, which can
// cause brittle, order-dependent failures.
//
// We replace it with a lightweight in-memory mock that:
//   a) Resets between every test via `beforeEach` / `afterEach` (see below).
//   b) Exposes Jest spy functions so individual tests can assert
//      that the app called setItem / getItem the correct number of times.
//
// The mock satisfies the full Storage interface so TypeScript is happy.
// -----------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem:     jest.fn((key: string)                => store[key] ?? null),
    setItem:     jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem:  jest.fn((key: string)                => { delete store[key]; }),
    clear:       jest.fn(()                           => { store = {}; }),
    // Convenience helper used in afterEach to wipe both the store and the
    // recorded call history of every spy.
    _reset() {
      store = {};
      (this.getItem     as jest.Mock).mockClear();
      (this.setItem     as jest.Mock).mockClear();
      (this.removeItem  as jest.Mock).mockClear();
      (this.clear       as jest.Mock).mockClear();
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value:    localStorageMock,
  writable: true, // Allows individual tests to swap it out further if needed
});

// -----------------------------------------------------------------------------
// 3. MATCHMEDIA HELPER
// Reusable factory — use this in tests to simulate dark/light mode.
// The base mock lives in setupMocks.ts; this just re-assigns the value.
//
// Usage in a test file:
//   import { setMatchMedia } from '../setupTests';
//   beforeEach(() => setMatchMedia(true)); // simulate dark mode
// -----------------------------------------------------------------------------
const createMatchMedia = (matches: boolean) =>
  jest.fn().mockImplementation((query: string): MediaQueryList => ({
    matches,
    media:               query,
    onchange:            null,
    addListener:         jest.fn(),
    removeListener:      jest.fn(),
    addEventListener:    jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent:       jest.fn(() => false),
  }));

// Wrap the initialization in a beforeEach block.
// This ensures that even if Jest wipes mock implementations between tests,
// window.matchMedia is freshly populated with its implementation right before the test starts.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable:     true,
    configurable: true,             
    value:        createMatchMedia(false), // Default: light mode
  });
});

export const setMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable:     true,
    configurable: true,
    value:        createMatchMedia(matches),
  });
};

// -----------------------------------------------------------------------------
// 4. URL MOCK — createObjectURL / revokeObjectURL
// App.tsx's `handleSave` function creates a temporary blob URL so the browser
// can trigger a file download:
//   const url = URL.createObjectURL(blob);
//   ...
//   URL.revokeObjectURL(url);
//
// jsdom does not implement either method, so they must be stubbed.
// We use `jest.fn()` so tests can assert the save handler created and then
// cleaned up exactly one URL (preventing memory leaks).
// -----------------------------------------------------------------------------
beforeEach(() => {
  global.URL.createObjectURL = jest.fn().mockImplementation(() => 'blob:mock-object-url');
  global.URL.revokeObjectURL = jest.fn();
});

// -----------------------------------------------------------------------------
// 5. ANCHOR CLICK MOCK — <a>.click()
// `handleSave` programmatically calls `.click()` on an `<a>` element to
// trigger the browser's download dialogue.  jsdom logs a "Not implemented"
// warning for this and does not actually click the element, but the call still
// needs to exist without throwing so the surrounding handler completes.
//
// We silence the warning and capture calls with a Jest spy by overriding
// HTMLAnchorElement's prototype method.
// -----------------------------------------------------------------------------
beforeEach(() => {
  HTMLAnchorElement.prototype.click = jest.fn();
});

// -----------------------------------------------------------------------------
// 6. CONSOLE FILTER — Suppress known, noisy MUI warnings in test output
// MUI emits a number of `console.error` messages that are expected during
// testing (e.g. "Warning: An update to X inside a test was not wrapped in
// act(...)").  These clutter the test output without indicating real failures.
//
// We selectively suppress messages that match known MUI / React patterns while
// letting genuine errors (e.g. unhandled exceptions) through unmodified.
//
// ⚠ Adjust or remove this block if you want to audit all console output.
// -----------------------------------------------------------------------------
const SUPPRESSED_PATTERNS: RegExp[] = [
  /Warning.*not wrapped in act/,
  /Warning.*ReactDOM.render is no longer supported/,
  /MUI:.*/, // General MUI prop-type or configuration warnings
];

const originalConsoleError = console.error.bind(console);

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (SUPPRESSED_PATTERNS.some(pattern => pattern.test(message))) return;
    originalConsoleError(...args);
  });
});

// -----------------------------------------------------------------------------
// 7. PER-TEST TEARDOWN
// After every individual test:
//   a) Reset the localStorage mock (wipes the in-memory store AND clears spy
//      call history) so no test bleeds state into the next.
//   b) Clear URL mock call history for the same reason.
//   c) Clear the anchor click spy.
// -----------------------------------------------------------------------------
afterEach(() => {
  localStorageMock._reset();
  (global.URL.createObjectURL as jest.Mock).mockClear();
  (global.URL.revokeObjectURL as jest.Mock).mockClear();
  (HTMLAnchorElement.prototype.click as jest.Mock).mockClear();
});

// -----------------------------------------------------------------------------
// 8. GLOBAL TEARDOWN
// After all tests in the file have finished, restore console.error to its
// original implementation so that the mock does not leak into unrelated
// test utilities (e.g. the coverage reporter).
// -----------------------------------------------------------------------------
afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});
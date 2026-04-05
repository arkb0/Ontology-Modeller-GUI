// src/setupMocks.ts
// =============================================================================
// setupMocks.ts
// These mocks MUST be defined before any module (including MUI) is imported.
// This file runs via "setupFiles" in jest.config, which executes BEFORE the
// test framework and before any module resolution occurs.
// =============================================================================

// -----------------------------------------------------------------------------
// MATCHMEDIA MOCK
// Must be defined here (not in setupTests.ts) because MUI reads
// window.matchMedia at module-evaluation time, before setupFilesAfterFramework
// has a chance to run.
// -----------------------------------------------------------------------------
Object.defineProperty(window, 'matchMedia', {
  writable:     true,
  configurable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches:             false,   // default: no dark mode
    media:               query,
    onchange:            null,
    addListener:         jest.fn(),   // deprecated but used by older MUI
    removeListener:      jest.fn(),
    addEventListener:    jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent:       jest.fn(() => false),
  })),
});

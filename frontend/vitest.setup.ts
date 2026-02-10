import '@testing-library/jest-dom'

// Polyfill ResizeObserver for jsdom (required by Chakra UI v3 / floating-ui)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

// Polyfill Element.scrollTo for jsdom (required by Zag.js Select)
if (typeof Element.prototype.scrollTo === 'undefined') {
  Element.prototype.scrollTo = function () {}
}

// Polyfill Element.scrollIntoView for jsdom if missing
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = function () {}
}

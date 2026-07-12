import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Auto cleanup setelah setiap test
afterEach(cleanup)

// Mock window.matchMedia (Recharts needs it)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver (Recharts charts)
global.ResizeObserver = class {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}

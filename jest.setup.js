import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: '1', email: 'test@test.com', name: 'Test User' }
    },
    status: 'authenticated'
  }),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Mock FormData
global.FormData = class FormData {
  constructor() {
    this.data = new Map()
  }
  
  append(key, value) {
    if (!this.data.has(key)) {
      this.data.set(key, [])
    }
    this.data.get(key).push(value)
  }
  
  get(key) {
    const values = this.data.get(key)
    return values ? values[0] : null
  }
  
  getAll(key) {
    return this.data.get(key) || []
  }
}
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock das dependências
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: {
      findUnique: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/admin/visits POST - Cart Data Fix Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('deve retornar carrinho com items do banco quando cartData está disponível', async () => {
    const mockVisit = {
      id: 'visit-123',
      sessionId: 'session-123',
      whatsapp: '11987654321',
      hasCart: true,
      cartValue: 150.75,
      cartItems: 2,
      cartData: JSON.stringify({
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            name: 'Produto Teste 1',
            quantity: 1,
            unitPrice: 50.25,
            modelName: 'Modelo A'
          },
          {
            id: 'item-2',
            productId: 'prod-2',
            name: 'Produto Teste 2',
            quantity: 2,
            unitPrice: 50.25,
            modelName: 'Modelo B'
          }
        ],
        total: 150.75
      }),
      sessionDuration: 300,
      searchTerms: JSON.stringify(['produto teste']),
      categoriesVisited: JSON.stringify([{ name: 'Categoria A', visits: 3, lastVisit: Date.now() }]),
      productsViewed: JSON.stringify([{ id: 'prod-1', name: 'Produto Teste', category: 'Categoria A', visits: 1, lastView: Date.now() }]),
      lastActivity: new Date(),
      startTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockPrisma.visit.findUnique.mockResolvedValue(mockVisit as any)

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cart).toBeDefined()
    expect(data.cart.sessionId).toBe('session-123')
    expect(data.cart.items).toHaveLength(2)
    expect(data.cart.items[0]).toEqual({
      id: 'item-1',
      name: 'Produto Teste 1',
      modelName: 'Modelo A',
      quantity: 1,
      unitPrice: 50.25,
      totalPrice: 50.25
    })
    expect(data.cart.total).toBe(150.75)
  })

  it('deve retornar carrinho vazio quando cartData é null no banco', async () => {
    const mockVisit = {
      id: 'visit-123',
      sessionId: 'session-123',
      whatsapp: '11987654321',
      hasCart: true,
      cartValue: 100.50,
      cartItems: 1,
      cartData: null,
      sessionDuration: 300,
      searchTerms: JSON.stringify([]),
      categoriesVisited: JSON.stringify([]),
      productsViewed: JSON.stringify([]),
      lastActivity: new Date(),
      startTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockPrisma.visit.findUnique.mockResolvedValue(mockVisit as any)

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cart.items).toHaveLength(0)
    expect(data.cart.total).toBe(100.50)
  })

  it('deve tratar erro de parse do cartData graciosamente', async () => {
    const mockVisit = {
      id: 'visit-123',
      sessionId: 'session-123',
      whatsapp: '11987654321',
      hasCart: true,
      cartValue: 100.50,
      cartItems: 1,
      cartData: 'invalid json',
      sessionDuration: 300,
      searchTerms: JSON.stringify([]),
      categoriesVisited: JSON.stringify([]),
      productsViewed: JSON.stringify([]),
      lastActivity: new Date(),
      startTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockPrisma.visit.findUnique.mockResolvedValue(mockVisit as any)

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cart.items).toHaveLength(0)
    expect(data.cart.total).toBe(100.50)
  })

  it('deve usar total do cartData quando disponível', async () => {
    const mockVisit = {
      id: 'visit-123',
      sessionId: 'session-123',
      whatsapp: '11987654321',
      hasCart: true,
      cartValue: 100.50, // valor diferente no cartValue
      cartItems: 1,
      cartData: JSON.stringify({
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            name: 'Produto Teste',
            quantity: 1,
            unitPrice: 75.25,
            modelName: 'Modelo A'
          }
        ],
        total: 200.00 // valor correto no cartData
      }),
      sessionDuration: 300,
      searchTerms: JSON.stringify([]),
      categoriesVisited: JSON.stringify([]),
      productsViewed: JSON.stringify([]),
      lastActivity: new Date(),
      startTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockPrisma.visit.findUnique.mockResolvedValue(mockVisit as any)

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cart.total).toBe(200.00) // deve usar o valor do cartData
  })

  it('deve calcular totalPrice corretamente para cada item', async () => {
    const mockVisit = {
      id: 'visit-123',
      sessionId: 'session-123',
      whatsapp: '11987654321',
      hasCart: true,
      cartValue: 150.75,
      cartItems: 2,
      cartData: JSON.stringify({
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            name: 'Produto Teste 1',
            quantity: 3,
            unitPrice: 25.50
          },
          {
            id: 'item-2',
            productId: 'prod-2',
            name: 'Produto Teste 2',
            quantity: 2,
            unitPrice: 37.25
          }
        ],
        total: 150.75
      }),
      sessionDuration: 300,
      searchTerms: JSON.stringify([]),
      categoriesVisited: JSON.stringify([]),
      productsViewed: JSON.stringify([]),
      lastActivity: new Date(),
      startTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockPrisma.visit.findUnique.mockResolvedValue(mockVisit as any)

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cart.items[0].totalPrice).toBe(76.50) // 3 * 25.50
    expect(data.cart.items[1].totalPrice).toBe(74.50) // 2 * 37.25
  })
})
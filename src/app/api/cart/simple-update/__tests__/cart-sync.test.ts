import { POST } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// Mock das dependências
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: {
      upsert: jest.fn(),
    },
  },
}))

jest.mock('fs')
jest.mock('path')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockFs = fs as jest.Mocked<typeof fs>
const mockPath = path as jest.Mocked<typeof path>

describe('/api/cart/simple-update POST - Cart Sync Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup path mocks
    mockPath.join.mockImplementation((...paths) => paths.join('/'))
    
    // Mock process.cwd()
    jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd')
    
    // Mock file operations
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue(JSON.stringify([]))
    mockFs.writeFileSync.mockImplementation(() => {})
    mockFs.mkdirSync.mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('deve sincronizar carrinho com items no banco de dados', async () => {
    const mockCartData = {
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          name: 'Produto Teste',
          quantity: 2,
          unitPrice: 50.25
        }
      ],
      total: 100.50
    }

    mockPrisma.visit.upsert.mockResolvedValue({
      id: 'visit-123',
      sessionId: 'session-123'
    } as any)

    const request = new NextRequest('http://localhost/api/cart/simple-update', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        whatsapp: '11987654321',
        cartData: mockCartData,
        lastActivity: new Date().toISOString()
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('Carrinho salvo com sucesso')

    // Verificar se upsert foi chamado com dados corretos
    expect(mockPrisma.visit.upsert).toHaveBeenCalledWith({
      where: { sessionId: 'session-123' },
      update: {
        hasCart: true,
        cartValue: 100.50,
        cartItems: 1,
        cartData: JSON.stringify({
          items: mockCartData.items,
          total: 100.50
        }),
        lastActivity: expect.any(Date),
        whatsapp: '11987654321'
      },
      create: {
        sessionId: 'session-123',
        whatsapp: '11987654321',
        hasCart: true,
        cartValue: 100.50,
        cartItems: 1,
        cartData: JSON.stringify({
          items: mockCartData.items,
          total: 100.50
        }),
        lastActivity: expect.any(Date),
        startTime: expect.any(Date)
      }
    })
  })

  it('deve sincronizar carrinho vazio removendo dados do banco', async () => {
    const mockCartData = {
      items: [],
      total: 0
    }

    mockPrisma.visit.upsert.mockResolvedValue({
      id: 'visit-123',
      sessionId: 'session-123'
    } as any)

    const request = new NextRequest('http://localhost/api/cart/simple-update', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        whatsapp: '11987654321',
        cartData: mockCartData,
        lastActivity: new Date().toISOString()
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.removed).toBe(true)

    // Verificar se upsert foi chamado para limpar dados
    expect(mockPrisma.visit.upsert).toHaveBeenCalledWith({
      where: { sessionId: 'session-123' },
      update: {
        hasCart: false,
        cartValue: null,
        cartItems: null,
        cartData: null,
        lastActivity: expect.any(Date),
        whatsapp: '11987654321'
      },
      create: {
        sessionId: 'session-123',
        whatsapp: '11987654321',
        hasCart: false,
        cartValue: null,
        cartItems: null,
        cartData: null,
        lastActivity: expect.any(Date),
        startTime: expect.any(Date)
      }
    })
  })

  it('deve continuar funcionamento mesmo com erro na sincronização', async () => {
    const mockCartData = {
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          name: 'Produto Teste',
          quantity: 1,
          unitPrice: 50.25
        }
      ],
      total: 50.25
    }

    // Simular erro no banco
    mockPrisma.visit.upsert.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost/api/cart/simple-update', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        whatsapp: '11987654321',
        cartData: mockCartData,
        lastActivity: new Date().toISOString()
      })
    })

    const response = await POST(request)
    const data = await response.json()

    // Deve continuar funcionando apesar do erro no banco
    expect(response.status).toBe(200)
    expect(data.message).toContain('Carrinho salvo com sucesso')
  })

  it('deve preservar whatsapp null quando não fornecido', async () => {
    const mockCartData = {
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          name: 'Produto Teste',
          quantity: 1,
          unitPrice: 50.25
        }
      ],
      total: 50.25
    }

    mockPrisma.visit.upsert.mockResolvedValue({
      id: 'visit-123',
      sessionId: 'session-123'
    } as any)

    const request = new NextRequest('http://localhost/api/cart/simple-update', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        cartData: mockCartData,
        lastActivity: new Date().toISOString()
      })
    })

    const response = await POST(request)
    
    expect(response.status).toBe(200)

    // Verificar se whatsapp é null
    const upsertCall = mockPrisma.visit.upsert.mock.calls[0][0]
    expect(upsertCall.update.whatsapp).toBeUndefined()
    expect(upsertCall.create.whatsapp).toBe(null)
  })

  it('deve validar dados do carrinho antes de sincronizar', async () => {
    const invalidCartData = {
      items: [
        {
          id: 'item-1',
          // productId missing
          name: 'Produto Teste',
          quantity: 1,
          unitPrice: 50.25
        }
      ],
      total: 50.25
    }

    const request = new NextRequest('http://localhost/api/cart/simple-update', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        cartData: invalidCartData,
        lastActivity: new Date().toISOString()
      })
    })

    const response = await POST(request)
    
    expect(response.status).toBe(400)
    expect(mockPrisma.visit.upsert).not.toHaveBeenCalled()
  })
})
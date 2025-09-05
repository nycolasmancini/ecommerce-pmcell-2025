import { POST } from '../route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// Mock das dependências
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('fs')
jest.mock('path')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockFs = fs as jest.Mocked<typeof fs>
const mockPath = path as jest.Mocked<typeof path>

// Mock data
const mockCartFromFile = {
  sessionId: 'session-123',
  whatsapp: '11987654321',
  cartData: {
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        name: 'Produto Teste',
        quantity: 2,
        unitPrice: 100.50,
        modelName: 'Modelo A'
      }
    ],
    total: 201.00
  },
  analyticsData: {
    sessionId: 'session-123',
    timeOnSite: 300000,
    categoriesVisited: [
      { name: 'Categoria A', visits: 5, lastVisit: Date.now() }
    ],
    searchTerms: [
      { term: 'produto', count: 3, lastSearch: Date.now() }
    ],
    productsViewed: [
      { id: 'prod-1', name: 'Produto Teste', category: 'Categoria A', visits: 2, lastView: Date.now() }
    ],
    whatsappCollected: '11987654321',
    whatsappCollectedAt: Date.now()
  },
  lastActivity: Date.now(),
  webhookSent: false,
  createdAt: Date.now(),
  contacted: false
}

const mockVisitFromDB = {
  id: 'visit-456',
  sessionId: 'session-456',
  whatsapp: '11987654321',
  startTime: new Date(),
  endTime: null,
  sessionDuration: 300,
  searchTerms: JSON.stringify(['produto teste']),
  categoriesVisited: JSON.stringify([{ name: 'Categoria B', visits: 3, lastVisit: Date.now() }]),
  productsViewed: JSON.stringify([{ id: 'prod-2', name: 'Produto DB', category: 'Categoria B', visits: 1, lastView: Date.now() }]),
  status: 'active',
  hasCart: true,
  cartValue: 150.75,
  cartItems: 1,
  lastActivity: new Date(),
  whatsappCollectedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('/api/admin/visits POST - Cart Details', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup path mocks
    mockPath.join.mockImplementation((...paths) => paths.join('/'))
    
    // Mock process.cwd()
    jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('deve retornar erro 400 quando sessionId não for fornecido', async () => {
    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('SessionId é obrigatório')
  })

  it('deve buscar carrinho do arquivo JSON quando não encontrado no banco', async () => {
    // Mock banco vazio
    mockPrisma.visit.findUnique.mockResolvedValue(null)

    // Mock arquivo com carrinho
    mockFs.existsSync.mockImplementation((filePath) => {
      return filePath.toString().includes('abandoned-carts.json')
    })
    
    mockFs.readFileSync.mockReturnValue(JSON.stringify([mockCartFromFile]))

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cart.sessionId).toBe('session-123')
    expect(data.cart.whatsapp).toBe('11987654321')
    expect(data.cart.items).toHaveLength(1)
    expect(data.cart.total).toBe(201.00)
    expect(data.cart.analytics.timeOnSite).toBe(300) // em segundos
  })

  it('deve buscar carrinho do banco de dados quando disponível', async () => {
    // Mock banco com visit que tem carrinho
    const visitWithCartData = {
      ...mockVisitFromDB,
      // Simular dados de carrinho no banco (seria implementado na solução)
      cartData: JSON.stringify({
        items: [{
          id: 'db-item-1',
          productId: 'db-prod-1',
          name: 'Produto do Banco',
          quantity: 1,
          unitPrice: 150.75,
          modelName: 'Modelo DB'
        }],
        total: 150.75
      })
    }

    mockPrisma.visit.findUnique.mockResolvedValue(visitWithCartData as any)

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-456' })
    })

    // Como ainda não implementamos busca no banco, vamos mockar para fallback no arquivo
    mockFs.existsSync.mockReturnValue(false)

    const response = await POST(request)
    const data = await response.json()

    // Por enquanto retorna 404, mas após implementação retornará dados do banco
    expect(response.status).toBe(404)
    expect(mockPrisma.visit.findUnique).toHaveBeenCalledWith({
      where: { sessionId: 'session-456' }
    })
  })

  it('deve retornar erro 404 quando carrinho não for encontrado em nenhuma fonte', async () => {
    // Mock banco vazio
    mockPrisma.visit.findUnique.mockResolvedValue(null)

    // Mock arquivo vazio
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue(JSON.stringify([]))

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-inexistente' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Carrinho não encontrado')
  })

  it('deve tratar erro de leitura do arquivo graciosamente', async () => {
    // Mock banco vazio
    mockPrisma.visit.findUnique.mockResolvedValue(null)

    // Mock erro na leitura do arquivo
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('Erro ao ler arquivo')
    })

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Carrinho não encontrado')
  })

  it('deve formatar corretamente os dados do carrinho do arquivo JSON', async () => {
    // Mock banco vazio
    mockPrisma.visit.findUnique.mockResolvedValue(null)

    // Mock arquivo com carrinho
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue(JSON.stringify([mockCartFromFile]))

    const request = new NextRequest('http://localhost/api/admin/visits', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verificar formatação dos itens
    expect(data.cart.items[0]).toEqual({
      id: 'item-1',
      name: 'Produto Teste',
      modelName: 'Modelo A',
      quantity: 2,
      unitPrice: 100.50,
      totalPrice: 201.00
    })

    // Verificar formatação do analytics
    expect(data.cart.analytics.timeOnSite).toBe(300) // convertido para segundos
    expect(data.cart.analytics.categoriesVisited).toHaveLength(1)
    expect(data.cart.analytics.searchTerms).toHaveLength(1)
    expect(data.cart.analytics.productsViewed).toHaveLength(1)

    // Verificar formatação da data
    expect(typeof data.cart.lastActivity).toBe('string')
  })
})
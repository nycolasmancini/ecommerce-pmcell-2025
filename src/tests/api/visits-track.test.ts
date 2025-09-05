/**
 * Testes para Endpoint /api/visits/track
 * Testa todas as funcionalidades de tracking de visitas
 */

import { createMocks } from 'node-test-mocks'
import { POST, GET } from '@/app/api/visits/track/route'
import { prisma } from '@/lib/prisma'

// Helper para criar dados de teste
const createTestTrackingData = (overrides = {}) => ({
  sessionId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  whatsapp: null,
  searchTerms: ['produto teste', 'categoria teste'],
  categoriesVisited: [
    { name: 'Capas', visits: 2, lastVisit: Date.now() },
    { name: 'Películas', visits: 1, lastVisit: Date.now() - 1000 }
  ],
  productsViewed: [
    { 
      id: 'prod-1', 
      name: 'Produto Teste', 
      category: 'Capas', 
      visits: 3, 
      lastView: Date.now() 
    }
  ],
  cartData: {
    hasCart: true,
    cartValue: 150.75,
    cartItems: 2
  },
  status: 'active' as const,
  whatsappCollectedAt: null,
  ...overrides
})

describe('Visits Track API Endpoint', () => {
  // Cleanup após cada teste
  afterEach(async () => {
    try {
      await prisma.visit.deleteMany({
        where: { sessionId: { contains: 'test-' } }
      })
    } catch (error) {
      console.warn('Erro ao limpar dados de teste:', error)
    }
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/visits/track', () => {
    test('deve salvar uma nova visita com sucesso', async () => {
      const trackingData = createTestTrackingData()
      
      const { req } = createMocks({
        method: 'POST',
        body: trackingData
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Tracking atualizado com sucesso')

      // Verificar se foi salvo no banco
      const savedVisit = await prisma.visit.findUnique({
        where: { sessionId: trackingData.sessionId }
      })

      expect(savedVisit).toBeDefined()
      expect(savedVisit?.sessionId).toBe(trackingData.sessionId)
      expect(savedVisit?.hasCart).toBe(true)
      expect(savedVisit?.cartValue).toBe(150.75)
      expect(savedVisit?.cartItems).toBe(2)
      expect(savedVisit?.status).toBe('active')
    })

    test('deve atualizar visita existente (upsert)', async () => {
      const sessionId = `test-upsert-${Date.now()}`
      
      // Primeira requisição (create)
      const firstData = createTestTrackingData({ 
        sessionId,
        cartData: { hasCart: false, cartValue: 0, cartItems: 0 }
      })
      
      const { req: req1 } = createMocks({
        method: 'POST',
        body: firstData
      })

      const response1 = await POST(req1 as any)
      expect(response1.status).toBe(200)

      // Segunda requisição (update)
      const secondData = createTestTrackingData({ 
        sessionId,
        whatsapp: '+5511999999999',
        cartData: { hasCart: true, cartValue: 299.99, cartItems: 3 },
        status: 'abandoned'
      })

      const { req: req2 } = createMocks({
        method: 'POST',
        body: secondData
      })

      const response2 = await POST(req2 as any)
      const responseData2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(responseData2.success).toBe(true)

      // Verificar se foi atualizada
      const updatedVisit = await prisma.visit.findUnique({
        where: { sessionId }
      })

      expect(updatedVisit).toBeDefined()
      expect(updatedVisit?.whatsapp).toBe('+5511999999999')
      expect(updatedVisit?.hasCart).toBe(true)
      expect(updatedVisit?.cartValue).toBe(299.99)
      expect(updatedVisit?.cartItems).toBe(3)
      expect(updatedVisit?.status).toBe('abandoned')
    })

    test('deve rejeitar requisição sem sessionId', async () => {
      const invalidData = createTestTrackingData()
      delete invalidData.sessionId

      const { req } = createMocks({
        method: 'POST',
        body: invalidData
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('SessionId é obrigatório')
    })

    test('deve lidar com dados JSON inválidos', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: 'dados inválidos'
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Erro interno do servidor')
    })

    test('deve salvar arrays complexos como JSON', async () => {
      const trackingData = createTestTrackingData({
        searchTerms: ['busca 1', 'busca 2', 'produto específico'],
        categoriesVisited: [
          { name: 'Categoria A', visits: 5, lastVisit: Date.now() },
          { name: 'Categoria B', visits: 2, lastVisit: Date.now() - 2000 }
        ],
        productsViewed: [
          { id: 'p1', name: 'Produto 1', category: 'Cat A', visits: 3, lastView: Date.now() },
          { id: 'p2', name: 'Produto 2', category: 'Cat B', visits: 1, lastView: Date.now() - 1000 }
        ]
      })

      const { req } = createMocks({
        method: 'POST',
        body: trackingData
      })

      const response = await POST(req as any)
      expect(response.status).toBe(200)

      // Verificar se os arrays foram salvos corretamente como JSON
      const savedVisit = await prisma.visit.findUnique({
        where: { sessionId: trackingData.sessionId }
      })

      expect(savedVisit).toBeDefined()
      
      const searchTerms = JSON.parse(savedVisit?.searchTerms as string)
      expect(searchTerms).toHaveLength(3)
      expect(searchTerms).toContain('busca 1')

      const categoriesVisited = JSON.parse(savedVisit?.categoriesVisited as string)
      expect(categoriesVisited).toHaveLength(2)
      expect(categoriesVisited[0]).toHaveProperty('name', 'Categoria A')
      expect(categoriesVisited[0]).toHaveProperty('visits', 5)

      const productsViewed = JSON.parse(savedVisit?.productsViewed as string)
      expect(productsViewed).toHaveLength(2)
      expect(productsViewed[0]).toHaveProperty('id', 'p1')
    })

    test('deve lidar com valores nulos opcionais', async () => {
      const trackingData = createTestTrackingData({
        whatsapp: null,
        searchTerms: [],
        categoriesVisited: [],
        productsViewed: [],
        cartData: { hasCart: false, cartValue: null, cartItems: null },
        whatsappCollectedAt: null
      })

      const { req } = createMocks({
        method: 'POST',
        body: trackingData
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)

      const savedVisit = await prisma.visit.findUnique({
        where: { sessionId: trackingData.sessionId }
      })

      expect(savedVisit).toBeDefined()
      expect(savedVisit?.whatsapp).toBeNull()
      expect(savedVisit?.cartValue).toBeNull()
      expect(savedVisit?.cartItems).toBeNull()
      expect(savedVisit?.whatsappCollectedAt).toBeNull()
    })

    test('deve processar múltiplas requisições simultaneamente', async () => {
      const sessions = Array.from({ length: 5 }, (_, i) => 
        createTestTrackingData({ sessionId: `test-concurrent-${i}-${Date.now()}` })
      )

      const promises = sessions.map(async (trackingData) => {
        const { req } = createMocks({
          method: 'POST',
          body: trackingData
        })
        return POST(req as any)
      })

      const responses = await Promise.all(promises)

      // Todas devem ter sucesso
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
      })

      // Verificar se todas foram salvas
      const savedVisits = await prisma.visit.findMany({
        where: { 
          sessionId: { 
            in: sessions.map(s => s.sessionId) 
          } 
        }
      })

      expect(savedVisits).toHaveLength(5)
    })
  })

  describe('GET /api/visits/track', () => {
    test('deve buscar visita por sessionId', async () => {
      // Primeiro criar uma visita
      const trackingData = createTestTrackingData()
      
      await prisma.visit.create({
        data: {
          sessionId: trackingData.sessionId,
          whatsapp: trackingData.whatsapp,
          searchTerms: JSON.stringify(trackingData.searchTerms),
          categoriesVisited: JSON.stringify(trackingData.categoriesVisited),
          productsViewed: JSON.stringify(trackingData.productsViewed),
          status: trackingData.status,
          hasCart: trackingData.cartData.hasCart,
          cartValue: trackingData.cartData.cartValue,
          cartItems: trackingData.cartData.cartItems,
          startTime: new Date(),
          lastActivity: new Date(),
          whatsappCollectedAt: trackingData.whatsappCollectedAt ? new Date(trackingData.whatsappCollectedAt) : null
        }
      })

      // Buscar via GET
      const url = new URL(`http://localhost/api/visits/track?sessionId=${trackingData.sessionId}`)
      const { req } = createMocks({
        method: 'GET',
        url: url.toString()
      })

      // Mock do request.url
      Object.defineProperty(req, 'url', {
        value: url.toString(),
        writable: true
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.visit).toBeDefined()
      expect(responseData.visit.sessionId).toBe(trackingData.sessionId)
    })

    test('deve retornar erro 400 sem sessionId', async () => {
      const url = new URL('http://localhost/api/visits/track')
      const { req } = createMocks({
        method: 'GET',
        url: url.toString()
      })

      Object.defineProperty(req, 'url', {
        value: url.toString(),
        writable: true
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('SessionId é obrigatório')
    })

    test('deve retornar erro 404 para visita inexistente', async () => {
      const nonExistentSessionId = 'non-existent-session'
      const url = new URL(`http://localhost/api/visits/track?sessionId=${nonExistentSessionId}`)
      const { req } = createMocks({
        method: 'GET',
        url: url.toString()
      })

      Object.defineProperty(req, 'url', {
        value: url.toString(),
        writable: true
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Visita não encontrada')
    })
  })
})
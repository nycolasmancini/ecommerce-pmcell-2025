import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as trackPOST, GET as trackGET } from '@/app/api/visits/track/route'
import { GET as adminGET, POST as adminPOST } from '@/app/api/admin/visits/route'

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn()
  }
}))

const { prisma } = require('@/lib/prisma')

describe('E2E: Complete Visit Tracking Flow', () => {
  const testSessionId = 'e2e_test_' + Date.now()
  let visitId: string
  
  beforeEach(() => {
    jest.clearAllMocks()
    visitId = 'visit_' + Date.now()
    // Mock conexão bem-sucedida
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }])
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('Complete User Journey', () => {
    test('1. User starts browsing - initial tracking', async () => {
      // Mock do upsert para criar nova visita
      const mockVisit = {
        id: visitId,
        sessionId: testSessionId,
        status: 'active',
        hasCart: false,
        startTime: new Date(),
        lastActivity: new Date()
      }
      
      ;(prisma.visit.upsert as jest.Mock).mockResolvedValue(mockVisit)
      
      // Simular primeira visita
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: testSessionId,
          status: 'active'
        }),
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await trackPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.visit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: testSessionId },
          create: expect.objectContaining({
            sessionId: testSessionId,
            status: 'active'
          })
        })
      )
    })
    
    test('2. User searches and views products', async () => {
      const mockVisit = {
        id: visitId,
        sessionId: testSessionId,
        searchTerms: JSON.stringify(['capinha iphone', 'película']),
        productsViewed: JSON.stringify([
          { id: 'prod_1', name: 'Capinha iPhone 14', category: 'Capinhas', visits: 3 }
        ])
      }
      
      ;(prisma.visit.upsert as jest.Mock).mockResolvedValue(mockVisit)
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: testSessionId,
          searchTerms: ['capinha iphone', 'película'],
          productsViewed: [
            {
              id: 'prod_1',
              name: 'Capinha iPhone 14',
              category: 'Capinhas',
              visits: 3,
              lastView: Date.now()
            }
          ]
        }),
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await trackPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
    
    test('3. User adds items to cart', async () => {
      const cartData = {
        hasCart: true,
        cartValue: 149.80,
        cartItems: 2,
        items: [
          {
            id: 'cart_item_1',
            productId: 'prod_1',
            name: 'Capinha iPhone 14',
            quantity: 1,
            unitPrice: 79.90,
            modelName: 'iPhone 14 Pro Max'
          },
          {
            id: 'cart_item_2',
            productId: 'prod_2',
            name: 'Película 3D',
            quantity: 1,
            unitPrice: 69.90,
            modelName: 'iPhone 14 Pro Max'
          }
        ],
        total: 149.80
      }
      
      const mockVisit = {
        id: visitId,
        sessionId: testSessionId,
        hasCart: true,
        cartValue: 149.80,
        cartItems: 2,
        cartData: JSON.stringify({
          items: cartData.items,
          total: cartData.total
        })
      }
      
      ;(prisma.visit.upsert as jest.Mock).mockResolvedValue(mockVisit)
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: testSessionId,
          cartData: cartData
        }),
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await trackPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.visit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            hasCart: true,
            cartValue: 149.80,
            cartItems: 2
          })
        })
      )
    })
    
    test('4. User provides WhatsApp contact', async () => {
      const mockVisit = {
        id: visitId,
        sessionId: testSessionId,
        whatsapp: '+5519999999999',
        whatsappCollectedAt: new Date()
      }
      
      ;(prisma.visit.upsert as jest.Mock).mockResolvedValue(mockVisit)
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          whatsappCollectedAt: Date.now()
        }),
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await trackPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.visit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            whatsapp: '+5519999999999'
          })
        })
      )
    })
    
    test('5. Admin views visit details', async () => {
      const completeVisit = {
        id: visitId,
        sessionId: testSessionId,
        whatsapp: '+5519999999999',
        startTime: new Date('2025-01-01T10:00:00Z'),
        lastActivity: new Date('2025-01-01T10:30:00Z'),
        status: 'active',
        hasCart: true,
        cartValue: 149.80,
        cartItems: 2,
        cartData: JSON.stringify({
          items: [
            {
              id: 'cart_item_1',
              productId: 'prod_1',
              name: 'Capinha iPhone 14',
              quantity: 1,
              unitPrice: 79.90
            },
            {
              id: 'cart_item_2',
              productId: 'prod_2',
              name: 'Película 3D',
              quantity: 1,
              unitPrice: 69.90
            }
          ],
          total: 149.80
        }),
        searchTerms: JSON.stringify(['capinha iphone', 'película']),
        productsViewed: JSON.stringify([
          { id: 'prod_1', name: 'Capinha iPhone 14', category: 'Capinhas' }
        ])
      }
      
      ;(prisma.visit.findUnique as jest.Mock).mockResolvedValue(completeVisit)
      
      // Admin busca detalhes do carrinho
      const request = new NextRequest('http://localhost:3000/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: testSessionId }),
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await adminPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cartDetails).toBeDefined()
      expect(data.cartDetails.items).toHaveLength(2)
      expect(data.cartDetails.total).toBe(149.80)
    })
    
    test('6. Admin lists all visits with filters', async () => {
      const mockVisits = [
        {
          id: visitId,
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          hasCart: true,
          cartValue: 149.80,
          status: 'active'
        },
        {
          id: 'visit_2',
          sessionId: 'session_2',
          whatsapp: null,
          hasCart: false,
          status: 'abandoned'
        }
      ]
      
      ;(prisma.visit.findMany as jest.Mock).mockResolvedValue(mockVisits)
      ;(prisma.visit.count as jest.Mock).mockResolvedValue(2)
      
      // Admin lista visitas com contato
      const request = new NextRequest(
        'http://localhost:3000/api/admin/visits?hasContact=true',
        { method: 'GET' }
      )
      
      const response = await adminGET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.visits).toBeDefined()
      expect(data.pagination).toBeDefined()
      expect(data.stats).toBeDefined()
    })
  })
  
  describe('Error Scenarios', () => {
    test('should handle network errors gracefully', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'error_session' }),
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await trackPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
    
    test('should handle malformed data gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await trackPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
    
    test('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify({}), // Missing sessionId
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await trackPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('SessionId é obrigatório')
    })
  })
  
  describe('Performance and Load Testing', () => {
    test('should handle concurrent requests', async () => {
      const mockVisit = {
        id: visitId,
        sessionId: testSessionId
      }
      
      ;(prisma.visit.upsert as jest.Mock).mockResolvedValue(mockVisit)
      
      // Simular múltiplas requisições concorrentes
      const requests = Array.from({ length: 10 }, (_, i) => {
        const request = new NextRequest('http://localhost:3000/api/visits/track', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: `concurrent_${i}`,
            status: 'active'
          }),
          headers: { 'content-type': 'application/json' }
        })
        return trackPOST(request)
      })
      
      const responses = await Promise.all(requests)
      const results = await Promise.all(responses.map(r => r.json()))
      
      expect(responses).toHaveLength(10)
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      expect(prisma.visit.upsert).toHaveBeenCalledTimes(10)
    })
    
    test('should handle large cart data', async () => {
      // Criar carrinho com muitos itens
      const largeCart = {
        hasCart: true,
        cartValue: 9999.99,
        cartItems: 100,
        items: Array.from({ length: 100 }, (_, i) => ({
          id: `item_${i}`,
          productId: `prod_${i}`,
          name: `Produto ${i}`,
          quantity: 1,
          unitPrice: 99.99
        })),
        total: 9999.99
      }
      
      ;(prisma.visit.upsert as jest.Mock).mockResolvedValue({
        id: visitId,
        sessionId: testSessionId,
        cartData: JSON.stringify({
          items: largeCart.items,
          total: largeCart.total
        })
      })
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: testSessionId,
          cartData: largeCart
        }),
        headers: { 'content-type': 'application/json' }
      })
      
      const response = await trackPOST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
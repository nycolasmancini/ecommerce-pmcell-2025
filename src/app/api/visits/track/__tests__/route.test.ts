import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn()
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn()
  }
}))

const { prisma } = require('@/lib/prisma')

describe('API /api/visits/track', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock da conexão sempre bem-sucedida
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }])
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('POST /api/visits/track', () => {
    test('should create/update visit with sessionId only', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        id: 'visit_1',
        sessionId: 'test_session_123',
        status: 'active',
        hasCart: false
      })
      
      ;(prisma.visit.upsert as jest.Mock) = mockUpsert
      
      const requestData = {
        sessionId: 'test_session_123'
      }
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Tracking atualizado com sucesso')
      
      // Verificar chamada do upsert
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'test_session_123' },
          update: expect.objectContaining({
            sessionId: 'test_session_123',
            status: 'active',
            hasCart: false
          }),
          create: expect.objectContaining({
            sessionId: 'test_session_123',
            status: 'active',
            hasCart: false
          })
        })
      )
    })
    
    test('should handle complete tracking data with cart', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        id: 'visit_2',
        sessionId: 'test_session_456',
        hasCart: true
      })
      
      ;(prisma.visit.upsert as jest.Mock) = mockUpsert
      
      const cartData = {
        hasCart: true,
        cartValue: 199.90,
        cartItems: 2,
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            name: 'Capinha iPhone',
            quantity: 1,
            unitPrice: 99.90,
            modelName: 'iPhone 14'
          },
          {
            id: 'item_2',
            productId: 'prod_2',
            name: 'Película',
            quantity: 1,
            unitPrice: 100.00
          }
        ],
        total: 199.90
      }
      
      const requestData = {
        sessionId: 'test_session_456',
        whatsapp: '+5519999999999',
        searchTerms: ['capinha', 'iphone'],
        categoriesVisited: [
          { name: 'Capinhas', visits: 5, lastVisit: Date.now() }
        ],
        productsViewed: [
          {
            id: 'prod_1',
            name: 'Capinha iPhone',
            category: 'Capinhas',
            visits: 3,
            lastView: Date.now()
          }
        ],
        cartData: cartData,
        status: 'active'
      }
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verificar que os dados do carrinho foram processados
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            hasCart: true,
            cartValue: 199.90,
            cartItems: 2,
            cartData: JSON.stringify({
              items: cartData.items,
              total: cartData.total
            })
          })
        })
      )
    })
    
    test('should return 400 for missing sessionId', async () => {
      const requestData = {
        whatsapp: '+5519999999999'
        // sessionId missing
      }
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('SessionId é obrigatório')
    })
    
    test('should handle invalid cartData gracefully', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        id: 'visit_3',
        sessionId: 'test_session_789'
      })
      
      ;(prisma.visit.upsert as jest.Mock) = mockUpsert
      
      const requestData = {
        sessionId: 'test_session_789',
        cartData: {
          hasCart: true,
          items: 'invalid_items' // Should be array
        }
      }
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      // Should handle gracefully
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
    
    test('should handle database connection errors', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )
      
      const requestData = {
        sessionId: 'test_session_error'
      }
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Database connection failed')
    })
  })
  
  describe('GET /api/visits/track', () => {
    test('should return visit data for valid sessionId', async () => {
      const mockVisit = {
        id: 'visit_1',
        sessionId: 'test_session_123',
        whatsapp: '+5519999999999',
        hasCart: true,
        cartValue: 99.90,
        cartData: JSON.stringify({
          items: [
            {
              id: 'item_1',
              productId: 'prod_1',
              name: 'Produto Teste',
              quantity: 1,
              unitPrice: 99.90
            }
          ],
          total: 99.90
        })
      }
      
      ;(prisma.visit.findUnique as jest.Mock).mockResolvedValue(mockVisit)
      
      const request = new NextRequest(
        'http://localhost:3000/api/visits/track?sessionId=test_session_123',
        { method: 'GET' }
      )
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.visit).toEqual(mockVisit)
      expect(prisma.visit.findUnique).toHaveBeenCalledWith({
        where: { sessionId: 'test_session_123' }
      })
    })
    
    test('should return 400 for missing sessionId', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/visits/track',
        { method: 'GET' }
      )
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('SessionId é obrigatório')
    })
    
    test('should return 404 for non-existent visit', async () => {
      ;(prisma.visit.findUnique as jest.Mock).mockResolvedValue(null)
      
      const request = new NextRequest(
        'http://localhost:3000/api/visits/track?sessionId=non_existent',
        { method: 'GET' }
      )
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Visita não encontrada')
    })
    
    test('should handle database errors gracefully', async () => {
      ;(prisma.visit.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )
      
      const request = new NextRequest(
        'http://localhost:3000/api/visits/track?sessionId=test_session_123',
        { method: 'GET' }
      )
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Erro interno do servidor')
    })
  })
  
  describe('Data Persistence', () => {
    test('should correctly format cartData for storage', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        id: 'visit_4',
        sessionId: 'test_persistence'
      })
      
      ;(prisma.visit.upsert as jest.Mock) = mockUpsert
      
      const cartData = {
        hasCart: true,
        cartValue: 250.00,
        cartItems: 3,
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            name: 'Produto 1',
            quantity: 2,
            unitPrice: 100.00
          },
          {
            id: 'item_2',
            productId: 'prod_2',
            name: 'Produto 2',
            quantity: 1,
            unitPrice: 50.00
          }
        ],
        total: 250.00
      }
      
      const requestData = {
        sessionId: 'test_persistence',
        cartData: cartData
      }
      
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verificar formato dos dados armazenados
      const upsertCall = mockUpsert.mock.calls[0][0]
      const storedCartData = JSON.parse(upsertCall.create.cartData)
      
      expect(storedCartData).toEqual({
        items: cartData.items,
        total: cartData.total
      })
    })
  })
})
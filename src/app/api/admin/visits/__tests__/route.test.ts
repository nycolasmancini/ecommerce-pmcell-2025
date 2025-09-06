import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn()
  }
}))

const { prisma } = require('@/lib/prisma')

describe('API /api/admin/visits', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('GET /api/admin/visits', () => {
    test('should return visits list with pagination', async () => {
      const mockVisits = [
        {
          id: 'visit_1',
          sessionId: 'session_123',
          whatsapp: '+5519999999999',
          startTime: new Date('2025-01-01T10:00:00Z'),
          lastActivity: new Date('2025-01-01T10:30:00Z'),
          status: 'active',
          hasCart: true,
          cartValue: 199.90,
          cartItems: 2,
          searchTerms: JSON.stringify(['capinha', 'iphone']),
          categoriesVisited: JSON.stringify([{ name: 'Capinhas', visits: 3 }]),
          productsViewed: JSON.stringify([{ id: 'prod_1', name: 'Capinha iPhone' }])
        }
      ]
      
      ;(prisma.visit.findMany as jest.Mock).mockResolvedValue(mockVisits)
      ;(prisma.visit.count as jest.Mock).mockResolvedValue(1)
      
      const request = new NextRequest('http://localhost:3000/api/admin/visits')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.visits).toBeDefined()
      expect(Array.isArray(data.visits)).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.stats).toBeDefined()
    })
    
    test('should filter visits by date range', async () => {
      const mockVisits: any[] = []
      
      ;(prisma.visit.findMany as jest.Mock).mockResolvedValue(mockVisits)
      ;(prisma.visit.count as jest.Mock).mockResolvedValue(0)
      
      const startDate = '2025-01-01'
      const endDate = '2025-01-31'
      const request = new NextRequest(
        `http://localhost:3000/api/admin/visits?startDate=${startDate}&endDate=${endDate}`
      )
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.visit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      )
    })
    
    test('should filter visits by whatsapp availability', async () => {
      const mockVisits: any[] = []
      
      ;(prisma.visit.findMany as jest.Mock).mockResolvedValue(mockVisits)
      ;(prisma.visit.count as jest.Mock).mockResolvedValue(0)
      
      const request = new NextRequest(
        'http://localhost:3000/api/admin/visits?hasContact=true'
      )
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.visit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            whatsapp: expect.objectContaining({
              not: null
            })
          })
        })
      )
    })
    
    test('should handle database errors gracefully', async () => {
      ;(prisma.visit.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )
      
      const request = new NextRequest('http://localhost:3000/api/admin/visits')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
  
  describe('POST /api/admin/visits', () => {
    test('should return cart details for valid sessionId', async () => {
      const mockVisit = {
        id: 'visit_1',
        sessionId: 'session_123',
        whatsapp: '+5519999999999',
        hasCart: true,
        cartValue: 299.90,
        cartItems: 3,
        cartData: JSON.stringify({
          items: [
            {
              id: 'item_1',
              productId: 'prod_1',
              name: 'Capinha iPhone',
              quantity: 2,
              unitPrice: 99.90
            },
            {
              id: 'item_2',
              productId: 'prod_2',
              name: 'Película',
              quantity: 1,
              unitPrice: 49.90
            }
          ],
          total: 299.90
        })
      }
      
      ;(prisma.visit.findUnique as jest.Mock).mockResolvedValue(mockVisit)
      
      const request = new NextRequest('http://localhost:3000/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session_123' }),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cartDetails).toBeDefined()
      expect(data.cartDetails.items).toBeDefined()
      expect(Array.isArray(data.cartDetails.items)).toBe(true)
      expect(data.cartDetails.total).toBe(299.90)
    })
    
    test('should return error for missing sessionId', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({}),
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
    
    test('should return 404 for non-existent visit', async () => {
      ;(prisma.visit.findUnique as jest.Mock).mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'non_existent' }),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Visita não encontrada')
    })
    
    test('should handle visits without cart data', async () => {
      const mockVisit = {
        id: 'visit_2',
        sessionId: 'session_456',
        whatsapp: null,
        hasCart: false,
        cartValue: null,
        cartItems: null,
        cartData: null
      }
      
      ;(prisma.visit.findUnique as jest.Mock).mockResolvedValue(mockVisit)
      
      const request = new NextRequest('http://localhost:3000/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session_456' }),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cartDetails).toEqual({ items: [], total: 0 })
    })
    
    test('should handle malformed cart data gracefully', async () => {
      const mockVisit = {
        id: 'visit_3',
        sessionId: 'session_789',
        hasCart: true,
        cartData: 'invalid_json'
      }
      
      ;(prisma.visit.findUnique as jest.Mock).mockResolvedValue(mockVisit)
      
      const request = new NextRequest('http://localhost:3000/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session_789' }),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cartDetails).toEqual({ items: [], total: 0 })
    })
    
    test('should handle database errors gracefully', async () => {
      ;(prisma.visit.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )
      
      const request = new NextRequest('http://localhost:3000/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session_123' }),
        headers: {
          'content-type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
})
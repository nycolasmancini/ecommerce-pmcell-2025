/**
 * Testes unitários para a função findCartInDatabase
 * Focado em identificar e corrigir o bug de "Carrinho não encontrado"
 */

import { NextRequest } from 'next/server'
import { POST } from '../route'
import fs from 'fs'
import path from 'path'
import { prismaMock } from '@/lib/__mocks__/prisma'

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock
}))

// Mock do sistema de arquivos
jest.mock('fs')
const mockedFs = fs as jest.Mocked<typeof fs>

describe('findCartInDatabase Unit Tests', () => {
  const CARTS_FILE = path.join(process.cwd(), 'data', 'abandoned-carts.json')
  
  // Dados de teste
  const mockSessionId = 'test-session-123'
  const mockCartData = {
    sessionId: mockSessionId,
    whatsapp: '11999999999',
    cartData: {
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          name: 'Produto Teste',
          quantity: 2,
          unitPrice: 29.99,
          modelName: 'Modelo A'
        }
      ],
      total: 59.98
    },
    analyticsData: {
      sessionId: mockSessionId,
      timeOnSite: 300000,
      categoriesVisited: [
        { name: 'Categoria A', visits: 3, lastVisit: Date.now() }
      ],
      searchTerms: [
        { term: 'teste', count: 2, lastSearch: Date.now() }
      ],
      productsViewed: [
        { id: 'prod-1', name: 'Produto Teste', category: 'Categoria A', visits: 1, lastView: Date.now() }
      ],
      whatsappCollected: '11999999999',
      whatsappCollectedAt: Date.now()
    },
    lastActivity: Date.now(),
    webhookSent: false,
    createdAt: Date.now()
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('🔍 Database Search Tests', () => {
    test('should find cart in database when visit exists with cartData', async () => {
      // Arrange
      const mockVisit = {
        sessionId: mockSessionId,
        whatsapp: '11999999999',
        hasCart: true,
        cartValue: 59.98,
        cartItems: 1,
        cartData: JSON.stringify(mockCartData.cartData),
        searchTerms: JSON.stringify(['teste']),
        categoriesVisited: JSON.stringify([{ name: 'Categoria A', visits: 3 }]),
        productsViewed: JSON.stringify([{ id: 'prod-1', name: 'Produto Teste' }]),
        sessionDuration: 300,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      prismaMock.visit.findUnique.mockResolvedValue(mockVisit)
      
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.cart).toBeDefined()
      expect(result.cart.sessionId).toBe(mockSessionId)
      expect(result.cart.items).toHaveLength(1)
      expect(result.cart.items[0].name).toBe('Produto Teste')
      expect(result.cart.total).toBe(59.98)
    })
    
    test('should return null when visit exists but has no cartData', async () => {
      // Arrange
      const mockVisit = {
        sessionId: mockSessionId,
        whatsapp: '11999999999',
        hasCart: false,
        cartValue: null,
        cartItems: null,
        cartData: null,
        searchTerms: '[]',
        categoriesVisited: '[]',
        productsViewed: '[]',
        sessionDuration: 300,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      prismaMock.visit.findUnique.mockResolvedValue(mockVisit)
      
      // Mock file system - arquivo não existe
      mockedFs.existsSync.mockReturnValue(false)
      
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert
      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Carrinho não encontrado')
    })
    
    test('should fallback to JSON file when database has no cart data', async () => {
      // Arrange
      const mockVisit = {
        sessionId: mockSessionId,
        whatsapp: '11999999999',
        hasCart: false,
        cartValue: null,
        cartItems: null,
        cartData: null,
        searchTerms: '[]',
        categoriesVisited: '[]',
        productsViewed: '[]',
        sessionDuration: 300,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      prismaMock.visit.findUnique.mockResolvedValue(mockVisit)
      
      // Mock file system
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([mockCartData]))
      
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.cart).toBeDefined()
      expect(result.cart.sessionId).toBe(mockSessionId)
      expect(result.cart.items).toHaveLength(1)
      expect(result.cart.total).toBe(59.98)
    })
  })
  
  describe('📁 JSON File Fallback Tests', () => {
    test('should find cart in JSON file when database has no visit', async () => {
      // Arrange
      prismaMock.visit.findUnique.mockResolvedValue(null)
      
      // Mock file system
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([mockCartData]))
      
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.cart).toBeDefined()
      expect(result.cart.sessionId).toBe(mockSessionId)
    })
    
    test('should handle JSON file parsing errors gracefully', async () => {
      // Arrange
      prismaMock.visit.findUnique.mockResolvedValue(null)
      
      // Mock file system com erro de parsing
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue('invalid json {')
      
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert
      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
    })
    
    test('should return 404 when sessionId not found in JSON file', async () => {
      // Arrange
      const otherCartData = { ...mockCartData, sessionId: 'different-session-id' }
      
      prismaMock.visit.findUnique.mockResolvedValue(null)
      
      // Mock file system
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([otherCartData]))
      
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert
      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Carrinho não encontrado')
    })
  })
  
  describe('🛠️ Edge Cases and Error Handling', () => {
    test('should handle missing sessionId parameter', async () => {
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert
      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('SessionId é obrigatório')
    })
    
    test('should handle empty/null sessionId', async () => {
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: '' }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert
      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
    })
    
    test('should handle database connection errors', async () => {
      // Arrange
      prismaMock.visit.findUnique.mockRejectedValue(new Error('Database connection failed'))
      
      // Mock file system como fallback
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([mockCartData]))
      
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert - Should fallback to JSON file despite DB error
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.cart).toBeDefined()
    })
    
    test('should handle malformed cartData in database', async () => {
      // Arrange
      const mockVisit = {
        sessionId: mockSessionId,
        whatsapp: '11999999999',
        hasCart: true,
        cartValue: 59.98,
        cartItems: 1,
        cartData: 'invalid json {',
        searchTerms: '[]',
        categoriesVisited: '[]',
        productsViewed: '[]',
        sessionDuration: 300,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      prismaMock.visit.findUnique.mockResolvedValue(mockVisit)
      
      // Mock file system como fallback
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([mockCartData]))
      
      // Act
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const result = await response.json()
      
      // Assert - Should fallback to JSON file
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })
  })
  
  describe('🧪 Performance Tests', () => {
    test('should complete cart search within reasonable time', async () => {
      // Arrange
      prismaMock.visit.findUnique.mockResolvedValue(null)
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([mockCartData]))
      
      // Act
      const startTime = Date.now()
      
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: mockSessionId }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      await POST(request)
      
      const duration = Date.now() - startTime
      
      // Assert
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})
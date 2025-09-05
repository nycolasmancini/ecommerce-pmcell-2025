/**
 * End-to-end test para reproduzir e corrigir o bug de "Carrinho não encontrado"
 * no módulo de visitas
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/admin/visits/route'
import fs from 'fs'
import path from 'path'

describe('Cart Details Bug - E2E Test', () => {
  const CARTS_FILE = path.join(process.cwd(), 'data', 'abandoned-carts.json')
  let realSessionIds: string[] = []
  
  beforeAll(() => {
    // Carregar sessionIds reais do arquivo
    if (fs.existsSync(CARTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CARTS_FILE, 'utf8'))
      realSessionIds = data.map((cart: any) => cart.sessionId).slice(0, 3)
    }
  })
  
  describe('🐛 Bug Reproduction - Should fail initially', () => {
    test('should reproduce 404 error for existing cart sessionId', async () => {
      const sessionId = realSessionIds[0] || 'mebqqvo9z0t2rqtfdi'
      
      console.log(`🔍 Testing with real sessionId: ${sessionId}`)
      
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const responseData = await response.json()
      
      console.log('🧪 Response:', {
        status: response.status,
        success: responseData.success,
        error: responseData.error,
        hasCart: !!responseData.cart
      })
      
      // Inicialmente deve falhar - demonstrando o bug
      // Após a correção, este teste deve passar
      if (responseData.success) {
        expect(responseData.cart).toBeDefined()
        expect(responseData.cart.sessionId).toBe(sessionId)
        expect(responseData.cart.items).toBeDefined()
        expect(Array.isArray(responseData.cart.items)).toBe(true)
      } else {
        // Bug confirmado
        expect(response.status).toBe(404)
        expect(responseData.error).toContain('Carrinho não encontrado')
        console.log('❌ Bug confirmed: Cart not found for existing sessionId')
      }
    })
    
    test('should show cart structure from file for comparison', async () => {
      if (realSessionIds.length === 0) {
        console.log('⚠️ No real sessionIds available for testing')
        return
      }
      
      const sessionId = realSessionIds[0]
      
      // Verificar se o carrinho existe no arquivo
      const data = JSON.parse(fs.readFileSync(CARTS_FILE, 'utf8'))
      const cart = data.find((c: any) => c.sessionId === sessionId)
      
      console.log('📦 Cart in file:', {
        exists: !!cart,
        sessionId: cart?.sessionId,
        hasCartData: !!cart?.cartData,
        itemsCount: cart?.cartData?.items?.length || 0,
        total: cart?.cartData?.total || 0,
        whatsapp: cart?.whatsapp
      })
      
      expect(cart).toBeDefined()
      expect(cart.cartData).toBeDefined()
      expect(cart.cartData.items).toBeDefined()
      expect(Array.isArray(cart.cartData.items)).toBe(true)
    })
  })
  
  describe('🔧 Validation Tests - Should pass after fix', () => {
    test('should find cart for all available sessionIds', async () => {
      for (const sessionId of realSessionIds.slice(0, 2)) {
        console.log(`🧪 Testing sessionId: ${sessionId}`)
        
        const request = new NextRequest('http://localhost/api/admin/visits', {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        const response = await POST(request)
        const responseData = await response.json()
        
        // Após correção, deve encontrar todos os carrinhos
        expect(responseData.success).toBe(true)
        expect(responseData.cart).toBeDefined()
        expect(responseData.cart.sessionId).toBe(sessionId)
        expect(responseData.cart.items).toBeDefined()
        expect(responseData.cart.total).toBeGreaterThan(0)
      }
    })
    
    test('should return proper error for non-existent sessionId', async () => {
      const fakeSessionId = 'non-existent-session-id'
      
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId: fakeSessionId }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Carrinho não encontrado')
    })
    
    test('should handle missing sessionId parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('SessionId é obrigatório')
    })
  })
  
  describe('📊 Performance and Logging Tests', () => {
    test('should complete cart search within reasonable time', async () => {
      const sessionId = realSessionIds[0] || 'mebqqvo9z0t2rqtfdi'
      
      const startTime = Date.now()
      
      const request = new NextRequest('http://localhost/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      await POST(request)
      
      const duration = Date.now() - startTime
      console.log(`⏱️ Cart search completed in ${duration}ms`)
      
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000)
    })
  })
})
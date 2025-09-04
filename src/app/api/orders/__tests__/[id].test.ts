import { NextRequest, NextResponse } from 'next/server'
import { PATCH, GET, DELETE } from '../[id]/route'

// Mock do prisma
const mockPrisma = {
  customer: {
    update: jest.fn()
  },
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  orderItem: {
    deleteMany: jest.fn()
  },
  webhookLog: {
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  $queryRaw: jest.fn()
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}))

describe('/api/orders/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PATCH /api/orders/[id]', () => {
    test('should update order with finalWhatsapp when schema mismatched', async () => {
      // Mock da query SQL raw que retorna dados básicos do pedido
      const mockOrderData = [{
        id: 'order-1',
        customerId: 'customer-1',
        status: 'PENDING',
        confirmedAt: null,
        completedAt: null,
        subtotal: 100.00,
        discount: 0
      }]
      mockPrisma.$queryRaw.mockResolvedValue(mockOrderData)

      // Mock do update que simula erro de campo inexistente
      const columnNotExistError = new Error('The column Order.finalWhatsapp does not exist in the current database')
      columnNotExistError.code = 'P2022'
      columnNotExistError.message = 'The column Order.finalWhatsapp does not exist in the current database'
      
      // Primeira tentativa falha, segunda (sem finalWhatsapp) funciona
      mockPrisma.order.update
        .mockRejectedValueOnce(columnNotExistError)
        .mockResolvedValueOnce({
          id: 'order-1',
          customerId: 'customer-1',
          status: 'PENDING',
          customer: { id: 'customer-1', name: 'João Silva' },
          items: []
        })

      const request = new NextRequest('http://localhost/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({
          finalWhatsapp: '5511888888888'
        })
      })

      const response = await PATCH(request, { 
        params: Promise.resolve({ id: 'order-1' }) 
      })
      
      expect(response.status).toBe(200)
      
      // Verificar que $queryRaw foi chamado para buscar dados de forma segura
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.any(Object) // Template literal SQL
      )
      
      // Verificar que tentou update duas vezes (com e sem finalWhatsapp)
      expect(mockPrisma.order.update).toHaveBeenCalledTimes(2)
      
      // Primeira chamada com finalWhatsapp
      expect(mockPrisma.order.update).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            finalWhatsapp: '5511888888888'
          })
        })
      )
      
      // Segunda chamada sem finalWhatsapp (fallback)
      expect(mockPrisma.order.update).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.not.objectContaining({
            finalWhatsapp: expect.anything()
          })
        })
      )
    })

    test('should handle customer name update', async () => {
      const mockOrderData = [{
        id: 'order-1',
        customerId: 'customer-1',
        status: 'PENDING',
        confirmedAt: null,
        completedAt: null,
        subtotal: 100.00,
        discount: 0
      }]
      mockPrisma.$queryRaw.mockResolvedValue(mockOrderData)

      mockPrisma.customer.update.mockResolvedValue({
        id: 'customer-1',
        name: 'João Silva Atualizado'
      })

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        customer: { id: 'customer-1', name: 'João Silva Atualizado' },
        items: []
      })

      const request = new NextRequest('http://localhost/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({
          customerName: 'João Silva Atualizado'
        })
      })

      const response = await PATCH(request, { 
        params: Promise.resolve({ id: 'order-1' }) 
      })
      
      expect(response.status).toBe(200)
      
      // Verificar que customer foi atualizado
      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: { name: 'João Silva Atualizado' }
      })
    })

    test('should validate whatsapp format', async () => {
      const mockOrderData = [{
        id: 'order-1',
        customerId: 'customer-1',
        status: 'PENDING',
        confirmedAt: null,
        completedAt: null,
        subtotal: 100.00,
        discount: 0
      }]
      mockPrisma.$queryRaw.mockResolvedValue(mockOrderData)

      const request = new NextRequest('http://localhost/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({
          finalWhatsapp: '11999999999' // WhatsApp inválido (sem código do país)
        })
      })

      const response = await PATCH(request, { 
        params: Promise.resolve({ id: 'order-1' }) 
      })
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('WhatsApp final inválido')
    })

    test('should return 404 when order not found', async () => {
      // Mock que retorna array vazio (pedido não encontrado)
      mockPrisma.$queryRaw.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/orders/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({
          customerName: 'João Silva'
        })
      })

      const response = await PATCH(request, { 
        params: Promise.resolve({ id: 'nonexistent' }) 
      })
      
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error).toBe('Pedido não encontrado')
    })

    test('should handle database error gracefully', async () => {
      // Mock que simula erro de banco
      const dbError = new Error('Database connection failed')
      mockPrisma.$queryRaw.mockRejectedValue(dbError)

      const request = new NextRequest('http://localhost/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({
          customerName: 'João Silva'
        })
      })

      const response = await PATCH(request, { 
        params: Promise.resolve({ id: 'order-1' }) 
      })
      
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Erro interno ao buscar pedido')
    })

    test('should create webhook log when status changed', async () => {
      const mockOrderData = [{
        id: 'order-1',
        customerId: 'customer-1',
        status: 'PENDING',
        confirmedAt: null,
        completedAt: null,
        subtotal: 100.00,
        discount: 0
      }]
      mockPrisma.$queryRaw.mockResolvedValue(mockOrderData)

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'CONFIRMED',
        customer: { id: 'customer-1', name: 'João Silva' },
        items: []
      })

      mockPrisma.webhookLog.create.mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'CONFIRMED'
        })
      })

      const response = await PATCH(request, { 
        params: Promise.resolve({ id: 'order-1' }) 
      })
      
      expect(response.status).toBe(200)
      
      // Verificar que webhook log foi criado
      expect(mockPrisma.webhookLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'ORDER_UPDATED',
          orderId: 'order-1',
          payload: expect.objectContaining({
            orderId: 'order-1',
            oldStatus: 'PENDING',
            newStatus: 'CONFIRMED'
          }),
          success: false
        })
      })
    })
  })

  describe('GET /api/orders/[id]', () => {
    test('should return order with customer and items', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: '20241201001',
        customer: { id: 'customer-1', name: 'João Silva' },
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            product: { id: 'product-1', name: 'Capa iPhone' },
            quantity: 10
          }
        ]
      }
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)

      const request = new NextRequest('http://localhost/api/orders/order-1')

      const response = await GET(request, { 
        params: Promise.resolve({ id: 'order-1' }) 
      })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.id).toBe('order-1')
      expect(data.customer.name).toBe('João Silva')
      expect(data.items).toHaveLength(1)
    })
  })

  describe('DELETE /api/orders/[id]', () => {
    test('should delete order and related items', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'PENDING'
      }
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.orderItem.deleteMany.mockResolvedValue({})
      mockPrisma.webhookLog.deleteMany.mockResolvedValue({})
      mockPrisma.order.delete.mockResolvedValue(mockOrder)

      const request = new NextRequest('http://localhost/api/orders/order-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { 
        params: Promise.resolve({ id: 'order-1' }) 
      })
      
      expect(response.status).toBe(200)
      
      // Verificar ordem de deleção
      expect(mockPrisma.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' }
      })
      expect(mockPrisma.webhookLog.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' }
      })
      expect(mockPrisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order-1' }
      })
    })

    test('should not delete confirmed or completed orders', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CONFIRMED'
      }
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)

      const request = new NextRequest('http://localhost/api/orders/order-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { 
        params: Promise.resolve({ id: 'order-1' }) 
      })
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('Não é possível excluir pedidos confirmados')
      
      // Verificar que não tentou deletar
      expect(mockPrisma.order.delete).not.toHaveBeenCalled()
    })
  })
})
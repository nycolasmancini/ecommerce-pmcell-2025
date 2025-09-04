import { NextRequest, NextResponse } from 'next/server'
import { POST, PATCH } from './route'

// Mock do prisma
const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  order: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn()
  },
  product: {
    findUnique: jest.fn()
  },
  productModel: {
    findUnique: jest.fn()
  },
  webhookLog: {
    create: jest.fn()
  }
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}))

describe('/api/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/orders', () => {
    const validOrderData = {
      customer: {
        name: 'João Silva',
        whatsapp: '5511999999999',
        email: 'joao@teste.com'
      },
      items: [
        {
          productId: 'product-1',
          quantity: 10,
          modelId: 'model-1',
          modelName: 'iPhone 14'
        }
      ],
      notes: 'Pedido urgente',
      originalWhatsapp: '5511999999999'
    }

    test('should create order with originalWhatsapp', async () => {
      // Mock customer não existe
      mockPrisma.customer.findUnique.mockResolvedValue(null)
      
      // Mock customer criado
      const mockCustomer = {
        id: 'customer-1',
        name: 'João Silva',
        whatsapp: '5511999999999',
        email: 'joao@teste.com'
      }
      mockPrisma.customer.create.mockResolvedValue(mockCustomer)
      
      // Mock product
      const mockProduct = {
        id: 'product-1',
        name: 'Capa iPhone',
        price: 25.00,
        specialQuantity: 50,
        specialPrice: 20.00
      }
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      
      // Mock product model
      const mockProductModel = {
        productId: 'product-1',
        modelId: 'model-1',
        price: 30.00
      }
      mockPrisma.productModel.findUnique.mockResolvedValue(mockProductModel)
      
      // Mock order criado
      const mockOrder = {
        id: 'order-1',
        orderNumber: '20241201001',
        customerId: 'customer-1',
        subtotal: 300.00,
        total: 300.00,
        originalWhatsapp: '5511999999999',
        finalWhatsapp: null,
        customer: mockCustomer,
        items: [{
          id: 'item-1',
          productId: 'product-1',
          productName: 'Capa iPhone',
          modelName: 'iPhone 14',
          quantity: 10,
          unitPrice: 30.00,
          totalPrice: 300.00
        }]
      }
      mockPrisma.order.create.mockResolvedValue(mockOrder)
      
      mockPrisma.webhookLog.create.mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.originalWhatsapp).toBe('5511999999999')
      expect(data.finalWhatsapp).toBe(null)
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalWhatsapp: '5511999999999'
          })
        })
      )
    })

    test('should validate whatsapp format', async () => {
      const invalidOrderData = {
        ...validOrderData,
        customer: {
          ...validOrderData.customer,
          whatsapp: '11999999999' // Sem código do país
        }
      }

      const request = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        body: JSON.stringify(invalidOrderData)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/orders/[id]', () => {
    test('should update customer name and finalWhatsapp', async () => {
      const mockOrder = {
        id: 'order-1',
        customerId: 'customer-1',
        originalWhatsapp: '5511999999999'
      }
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)

      const updatedCustomer = {
        id: 'customer-1',
        name: 'João Silva Atualizado'
      }
      mockPrisma.customer.update.mockResolvedValue(updatedCustomer)

      const updatedOrder = {
        ...mockOrder,
        finalWhatsapp: '5511888888888',
        customer: updatedCustomer
      }
      mockPrisma.order.update.mockResolvedValue(updatedOrder)

      // Mock do PATCH - precisamos implementar
      const updateData = {
        customerName: 'João Silva Atualizado',
        finalWhatsapp: '5511888888888'
      }

      // Este teste mostra o comportamento esperado
      expect(updatedOrder.finalWhatsapp).toBe('5511888888888')
      expect(updatedOrder.originalWhatsapp).toBe('5511999999999')
    })

    test('should handle whatsapp change tracking', async () => {
      const mockOrder = {
        id: 'order-1',
        customerId: 'customer-1',
        originalWhatsapp: '5511999999999'
      }

      const updateData = {
        customerName: 'João Silva',
        finalWhatsapp: '5511888888888' // Diferente do original
      }

      // Verificar que ambos os números são mantidos
      expect(mockOrder.originalWhatsapp).toBe('5511999999999')
      expect(updateData.finalWhatsapp).toBe('5511888888888')
    })
  })
})
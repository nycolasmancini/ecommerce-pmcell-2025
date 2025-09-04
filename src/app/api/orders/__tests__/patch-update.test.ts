import { NextRequest } from 'next/server'
import { PATCH } from '../[id]/route'
import { prisma } from '@/lib/prisma'

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    customer: {
      update: jest.fn()
    },
    order: {
      update: jest.fn()
    },
    webhookLog: {
      create: jest.fn()
    }
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PATCH /api/orders/[id] - Customer Name and WhatsApp Update', () => {
  const mockOrder = {
    id: 'order123',
    customerId: 'customer456',
    status: 'PENDING',
    confirmedAt: null,
    completedAt: null,
    subtotal: 100
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock console methods para não poluir os logs de teste
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    
    // Mock da busca do pedido existente
    mockPrisma.$queryRaw.mockResolvedValue([mockOrder])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should update customer name and finalWhatsapp successfully', async () => {
    // Mock das operações de atualização
    mockPrisma.customer.update.mockResolvedValue({
      id: 'customer456',
      name: 'João Silva',
      whatsapp: '5511999887766'
    })
    
    mockPrisma.order.update.mockResolvedValue({
      ...mockOrder,
      finalWhatsapp: '5511888777666',
      customer: {
        id: 'customer456',
        name: 'João Silva',
        whatsapp: '5511999887766'
      },
      items: []
    })

    const request = new NextRequest('http://localhost:3000/api/orders/order123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'João Silva',
        finalWhatsapp: '5511888777666'
      })
    })

    const params = Promise.resolve({ id: 'order123' })
    const response = await PATCH(request, { params })
    
    expect(response.status).toBe(200)
    
    // Verificar se o nome do cliente foi atualizado
    expect(mockPrisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer456' },
      data: { name: 'João Silva' }
    })
    
    // Verificar se o finalWhatsapp foi adicionado aos dados de atualização
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order123' },
      data: { finalWhatsapp: '5511888777666' },
      include: expect.any(Object)
    })
  })

  test('should handle WhatsApp validation correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders/order123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'João Silva',
        finalWhatsapp: '11999887766' // WhatsApp sem código do país
      })
    })

    const params = Promise.resolve({ id: 'order123' })
    const response = await PATCH(request, { params })
    
    expect(response.status).toBe(400)
    
    const responseData = await response.json()
    expect(responseData.error).toContain('WhatsApp final inválido')
  })

  test('should update customer name even without finalWhatsapp', async () => {
    mockPrisma.customer.update.mockResolvedValue({
      id: 'customer456',
      name: 'Maria Santos'
    })
    
    mockPrisma.order.update.mockResolvedValue({
      ...mockOrder,
      customer: { id: 'customer456', name: 'Maria Santos' },
      items: []
    })

    const request = new NextRequest('http://localhost:3000/api/orders/order123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Maria Santos'
        // Sem finalWhatsapp
      })
    })

    const params = Promise.resolve({ id: 'order123' })
    const response = await PATCH(request, { params })
    
    expect(response.status).toBe(200)
    
    // Verificar que apenas o nome foi atualizado
    expect(mockPrisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer456' },
      data: { name: 'Maria Santos' }
    })
    
    // Order.update deve ser chamado com dados vazios (sem finalWhatsapp)
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order123' },
      data: {}, // updateData vazio
      include: expect.any(Object)
    })
  })

  test('should handle database errors with detailed logging', async () => {
    const dbError = new Error('Database connection failed')
    mockPrisma.customer.update.mockRejectedValue(dbError)

    const consoleSpy = jest.spyOn(console, 'error')

    const request = new NextRequest('http://localhost:3000/api/orders/order123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'João Silva',
        finalWhatsapp: '5511888777666'
      })
    })

    const params = Promise.resolve({ id: 'order123' })
    const response = await PATCH(request, { params })
    
    expect(response.status).toBe(500)
    
    // Verificar que o erro foi logado com detalhes
    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Erro ao atualizar nome do cliente:',
      expect.objectContaining({
        customerId: 'customer456',
        error: 'Database connection failed'
      })
    )
  })

  test('should handle fallback for missing finalWhatsapp field', async () => {
    // Simular erro de campo não encontrado no primeiro update
    const fieldError = new Error('Column "finalWhatsapp" does not exist')
    fieldError.message = 'Unknown column finalWhatsapp'
    
    mockPrisma.customer.update.mockResolvedValue({
      id: 'customer456',
      name: 'João Silva'
    })
    
    mockPrisma.order.update
      .mockRejectedValueOnce(fieldError) // Falha na primeira tentativa
      .mockResolvedValueOnce({ // Sucesso na segunda tentativa (fallback)
        ...mockOrder,
        customer: { id: 'customer456', name: 'João Silva' },
        items: []
      })

    const request = new NextRequest('http://localhost:3000/api/orders/order123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'João Silva',
        finalWhatsapp: '5511888777666'
      })
    })

    const params = Promise.resolve({ id: 'order123' })
    const response = await PATCH(request, { params })
    
    expect(response.status).toBe(200)
    
    // Verificar que o fallback foi executado (segunda tentativa sem campos WhatsApp)
    expect(mockPrisma.order.update).toHaveBeenCalledTimes(2)
    expect(mockPrisma.order.update).toHaveBeenLastCalledWith({
      where: { id: 'order123' },
      data: {}, // Sem campos de WhatsApp no fallback
      include: expect.any(Object)
    })
  })
})
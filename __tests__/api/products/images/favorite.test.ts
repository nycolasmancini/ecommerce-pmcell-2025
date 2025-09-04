import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/products/[id]/images/[imageId]/favorite/route'
import { prisma } from '@/lib/prisma'

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    productImage: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    product: {
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PATCH /api/products/[id]/images/[imageId]/favorite', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve marcar imagem como favorita com sucesso', async () => {
    // Arrange
    const productId = 'prod-123'
    const imageId = 'img-456'
    
    const mockProduct = { id: productId, name: 'Test Product' }
    const mockImage = {
      id: imageId,
      productId: productId,
      url: 'data:image/jpeg;base64,test',
      fileName: 'test.jpg',
      order: 0,
      isMain: false
    }
    
    const mockUpdatedImage = { ...mockImage, isMain: true }

    mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
    mockPrisma.productImage.findUnique.mockResolvedValue(mockImage)
    
    // Mock da transação
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return await callback(mockPrisma)
    })
    
    mockPrisma.productImage.updateMany.mockResolvedValue({ count: 2 }) // Desmarcar outras
    mockPrisma.productImage.update.mockResolvedValue(mockUpdatedImage)

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.isMain).toBe(true)
    expect(data.id).toBe(imageId)
    
    // Verificar que removeu isMain das outras imagens
    expect(mockPrisma.productImage.updateMany).toHaveBeenCalledWith({
      where: { 
        productId: productId,
        id: { not: imageId }
      },
      data: { isMain: false }
    })
    
    // Verificar que marcou a imagem atual como principal
    expect(mockPrisma.productImage.update).toHaveBeenCalledWith({
      where: { id: imageId },
      data: { isMain: true }
    })
  })

  it('deve retornar erro 404 se produto não existir', async () => {
    // Arrange
    const productId = 'prod-nonexistent'
    const imageId = 'img-456'

    mockPrisma.product.findUnique.mockResolvedValue(null)

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe('Produto não encontrado')
  })

  it('deve retornar erro 404 se imagem não existir', async () => {
    // Arrange
    const productId = 'prod-123'
    const imageId = 'img-nonexistent'
    
    const mockProduct = { id: productId, name: 'Test Product' }

    mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
    mockPrisma.productImage.findUnique.mockResolvedValue(null)

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe('Imagem não encontrada')
  })

  it('deve retornar erro 400 se imagem não pertencer ao produto', async () => {
    // Arrange
    const productId = 'prod-123'
    const imageId = 'img-456'
    
    const mockProduct = { id: productId, name: 'Test Product' }
    const mockImage = {
      id: imageId,
      productId: 'prod-different', // Imagem de outro produto
      url: 'data:image/jpeg;base64,test',
      fileName: 'test.jpg',
      order: 0,
      isMain: false
    }

    mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
    mockPrisma.productImage.findUnique.mockResolvedValue(mockImage)

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe('Imagem não pertence a este produto')
  })

  it('deve retornar sucesso mesmo se imagem já for favorita', async () => {
    // Arrange
    const productId = 'prod-123'
    const imageId = 'img-456'
    
    const mockProduct = { id: productId, name: 'Test Product' }
    const mockImage = {
      id: imageId,
      productId: productId,
      url: 'data:image/jpeg;base64,test',
      fileName: 'test.jpg',
      order: 0,
      isMain: true // Já é favorita
    }

    mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
    mockPrisma.productImage.findUnique.mockResolvedValue(mockImage)
    
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return await callback(mockPrisma)
    })
    
    mockPrisma.productImage.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.productImage.update.mockResolvedValue(mockImage)

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.isMain).toBe(true)
  })

  it('deve retornar erro 500 em caso de falha no banco de dados', async () => {
    // Arrange
    const productId = 'prod-123'
    const imageId = 'img-456'

    mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'))

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.error).toBe('Erro interno do servidor')
  })
})
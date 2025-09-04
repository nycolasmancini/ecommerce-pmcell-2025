import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/products/[id]/images/[imageId]/route'
import { prisma } from '@/lib/prisma'
import { createProductWithImages, cleanupTestData } from '../../../helpers/testHelpers'

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    productImage: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    product: {
      findUnique: jest.fn()
    }
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('DELETE /api/products/[id]/images/[imageId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  it('deve deletar uma imagem com sucesso', async () => {
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

    mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
    mockPrisma.productImage.findUnique.mockResolvedValue(mockImage)
    mockPrisma.productImage.count.mockResolvedValue(3) // 3 imagens restantes
    mockPrisma.productImage.delete.mockResolvedValue(mockImage)

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await DELETE(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, message: 'Imagem deletada com sucesso' })
    expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({
      where: { id: imageId }
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
    const response = await DELETE(request, { params })
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
    const response = await DELETE(request, { params })
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
    const response = await DELETE(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe('Imagem não pertence a este produto')
  })

  it('deve retornar erro 400 se tentar deletar a única imagem do produto', async () => {
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
      isMain: true
    }

    mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
    mockPrisma.productImage.findUnique.mockResolvedValue(mockImage)
    mockPrisma.productImage.count.mockResolvedValue(1) // Única imagem

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await DELETE(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe('Não é possível deletar a única imagem do produto')
    expect(mockPrisma.productImage.delete).not.toHaveBeenCalled()
  })

  it('deve retornar erro 500 em caso de falha no banco de dados', async () => {
    // Arrange
    const productId = 'prod-123'
    const imageId = 'img-456'

    mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'))

    const params = Promise.resolve({ id: productId, imageId: imageId })
    const request = new NextRequest('http://localhost:3000/api/test')

    // Act
    const response = await DELETE(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.error).toBe('Erro interno do servidor')
  })
})
// Mock environment first
Object.defineProperty(global, 'Request', {
  writable: true,
  value: class MockRequest {
    constructor(input, init) {
      this.url = input
      this.init = init
    }
  }
})

Object.defineProperty(global, 'Response', {
  writable: true,
  value: class MockResponse {
    constructor(body, init) {
      this.body = body
      this.init = init
      this.ok = init?.status ? init.status < 400 : true
      this.status = init?.status || 200
    }
    
    async json() {
      return JSON.parse(this.body)
    }
  }
})

// Mock Next.js
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (data, init) => new Response(JSON.stringify(data), init)
  }
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    productSupplier: {
      deleteMany: jest.fn(),
    },
    productModel: {
      deleteMany: jest.fn(),
    },
    orderItem: {
      deleteMany: jest.fn(),
    },
    kitProduct: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock db functions
jest.mock('@/lib/db', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  query: jest.fn(),
  deleteProduct: jest.fn(),
  deleteProductRelations: jest.fn(),
}))

import { DELETE } from '@/app/api/products/[id]/route'

describe('/api/products/[id] - DELETE', () => {
  const mockParams = { params: Promise.resolve({ id: 'test-product-1' }) }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset para desenvolvimento por padrão
    process.env.NODE_ENV = 'development'
  })

  describe('Validação de Entrada', () => {
    test('deve retornar erro 404 quando produto não existe em desenvolvimento', async () => {
      const { prisma } = require('@/lib/prisma')
      
      prisma.product.findUnique.mockResolvedValue(null)

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Produto não encontrado')
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-product-1' }
      })
    })

    test('deve retornar erro 404 quando produto não existe em produção', async () => {
      process.env.NODE_ENV = 'production'
      
      const { query } = require('@/lib/db')
      query.mockResolvedValue({ rows: [] })

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Produto não encontrado')
      expect(query).toHaveBeenCalledWith(
        'SELECT "id" FROM "Product" WHERE "id" = $1',
        ['test-product-1']
      )
    })
  })

  describe('Exclusão em Desenvolvimento (Prisma)', () => {
    test('deve excluir produto com sucesso usando transação', async () => {
      const mockProduct = {
        id: 'test-product-1',
        name: 'Produto Test',
        price: 10.00
      }

      const { prisma } = require('@/lib/prisma')
      
      prisma.product.findUnique.mockResolvedValue(mockProduct)
      
      // Mock da transação
      const mockTx = {
        productSupplier: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
        productModel: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
        orderItem: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        kitProduct: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        product: { delete: jest.fn().mockResolvedValue(mockProduct) }
      }
      
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.message).toBe('Produto excluído com sucesso')
      
      // Verificar que a transação foi chamada
      expect(prisma.$transaction).toHaveBeenCalled()
      
      // Verificar que as relações foram excluídas na ordem correta
      expect(mockTx.productSupplier.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'test-product-1' }
      })
      expect(mockTx.productModel.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'test-product-1' }
      })
      expect(mockTx.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'test-product-1' }
      })
      expect(mockTx.kitProduct.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'test-product-1' }
      })
      expect(mockTx.product.delete).toHaveBeenCalledWith({
        where: { id: 'test-product-1' }
      })
    })

    test('deve tratar erro durante transação', async () => {
      const mockProduct = {
        id: 'test-product-1',
        name: 'Produto Test'
      }

      const { prisma } = require('@/lib/prisma')
      
      prisma.product.findUnique.mockResolvedValue(mockProduct)
      prisma.$transaction.mockRejectedValue(new Error('Constraint violation'))

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Erro ao excluir produto: Constraint violation')
    })
  })

  describe('Exclusão em Produção (SQL Direto)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    test('deve excluir produto com sucesso usando SQL direto', async () => {
      const { query, deleteProduct } = require('@/lib/db')
      
      // Mock produto existe
      query.mockResolvedValueOnce({ rows: [{ id: 'test-product-1' }] })
      
      // Mock exclusão bem-sucedida
      deleteProduct.mockResolvedValue({ success: true })

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.message).toBe('Produto excluído com sucesso')
      expect(deleteProduct).toHaveBeenCalledWith('test-product-1')
    })

    test('deve tratar erro de conexão com banco', async () => {
      const { query, testConnection } = require('@/lib/db')
      
      query.mockResolvedValueOnce({ rows: [{ id: 'test-product-1' }] })
      testConnection.mockResolvedValue(false)

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toContain('Database connection failed')
    })

    test('deve tratar erro durante exclusão SQL', async () => {
      const { query, deleteProduct, testConnection } = require('@/lib/db')
      
      testConnection.mockResolvedValue(true)
      query.mockResolvedValueOnce({ rows: [{ id: 'test-product-1' }] })
      deleteProduct.mockRejectedValue(new Error('SQL constraint error'))

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Erro ao excluir produto: SQL constraint error')
    })

    test('deve tratar resposta vazia do banco', async () => {
      const { query, testConnection, deleteProduct } = require('@/lib/db')
      
      testConnection.mockResolvedValue(true)
      // Mock produto existe na verificação inicial
      query.mockResolvedValueOnce({ rows: [{ id: 'test-product-1' }] })
      // Mock deleteProduct falha
      deleteProduct.mockResolvedValue({ success: false })

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Falha ao excluir produto')
    })
  })

  describe('Tratamento de Erros Genéricos', () => {
    test('deve tratar erro inesperado', async () => {
      const { prisma } = require('@/lib/prisma')
      
      prisma.product.findUnique.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Erro ao excluir produto: Unexpected error')
    })

    test('deve tratar erro sem mensagem', async () => {
      const { prisma } = require('@/lib/prisma')
      
      prisma.product.findUnique.mockImplementation(() => {
        throw { code: 'UNKNOWN_ERROR' }
      })

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Erro ao excluir produto: Erro desconhecido')
    })
  })

  describe('Casos Edge', () => {
    test('deve tratar ID inválido', async () => {
      const invalidParams = { params: Promise.resolve({ id: '' }) }
      
      const response = await DELETE(null, invalidParams)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('ID do produto inválido')
    })

    test('deve tratar produto com muitas relações', async () => {
      const mockProduct = { id: 'test-product-1', name: 'Produto Popular' }

      const { prisma } = require('@/lib/prisma')
      
      prisma.product.findUnique.mockResolvedValue(mockProduct)
      
      // Mock transação com muitas relações
      const mockTx = {
        productSupplier: { deleteMany: jest.fn().mockResolvedValue({ count: 15 }) },
        productModel: { deleteMany: jest.fn().mockResolvedValue({ count: 8 }) },
        orderItem: { deleteMany: jest.fn().mockResolvedValue({ count: 50 }) },
        kitProduct: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
        product: { delete: jest.fn().mockResolvedValue(mockProduct) }
      }
      
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTx)
      })

      const response = await DELETE(null, mockParams)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.message).toBe('Produto excluído com sucesso')
      expect(mockTx.orderItem.deleteMany).toHaveBeenCalled()
    })
  })
})
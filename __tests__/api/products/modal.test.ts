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
      create: jest.fn(),
      update: jest.fn(),
    },
    brand: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    model: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    productModel: {
      create: jest.fn(),
    },
  },
}))

// Mock db functions
jest.mock('@/lib/db', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  createProduct: jest.fn(),
  createProductImage: jest.fn(),
  findOrCreateBrand: jest.fn(),
  findOrCreateModel: jest.fn(),
  createProductModel: jest.fn(),
  updateProduct: jest.fn(),
}))

import { POST } from '@/app/api/products/modal/route'

describe('/api/products/modal', () => {
  const mockFormData = {
    name: 'Capa Test',
    description: 'Descrição test',
    categoryId: '1',
    quickAddIncrement: '25',
    models: JSON.stringify([
      {
        brandName: 'Apple',
        modelName: 'iPhone 15',
        price: '25.00',
        superWholesalePrice: '20.00'
      }
    ])
  }

  const createMockRequest = (data: any, files: File[] = []) => {
    const formData = new FormData()
    
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value as string)
    })
    
    // Mock files with arrayBuffer method
    const mockFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(file.size))
    }))
    
    mockFiles.forEach(file => {
      formData.append('images', file as any)
    })
    
    return {
      formData: async () => formData
    } as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock NODE_ENV para desenvolvimento
    process.env.NODE_ENV = 'development'
  })

  describe('Validação de Entrada', () => {
    test('deve retornar erro quando nome não fornecido', async () => {
      const request = createMockRequest({
        ...mockFormData,
        name: ''
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Campos obrigatórios não preenchidos')
    })

    test('deve retornar erro quando descrição não fornecida', async () => {
      const request = createMockRequest({
        ...mockFormData,
        description: ''
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Campos obrigatórios não preenchidos')
    })

    test('deve retornar erro quando categoryId não fornecido', async () => {
      const request = createMockRequest({
        ...mockFormData,
        categoryId: ''
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Campos obrigatórios não preenchidos')
    })

    test('deve retornar erro quando nenhum modelo fornecido', async () => {
      const request = createMockRequest({
        ...mockFormData,
        models: JSON.stringify([])
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Pelo menos um modelo deve ser adicionado')
    })

    test('deve retornar erro quando nenhuma imagem fornecida', async () => {
      const request = createMockRequest(mockFormData, [])

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Pelo menos uma imagem deve ser enviada')
    })
  })

  describe('Processamento de Imagens', () => {
    test('deve processar imagens corretamente', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const request = createMockRequest(mockFormData, [mockFile])

      // Mock do banco para desenvolvimento
      const { prisma } = require('@/lib/prisma')
      prisma.product.create.mockResolvedValue({
        id: '1',
        name: 'Capa Test',
        description: 'Descrição test',
        isModalProduct: true,
        quickAddIncrement: 25
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })

    test('deve rejeitar arquivos muito grandes', async () => {
      // Criar um arquivo maior que 5MB
      const largeContent = 'x'.repeat(6 * 1024 * 1024) // 6MB
      const mockFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      const request = createMockRequest(mockFormData, [mockFile])

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Pelo menos uma imagem deve ser enviada')
    })
  })

  describe('Criação de Marcas e Modelos', () => {
    test('deve criar nova marca quando não existir', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const request = createMockRequest(mockFormData, [mockFile])

      const { prisma } = require('@/lib/prisma')
      
      // Mock produto criado
      prisma.product.create.mockResolvedValue({
        id: '1',
        name: 'Capa Test',
        isModalProduct: true,
      })

      // Mock marca não encontrada, então cria nova
      prisma.brand.findUnique.mockResolvedValue(null)
      prisma.brand.create.mockResolvedValue({
        id: 'brand-1',
        name: 'Apple'
      })

      // Mock modelo não encontrado, então cria novo
      prisma.model.findUnique.mockResolvedValue(null)
      prisma.model.create.mockResolvedValue({
        id: 'model-1',
        name: 'iPhone 15',
        brandId: 'brand-1'
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(prisma.brand.create).toHaveBeenCalledWith({
        data: { name: 'Apple' }
      })
    })

    test('deve reutilizar marca existente', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const request = createMockRequest(mockFormData, [mockFile])

      const { prisma } = require('@/lib/prisma')
      
      // Mock produto criado
      prisma.product.create.mockResolvedValue({
        id: '1',
        name: 'Capa Test',
        isModalProduct: true,
      })

      // Mock marca existente
      prisma.brand.findUnique.mockResolvedValue({
        id: 'existing-brand-1',
        name: 'Apple'
      })

      // Mock modelo não encontrado
      prisma.model.findUnique.mockResolvedValue(null)
      prisma.model.create.mockResolvedValue({
        id: 'model-1',
        name: 'iPhone 15',
        brandId: 'existing-brand-1'
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.brand.create).not.toHaveBeenCalled()
      expect(prisma.model.create).toHaveBeenCalledWith({
        data: {
          name: 'iPhone 15',
          brandId: 'existing-brand-1'
        }
      })
    })

    test('deve criar ProductModel com preços corretos', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const request = createMockRequest(mockFormData, [mockFile])

      const { prisma } = require('@/lib/prisma')
      
      prisma.product.create.mockResolvedValue({ id: '1' })
      prisma.brand.findUnique.mockResolvedValue({ id: 'brand-1' })
      prisma.model.findUnique.mockResolvedValue({ id: 'model-1' })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.productModel.create).toHaveBeenCalledWith({
        data: {
          productId: '1',
          modelId: 'model-1',
          price: 25.00,
          superWholesalePrice: 20.00
        }
      })
    })
  })

  describe('Tratamento de Erros', () => {
    test('deve retornar erro 500 quando banco falha', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const request = createMockRequest(mockFormData, [mockFile])

      const { prisma } = require('@/lib/prisma')
      prisma.product.create.mockRejectedValue(new Error('Database error'))

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Erro interno do servidor')
    })
  })

  describe('Processamento em Produção vs Desenvolvimento', () => {
    test('deve usar SQL direto em produção', async () => {
      process.env.NODE_ENV = 'production'
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const request = createMockRequest(mockFormData, [mockFile])

      const { createProduct, findOrCreateBrand, findOrCreateModel } = require('@/lib/db')
      
      createProduct.mockResolvedValue({ id: '1' })
      findOrCreateBrand.mockResolvedValue({ id: 'brand-1' })
      findOrCreateModel.mockResolvedValue({ id: 'model-1' })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(createProduct).toHaveBeenCalled()
      expect(findOrCreateBrand).toHaveBeenCalledWith('Apple')
      expect(findOrCreateModel).toHaveBeenCalledWith('iPhone 15', 'brand-1')
    })
  })
})
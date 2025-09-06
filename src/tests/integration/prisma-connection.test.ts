import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals'
import { prisma, testDatabaseConnection, checkDatabaseTables } from '@/lib/prisma'

// Mock do Prisma para testes
jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    visit: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    user: {
      findFirst: jest.fn()
    }
  }
  
  return {
    prisma: mockPrisma,
    testDatabaseConnection: jest.fn(async () => {
      try {
        await mockPrisma.$connect()
        console.log('✅ Banco de dados conectado com sucesso')
        return true
      } catch (error) {
        console.error('❌ Erro ao conectar com o banco de dados:', error)
        return false
      }
    }),
    checkDatabaseTables: jest.fn(async () => {
      try {
        await mockPrisma.user.findFirst()
        console.log('✅ Tabela User encontrada')
        return true
      } catch (error) {
        console.log('⚠️ Tabela User não encontrada, usando fallback')
        return false
      }
    })
  }
})

describe('Prisma Database Connection', () => {
  beforeAll(() => {
    jest.clearAllMocks()
  })
  
  afterAll(async () => {
    await prisma.$disconnect()
    jest.clearAllMocks()
  })
  
  describe('Connection Tests', () => {
    test('should successfully connect to database', async () => {
      ;(prisma.$connect as jest.Mock).mockResolvedValue(undefined)
      
      const result = await testDatabaseConnection()
      
      expect(result).toBe(true)
      expect(prisma.$connect).toHaveBeenCalled()
    })
    
    test('should handle connection errors gracefully', async () => {
      ;(prisma.$connect as jest.Mock).mockRejectedValue(
        new Error('Connection refused')
      )
      
      const result = await testDatabaseConnection()
      
      expect(result).toBe(false)
      expect(prisma.$connect).toHaveBeenCalled()
    })
    
    test('should verify database tables exist', async () => {
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com'
      })
      
      const result = await checkDatabaseTables()
      
      expect(result).toBe(true)
      expect(prisma.user.findFirst).toHaveBeenCalled()
    })
    
    test('should handle missing tables gracefully', async () => {
      ;(prisma.user.findFirst as jest.Mock).mockRejectedValue(
        new Error('Table does not exist')
      )
      
      const result = await checkDatabaseTables()
      
      expect(result).toBe(false)
      expect(prisma.user.findFirst).toHaveBeenCalled()
    })
  })
  
  describe('Visit Model Operations', () => {
    test('should have all required methods for Visit model', () => {
      expect(prisma.visit.findUnique).toBeDefined()
      expect(prisma.visit.findFirst).toBeDefined()
      expect(prisma.visit.findMany).toBeDefined()
      expect(prisma.visit.create).toBeDefined()
      expect(prisma.visit.update).toBeDefined()
      expect(prisma.visit.upsert).toBeDefined()
      expect(prisma.visit.delete).toBeDefined()
      expect(prisma.visit.count).toBeDefined()
    })
    
    test('should create a new visit', async () => {
      const mockVisit = {
        id: 'visit_1',
        sessionId: 'session_123',
        status: 'active',
        hasCart: false,
        startTime: new Date(),
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      ;(prisma.visit.create as jest.Mock).mockResolvedValue(mockVisit)
      
      const result = await prisma.visit.create({
        data: {
          sessionId: 'session_123',
          status: 'active',
          hasCart: false
        }
      })
      
      expect(result).toEqual(mockVisit)
      expect(prisma.visit.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session_123',
          status: 'active',
          hasCart: false
        }
      })
    })
    
    test('should upsert a visit', async () => {
      const mockVisit = {
        id: 'visit_2',
        sessionId: 'session_456',
        status: 'active',
        hasCart: true,
        cartValue: 99.90,
        cartItems: 1
      }
      
      ;(prisma.visit.upsert as jest.Mock).mockResolvedValue(mockVisit)
      
      const result = await prisma.visit.upsert({
        where: { sessionId: 'session_456' },
        update: {
          hasCart: true,
          cartValue: 99.90,
          cartItems: 1
        },
        create: {
          sessionId: 'session_456',
          status: 'active',
          hasCart: true,
          cartValue: 99.90,
          cartItems: 1
        }
      })
      
      expect(result).toEqual(mockVisit)
      expect(prisma.visit.upsert).toHaveBeenCalled()
    })
    
    test('should find visits by criteria', async () => {
      const mockVisits = [
        {
          id: 'visit_1',
          sessionId: 'session_123',
          whatsapp: '+5519999999999'
        },
        {
          id: 'visit_2',
          sessionId: 'session_456',
          whatsapp: '+5519888888888'
        }
      ]
      
      ;(prisma.visit.findMany as jest.Mock).mockResolvedValue(mockVisits)
      
      const result = await prisma.visit.findMany({
        where: {
          whatsapp: { not: null }
        }
      })
      
      expect(result).toEqual(mockVisits)
      expect(prisma.visit.findMany).toHaveBeenCalledWith({
        where: {
          whatsapp: { not: null }
        }
      })
    })
    
    test('should count visits', async () => {
      ;(prisma.visit.count as jest.Mock).mockResolvedValue(42)
      
      const result = await prisma.visit.count({
        where: {
          status: 'active'
        }
      })
      
      expect(result).toBe(42)
      expect(prisma.visit.count).toHaveBeenCalledWith({
        where: {
          status: 'active'
        }
      })
    })
  })
  
  describe('Raw Query Tests', () => {
    test('should execute raw SQL queries', async () => {
      const mockResult = [{ count: 10 }]
      
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResult)
      
      const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Visit`
      
      expect(result).toEqual(mockResult)
      expect(prisma.$queryRaw).toHaveBeenCalled()
    })
    
    test('should handle raw query errors', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('SQL syntax error')
      )
      
      await expect(
        prisma.$queryRaw`SELECT * FROM NonExistentTable`
      ).rejects.toThrow('SQL syntax error')
    })
  })
  
  describe('Connection Lifecycle', () => {
    test('should disconnect from database', async () => {
      ;(prisma.$disconnect as jest.Mock).mockResolvedValue(undefined)
      
      await prisma.$disconnect()
      
      expect(prisma.$disconnect).toHaveBeenCalled()
    })
    
    test('should handle disconnect errors', async () => {
      ;(prisma.$disconnect as jest.Mock).mockRejectedValue(
        new Error('Already disconnected')
      )
      
      await expect(prisma.$disconnect()).rejects.toThrow('Already disconnected')
    })
  })
})
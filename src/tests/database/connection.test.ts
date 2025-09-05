/**
 * Testes de Conexão com Banco de Dados - Supabase
 * Garante que a conexão com o banco está funcionando corretamente
 */

import { prisma, testDatabaseConnection, checkDatabaseTables } from '@/lib/prisma'

describe('Database Connection Tests', () => {
  afterAll(async () => {
    // Limpar conexões após os testes
    await prisma.$disconnect()
  })

  describe('Basic Connection', () => {
    test('deve conectar com o Supabase com sucesso', async () => {
      const isConnected = await testDatabaseConnection()
      expect(isConnected).toBe(true)
    })

    test('deve conseguir fazer ping no banco', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as ping`
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('ping', 1)
    })
  })

  describe('Tables Verification', () => {
    test('deve verificar se as tabelas principais existem', async () => {
      // Testar se a tabela Visit existe e está acessível
      const visitTableExists = async () => {
        try {
          await prisma.visit.findFirst()
          return true
        } catch (error) {
          console.error('Erro ao acessar tabela Visit:', error)
          return false
        }
      }

      const exists = await visitTableExists()
      expect(exists).toBe(true)
    })

    test('deve verificar estrutura da tabela Visit', async () => {
      // Query para verificar se as colunas necessárias existem
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'Visit' AND table_schema = 'public'
      `
      
      expect(Array.isArray(columns)).toBe(true)
      
      // Verificar se as colunas essenciais existem
      const columnNames = (columns as any[]).map(col => col.column_name)
      
      const requiredColumns = [
        'id', 'sessionId', 'whatsapp', 'startTime', 'searchTerms',
        'categoriesVisited', 'productsViewed', 'status', 'hasCart',
        'cartValue', 'cartItems', 'lastActivity', 'createdAt', 'updatedAt'
      ]
      
      requiredColumns.forEach(column => {
        expect(columnNames).toContain(column)
      })
    })
  })

  describe('Connection Resilience', () => {
    test('deve lidar com timeout de conexão', async () => {
      // Teste com timeout mais baixo
      const shortTimeoutTest = async () => {
        const start = Date.now()
        try {
          await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ])
          return Date.now() - start
        } catch (error) {
          throw new Error(`Connection timeout: ${error}`)
        }
      }

      const duration = await shortTimeoutTest()
      expect(duration).toBeLessThan(5000) // Deve responder em menos de 5s
    })

    test('deve recuperar de falha temporária', async () => {
      // Simular reconexão após desconexão
      await prisma.$disconnect()
      
      // Tentar conectar novamente
      const isReconnected = await testDatabaseConnection()
      expect(isReconnected).toBe(true)
    })
  })

  describe('CRUD Operations', () => {
    const testSessionId = `test-session-${Date.now()}`

    afterEach(async () => {
      // Limpar dados de teste
      try {
        await prisma.visit.deleteMany({
          where: { sessionId: { contains: 'test-session-' } }
        })
      } catch (error) {
        console.warn('Erro ao limpar dados de teste:', error)
      }
    })

    test('deve conseguir criar um registro na tabela Visit', async () => {
      const visitData = {
        sessionId: testSessionId,
        whatsapp: null,
        searchTerms: '[]',
        categoriesVisited: '[]',
        productsViewed: '[]',
        status: 'active',
        hasCart: false,
        cartValue: null,
        cartItems: null,
        startTime: new Date(),
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const createdVisit = await prisma.visit.create({
        data: visitData
      })

      expect(createdVisit).toBeDefined()
      expect(createdVisit.sessionId).toBe(testSessionId)
      expect(createdVisit.status).toBe('active')
    })

    test('deve conseguir fazer upsert (update ou create)', async () => {
      const visitData = {
        sessionId: testSessionId,
        whatsapp: '+5511999999999',
        searchTerms: '["produto", "teste"]',
        categoriesVisited: '[]',
        productsViewed: '[]',
        status: 'active' as const,
        hasCart: true,
        cartValue: 150.50,
        cartItems: 3,
        startTime: new Date(),
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Primeiro upsert (create)
      const firstUpsert = await prisma.visit.upsert({
        where: { sessionId: testSessionId },
        create: visitData,
        update: { 
          whatsapp: visitData.whatsapp,
          updatedAt: new Date()
        }
      })

      expect(firstUpsert.sessionId).toBe(testSessionId)
      expect(firstUpsert.whatsapp).toBe('+5511999999999')

      // Segundo upsert (update)
      const secondUpsert = await prisma.visit.upsert({
        where: { sessionId: testSessionId },
        create: visitData,
        update: {
          hasCart: false,
          cartValue: 0,
          updatedAt: new Date()
        }
      })

      expect(secondUpsert.sessionId).toBe(testSessionId)
      expect(secondUpsert.hasCart).toBe(false)
      expect(secondUpsert.cartValue).toBe(0)
    })
  })

  describe('Performance Tests', () => {
    test('deve executar consultas básicas rapidamente', async () => {
      const start = Date.now()
      
      await prisma.visit.findFirst()
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(1000) // Menos de 1 segundo
    })

    test('deve suportar múltiplas conexões simultâneas', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        prisma.$queryRaw`SELECT ${i} as test_number`
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(5)
      results.forEach((result, index) => {
        expect(result[0]).toHaveProperty('test_number', index)
      })
    })
  })
})
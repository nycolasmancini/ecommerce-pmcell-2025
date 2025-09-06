import { describe, test, expect } from '@jest/globals'

describe('Prisma Import Validation', () => {
  test('should export prisma as named export from @/lib/prisma', () => {
    const prismaModule = require('@/lib/prisma')
    
    // Verificar que prisma é uma named export
    expect(prismaModule.prisma).toBeDefined()
    expect(typeof prismaModule.prisma).toBe('object')
    
    // Verificar que NÃO existe default export
    expect(prismaModule.default).toBeUndefined()
    
    // Verificar métodos essenciais do Prisma
    expect(prismaModule.prisma.$connect).toBeDefined()
    expect(prismaModule.prisma.$disconnect).toBeDefined()
    expect(prismaModule.prisma.visit).toBeDefined()
  })
  
  test('should export helper functions from @/lib/prisma', () => {
    const prismaModule = require('@/lib/prisma')
    
    // Verificar funções auxiliares
    expect(prismaModule.testDatabaseConnection).toBeDefined()
    expect(typeof prismaModule.testDatabaseConnection).toBe('function')
    
    expect(prismaModule.checkDatabaseTables).toBeDefined()
    expect(typeof prismaModule.checkDatabaseTables).toBe('function')
  })
  
  test('should have Visit model with required methods', () => {
    const { prisma } = require('@/lib/prisma')
    
    // Verificar métodos do modelo Visit
    expect(prisma.visit.findUnique).toBeDefined()
    expect(prisma.visit.findFirst).toBeDefined()
    expect(prisma.visit.findMany).toBeDefined()
    expect(prisma.visit.create).toBeDefined()
    expect(prisma.visit.update).toBeDefined()
    expect(prisma.visit.upsert).toBeDefined()
    expect(prisma.visit.delete).toBeDefined()
    expect(prisma.visit.count).toBeDefined()
  })
})
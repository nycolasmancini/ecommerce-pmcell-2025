/**
 * Mock do Prisma Client para testes
 */

import { jest } from '@jest/globals'
import type { PrismaClient } from '@prisma/client'

// Mock das operações do Prisma
export const prismaMock = {
  visit: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  // Adicione outras tabelas conforme necessário
} as unknown as jest.Mocked<PrismaClient>

// Exportar como default para compatibilidade
export default prismaMock
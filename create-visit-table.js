require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

async function createVisitTable() {
  try {
    console.log('🔧 Criando tabela Visit no Supabase...')
    
    // Criar a tabela Visit
    console.log('📝 Criando tabela...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Visit" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "sessionId" TEXT NOT NULL,
        "whatsapp" TEXT,
        "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "endTime" TIMESTAMP(3),
        "sessionDuration" INTEGER,
        "searchTerms" JSONB,
        "categoriesVisited" JSONB,
        "productsViewed" JSONB,
        "status" TEXT NOT NULL DEFAULT 'active',
        "hasCart" BOOLEAN NOT NULL DEFAULT false,
        "cartValue" DECIMAL(65,30),
        "cartItems" INTEGER,
        "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "whatsappCollectedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
      )
    `)
    
    console.log('📝 Criando índice único para sessionId...')
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Visit_sessionId_key" ON "Visit"("sessionId")
    `)
    
    console.log('📝 Criando índices de performance...')
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Visit_whatsapp_idx" ON "Visit"("whatsapp")
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Visit_startTime_idx" ON "Visit"("startTime")
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Visit_status_idx" ON "Visit"("status")
    `)
    
    console.log('✅ Tabela Visit criada com sucesso')
    
    // Verificar se foi criada
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Visit"`
    console.log('📊 Contagem inicial da tabela Visit:', result[0].count)
    
    // Testar inserção de um registro de teste
    const testSession = `test-creation-${Date.now()}`
    
    await prisma.visit.create({
      data: {
        sessionId: testSession,
        searchTerms: JSON.stringify(['teste']),
        categoriesVisited: JSON.stringify([]),
        productsViewed: JSON.stringify([]),
        status: 'active',
        hasCart: false,
        lastActivity: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Registro de teste criado com sucesso')
    
    // Remover registro de teste
    await prisma.visit.delete({
      where: { sessionId: testSession }
    })
    
    console.log('✅ Registro de teste removido')
    console.log('🎉 Tabela Visit está funcionando perfeitamente!')
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela Visit:', error.message)
    console.error('📝 Stack trace:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

createVisitTable()
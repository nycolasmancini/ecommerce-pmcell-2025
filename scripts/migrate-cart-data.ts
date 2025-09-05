import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Arquivo onde carrinhos são salvos
const CARTS_FILE = path.join(process.cwd(), 'data', 'abandoned-carts.json')

interface CartItem {
  id: string
  productId: string
  name: string
  subname?: string
  image?: string
  modelId?: string
  modelName?: string
  quantity: number
  unitPrice: number
  specialPrice?: number
  specialQuantity?: number
  superWholesalePrice?: number
  superWholesaleQuantity?: number
}

interface CartData {
  items: CartItem[]
  total: number
}

interface AbandonedCart {
  id: string
  sessionId: string
  whatsapp?: string | null
  cartData: CartData
  analyticsData?: any
  lastActivity: string
  webhookSent?: boolean
  webhookSentAt?: string | null
  createdAt: string
  updatedAt: string
}

async function migrateCartData() {
  console.log('🔄 Iniciando migração de dados do carrinho...')
  
  try {
    // Verificar se arquivo existe
    if (!fs.existsSync(CARTS_FILE)) {
      console.log('❌ Arquivo de carrinhos não encontrado:', CARTS_FILE)
      return
    }

    // Carregar dados do arquivo
    const fileData = fs.readFileSync(CARTS_FILE, 'utf8')
    const carts: AbandonedCart[] = JSON.parse(fileData)
    
    console.log(`📦 Encontrados ${carts.length} carrinhos no arquivo`)
    
    let migratedCount = 0
    let errorCount = 0
    
    for (const cart of carts) {
      try {
        // Verificar se carrinho tem itens
        if (!cart.cartData?.items || cart.cartData.items.length === 0) {
          console.log(`⏭️  Pulando carrinho vazio: ${cart.sessionId}`)
          continue
        }

        // Sincronizar com banco de dados
        await prisma.visit.upsert({
          where: { sessionId: cart.sessionId },
          update: {
            whatsapp: cart.whatsapp || undefined,
            hasCart: true,
            cartValue: cart.cartData.total,
            cartItems: cart.cartData.items.length,
            cartData: JSON.stringify({
              items: cart.cartData.items,
              total: cart.cartData.total
            }),
            lastActivity: new Date(cart.lastActivity),
            updatedAt: new Date(cart.updatedAt)
          },
          create: {
            sessionId: cart.sessionId,
            whatsapp: cart.whatsapp || null,
            hasCart: true,
            cartValue: cart.cartData.total,
            cartItems: cart.cartData.items.length,
            cartData: JSON.stringify({
              items: cart.cartData.items,
              total: cart.cartData.total
            }),
            lastActivity: new Date(cart.lastActivity),
            startTime: new Date(cart.createdAt),
            status: 'abandoned'
          }
        })
        
        migratedCount++
        
        if (migratedCount % 10 === 0) {
          console.log(`✅ Migrados ${migratedCount}/${carts.length} carrinhos...`)
        }
        
      } catch (error) {
        console.error(`❌ Erro ao migrar carrinho ${cart.sessionId}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n🎉 Migração concluída!`)
    console.log(`✅ Carrinhos migrados: ${migratedCount}`)
    console.log(`❌ Erros: ${errorCount}`)
    console.log(`📊 Total processados: ${carts.length}`)
    
    // Verificar dados migrados
    const visitsWithCart = await prisma.visit.findMany({
      where: {
        hasCart: true
      },
      select: {
        sessionId: true,
        cartValue: true,
        cartItems: true,
        cartData: true
      }
    })
    
    console.log(`\n📋 Verificação: ${visitsWithCart.length} visitas com carrinho no banco`)
    
    // Mostrar algumas amostras
    if (visitsWithCart.length > 0) {
      console.log('\n🔍 Amostras migradas:')
      visitsWithCart.slice(0, 3).forEach(visit => {
        const cartData = typeof visit.cartData === 'string' 
          ? JSON.parse(visit.cartData) 
          : visit.cartData
        
        console.log(`- ${visit.sessionId}: ${cartData?.items?.length || 0} itens, R$ ${visit.cartValue}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar migração se script for chamado diretamente
if (require.main === module) {
  migrateCartData().catch(console.error)
}

export { migrateCartData }
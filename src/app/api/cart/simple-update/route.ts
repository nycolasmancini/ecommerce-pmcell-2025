import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Arquivo simples para armazenar carrinhos (fallback sem banco)
const CARTS_FILE = path.join(process.cwd(), 'data', 'abandoned-carts.json')

// Rate limiting simples (em memória)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 30 // 30 requests por minuto

// Garantir que a pasta data existe
function ensureDataDir() {
  const dataDir = path.dirname(CARTS_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Carregar carrinhos do arquivo
function loadCarts(): any[] {
  try {
    if (fs.existsSync(CARTS_FILE)) {
      const data = fs.readFileSync(CARTS_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Erro ao carregar carrinhos:', error)
  }
  return []
}

// Salvar carrinhos no arquivo
function saveCarts(carts: any[]) {
  try {
    ensureDataDir()
    fs.writeFileSync(CARTS_FILE, JSON.stringify(carts, null, 2))
  } catch (error) {
    console.error('Erro ao salvar carrinhos:', error)
  }
}

// Função de rate limiting
function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const clientData = rateLimitMap.get(sessionId)

  if (!clientData || now > clientData.resetTime) {
    // Nova janela de tempo
    rateLimitMap.set(sessionId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false // Rate limit excedido
  }

  // Incrementar contador
  clientData.count++
  rateLimitMap.set(sessionId, clientData)
  return true
}

// Validar dados do carrinho
function validateCartData(cartData: any): boolean {
  if (!cartData || typeof cartData !== 'object') return false
  
  // Verificar se é um estado Zustand wrapped (com .items diretamente)
  const actualData = cartData.items ? cartData : (cartData.state || cartData)
  
  if (!Array.isArray(actualData.items)) return false
  
  // Total pode não existir se o carrinho estiver vazio, então aceitar >= 0 ou undefined
  if (actualData.total !== undefined && (typeof actualData.total !== 'number' || actualData.total < 0)) {
    return false
  }
  
  // Se não houver itens, é válido (carrinho vazio)
  if (actualData.items.length === 0) return true
  
  // Validar cada item - ser mais flexível com campos opcionais
  return actualData.items.every((item: any) => {
    // Campos obrigatórios mínimos
    const hasRequiredFields = 
      typeof item.name === 'string' &&
      typeof item.quantity === 'number' &&
      typeof item.unitPrice === 'number' &&
      item.quantity > 0 &&
      item.unitPrice >= 0
    
    // ID pode ser gerado se não existir
    const hasValidId = !item.id || typeof item.id === 'string'
    
    // ProductId pode ser derivado do id se não existir
    const hasValidProductId = !item.productId || typeof item.productId === 'string'
    
    return hasRequiredFields && hasValidId && hasValidProductId
  })
}

// Função para sincronizar carrinho com a visita no banco
async function syncCartWithVisit(sessionId: string, cartData: any, whatsapp?: string | null): Promise<void> {
  try {
    console.log(`🔄 [SYNC] Iniciando sincronização - sessionId: ${sessionId}`)
    console.log(`🔄 [SYNC] WhatsApp: ${whatsapp || 'null'}`)
    console.log(`🔄 [SYNC] CartData recebido:`, JSON.stringify({
      hasItems: cartData?.items?.length > 0,
      itemsCount: cartData?.items?.length || 0,
      total: cartData?.total || 0,
      firstItem: cartData?.items?.[0]?.name || 'N/A'
    }))
    
    const hasItems = cartData.items && cartData.items.length > 0
    
    // Preparar dados para upsert
    const upsertData = {
      hasCart: hasItems,
      cartValue: hasItems ? cartData.total : null,
      cartItems: hasItems ? cartData.items.length : null,
      cartData: hasItems ? JSON.stringify({
        items: cartData.items,
        total: cartData.total
      }) : Prisma.JsonNull,
      lastActivity: new Date(),
      whatsapp: whatsapp || undefined
    }
    
    console.log(`🔄 [SYNC] Dados preparados para upsert:`, JSON.stringify({
      hasCart: upsertData.hasCart,
      cartValue: upsertData.cartValue,
      cartItems: upsertData.cartItems,
      cartDataExists: !!upsertData.cartData,
      whatsapp: upsertData.whatsapp
    }))
    
    const result = await prisma.visit.upsert({
      where: { sessionId },
      update: upsertData,
      create: {
        sessionId,
        ...upsertData,
        startTime: new Date()
      }
    })
    
    console.log(`✅ [SYNC] Carrinho sincronizado com sucesso - sessionId: ${sessionId}`)
    console.log(`✅ [SYNC] Resultado do upsert:`, JSON.stringify({
      id: result.id,
      hasCart: result.hasCart,
      cartValue: result.cartValue,
      cartItems: result.cartItems,
      cartDataExists: !!result.cartData,
      whatsapp: result.whatsapp
    }))
    
  } catch (error) {
    console.error(`❌ [SYNC ERROR] Erro ao sincronizar carrinho - sessionId: ${sessionId}`)
    console.error(`❌ [SYNC ERROR] Detalhes do erro:`, error)
    console.error(`❌ [SYNC ERROR] Stack trace:`, error instanceof Error ? error.stack : 'N/A')
    // Não falhar a operação por erro na sincronização
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      sessionId,
      whatsapp,
      cartData: rawCartData,
      analyticsData,
      lastActivity
    } = body

    if (!sessionId || !rawCartData) {
      return NextResponse.json(
        { error: 'sessionId e cartData são obrigatórios' },
        { status: 400 }
      )
    }

    // Rate limiting
    if (!checkRateLimit(sessionId)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em alguns segundos.' },
        { status: 429 }
      )
    }

    // Validar dados do carrinho
    if (!validateCartData(rawCartData)) {
      console.error('❌ Dados do carrinho inválidos:', JSON.stringify(rawCartData, null, 2))
      return NextResponse.json(
        { error: 'Dados do carrinho inválidos' },
        { status: 400 }
      )
    }

    // Normalizar dados do carrinho (desembrulhar se vier do Zustand)
    const cartData = rawCartData.items ? rawCartData : (rawCartData.state || rawCartData)
    
    // Garantir que todos os itens tenham productId
    if (cartData.items) {
      cartData.items = cartData.items.map((item: any) => ({
        ...item,
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: item.productId || item.id || 'unknown'
      }))
    }
    
    // Calcular total se não existir
    if (cartData.total === undefined && cartData.items && cartData.items.length > 0) {
      cartData.total = cartData.items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unitPrice), 0
      )
    }

    // Carregar carrinhos existentes
    const carts = loadCarts()
    
    // Verificar se carrinho tem itens
    const hasItems = cartData.items && cartData.items.length > 0
    
    if (!hasItems) {
      // Remover carrinho se vazio
      const filteredCarts = carts.filter(cart => cart.sessionId !== sessionId)
      saveCarts(filteredCarts)
      
      // Sincronizar carrinho vazio com visita
      await syncCartWithVisit(sessionId, cartData, whatsapp)
      
      return NextResponse.json({ 
        message: 'Carrinho vazio removido',
        removed: true 
      })
    }

    // Buscar carrinho existente
    const existingIndex = carts.findIndex(cart => cart.sessionId === sessionId)
    
    const cartRecord = {
      id: existingIndex >= 0 ? carts[existingIndex].id : `cart_${Date.now()}`,
      sessionId,
      whatsapp: whatsapp || null,
      cartData,
      analyticsData: analyticsData || null,
      lastActivity: new Date(lastActivity || Date.now()).toISOString(),
      webhookSent: false,
      webhookSentAt: null,
      createdAt: existingIndex >= 0 ? carts[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      // Atualizar existente
      carts[existingIndex] = { ...carts[existingIndex], ...cartRecord }
    } else {
      // Criar novo
      carts.push(cartRecord)
    }

    // Salvar de volta
    saveCarts(carts)
    
    // Sincronizar carrinho com visita no banco
    await syncCartWithVisit(sessionId, cartData, whatsapp)

    console.log(`🛒 Server: Carrinho salvo para sessionId: ${sessionId}`)
    console.log(`🛒 Server: ${cartData.items.length} itens, total: R$ ${cartData.total.toFixed(2)}, lastActivity: ${new Date(lastActivity || Date.now()).toLocaleTimeString()}`)
    console.log(`🛒 Server: Método: ${existingIndex >= 0 ? 'UPDATE' : 'CREATE'}, WhatsApp: ${whatsapp ? 'Sim' : 'Não'}`)

    return NextResponse.json({
      message: 'Carrinho salvo no servidor (arquivo)',
      id: cartRecord.id,
      saved: true,
      method: 'file-storage'
    })

  } catch (error) {
    console.error('❌ Erro ao salvar carrinho no servidor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId é obrigatório' },
        { status: 400 }
      )
    }

    const carts = loadCarts()
    const cart = carts.find(cart => cart.sessionId === sessionId)

    if (!cart) {
      return NextResponse.json({ found: false, cart: null })
    }

    return NextResponse.json({
      found: true,
      cart,
      method: 'file-storage'
    })

  } catch (error) {
    console.error('❌ Erro ao buscar carrinho:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
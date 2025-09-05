import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

// Interfaces para tipagem
interface CartItem {
  id: string
  productId: string
  name: string
  modelName?: string
  quantity: number
  unitPrice: number
}

interface CartData {
  items: CartItem[]
  total: number
}

interface AnalyticsData {
  sessionId: string
  timeOnSite: number
  categoriesVisited: Array<{
    name: string
    visits: number
    lastVisit: number
  }>
  searchTerms: Array<{
    term: string
    count: number
    lastSearch: number
  }>
  productsViewed: Array<{
    id: string
    name: string
    category: string
    visits: number
    lastView: number
  }>
  whatsappCollected: string | null
  whatsappCollectedAt: number | null
}

interface SyncCartRequest {
  sessionId: string
  whatsapp?: string
  cartData: CartData
  analyticsData: AnalyticsData
}

const CARTS_FILE = path.join(process.cwd(), 'data', 'abandoned-carts.json')

// Função para garantir que o diretório existe
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Função para salvar no arquivo JSON (fallback)
async function saveToJSONFile(data: SyncCartRequest): Promise<boolean> {
  try {
    ensureDataDirectory()
    
    let carts: any[] = []
    
    // Ler carrinhos existentes
    if (fs.existsSync(CARTS_FILE)) {
      const fileData = fs.readFileSync(CARTS_FILE, 'utf8')
      carts = JSON.parse(fileData) || []
    }
    
    // Remover carrinho existente se houver
    carts = carts.filter(cart => cart.sessionId !== data.sessionId)
    
    // Adicionar novo carrinho
    const cartEntry = {
      sessionId: data.sessionId,
      whatsapp: data.whatsapp || null,
      cartData: data.cartData,
      analyticsData: data.analyticsData,
      lastActivity: new Date().toISOString(),
      webhookSent: false,
      createdAt: new Date().toISOString(),
      contacted: false
    }
    
    carts.push(cartEntry)
    
    // Salvar de volta
    fs.writeFileSync(CARTS_FILE, JSON.stringify(carts, null, 2))
    
    console.log(`📁 [CART_SYNC] Carrinho salvo no arquivo JSON: ${data.sessionId}`)
    return true
    
  } catch (error) {
    console.error(`❌ [CART_SYNC] Erro ao salvar no arquivo JSON:`, error)
    return false
  }
}

// Função para salvar no banco de dados
async function saveToDatabase(data: SyncCartRequest): Promise<boolean> {
  try {
    console.log(`🗃️ [CART_SYNC] Salvando no banco de dados: ${data.sessionId}`)
    
    const now = new Date()
    const cartValue = data.cartData.total || 0
    const cartItems = data.cartData.items?.length || 0
    const hasCart = cartItems > 0
    
    // Dados para salvar
    const visitData = {
      sessionId: data.sessionId,
      whatsapp: data.whatsapp || null,
      startTime: now,
      lastActivity: now,
      searchTerms: JSON.stringify(data.analyticsData.searchTerms?.map(s => s.term) || []),
      categoriesVisited: JSON.stringify(data.analyticsData.categoriesVisited || []),
      productsViewed: JSON.stringify(data.analyticsData.productsViewed || []),
      status: hasCart ? 'active' : 'abandoned',
      hasCart,
      cartValue,
      cartItems,
      cartData: JSON.stringify(data.cartData),
      whatsappCollectedAt: data.analyticsData.whatsappCollectedAt ? new Date(data.analyticsData.whatsappCollectedAt) : null
    }
    
    // Upsert - inserir ou atualizar
    await prisma.visit.upsert({
      where: { sessionId: data.sessionId },
      update: {
        whatsapp: visitData.whatsapp,
        lastActivity: visitData.lastActivity,
        searchTerms: visitData.searchTerms,
        categoriesVisited: visitData.categoriesVisited,
        productsViewed: visitData.productsViewed,
        status: visitData.status,
        hasCart: visitData.hasCart,
        cartValue: visitData.cartValue,
        cartItems: visitData.cartItems,
        cartData: visitData.cartData,
        whatsappCollectedAt: visitData.whatsappCollectedAt
      },
      create: visitData
    })
    
    console.log(`✅ [CART_SYNC] Carrinho salvo no banco: ${data.sessionId} - ${cartItems} itens - R$ ${cartValue}`)
    return true
    
  } catch (error) {
    console.error(`❌ [CART_SYNC] Erro ao salvar no banco:`, error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncCartRequest = await request.json()
    
    // Validação básica
    if (!body.sessionId) {
      return NextResponse.json({
        success: false,
        error: 'SessionId é obrigatório'
      }, { status: 400 })
    }
    
    if (!body.cartData) {
      return NextResponse.json({
        success: false,
        error: 'Dados do carrinho são obrigatórios'
      }, { status: 400 })
    }
    
    console.log(`🔄 [CART_SYNC] Iniciando sincronização: ${body.sessionId}`)
    
    // Tentar salvar no banco primeiro
    const dbSuccess = await saveToDatabase(body)
    
    // Salvar no arquivo como backup/fallback
    const jsonSuccess = await saveToJSONFile(body)
    
    if (dbSuccess || jsonSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Carrinho sincronizado com sucesso',
        savedTo: {
          database: dbSuccess,
          jsonFile: jsonSuccess
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Falha ao sincronizar em todas as fontes'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ [CART_SYNC] Erro geral na sincronização:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Endpoint para verificar se um carrinho existe
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'SessionId é obrigatório'
      }, { status: 400 })
    }
    
    // Verificar no banco
    const visit = await prisma.visit.findUnique({
      where: { sessionId },
      select: {
        sessionId: true,
        hasCart: true,
        cartValue: true,
        cartItems: true,
        lastActivity: true
      }
    })
    
    if (visit) {
      return NextResponse.json({
        success: true,
        exists: true,
        source: 'database',
        cart: visit
      })
    }
    
    // Verificar no arquivo JSON
    if (fs.existsSync(CARTS_FILE)) {
      const data = fs.readFileSync(CARTS_FILE, 'utf8')
      const carts = JSON.parse(data)
      const cart = carts.find((c: any) => c.sessionId === sessionId)
      
      if (cart) {
        return NextResponse.json({
          success: true,
          exists: true,
          source: 'json',
          cart: {
            sessionId: cart.sessionId,
            hasCart: cart.cartData?.items?.length > 0,
            cartValue: cart.cartData?.total || 0,
            cartItems: cart.cartData?.items?.length || 0,
            lastActivity: cart.lastActivity
          }
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      exists: false
    })
    
  } catch (error) {
    console.error('Erro ao verificar carrinho:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
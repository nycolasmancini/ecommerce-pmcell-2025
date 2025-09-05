import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Interface para dados de tracking
interface TrackingData {
  sessionId: string
  whatsapp?: string | null
  searchTerms?: string[]
  categoriesVisited?: Array<{
    name: string
    visits: number
    lastVisit: number
  }>
  productsViewed?: Array<{
    id: string
    name: string
    category: string
    visits: number
    lastView: number
  }>
  cartData?: {
    hasCart: boolean
    cartValue?: number
    cartItems?: number
    items?: Array<{
      id: string
      productId: string
      name: string
      quantity: number
      unitPrice: number
      modelName?: string
    }>
    total?: number
  }
  status?: 'active' | 'abandoned' | 'completed'
  whatsappCollectedAt?: number | null
}

// Função para salvar visita no banco de dados
async function saveVisitToDatabase(trackingData: TrackingData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗃️ Salvando visita no banco de dados...')
    console.log('📊 Session ID:', trackingData.sessionId)
    console.log('📊 WhatsApp:', trackingData.whatsapp)
    console.log('📊 Status:', trackingData.status)
    
    // Validar dados essenciais
    if (!trackingData.sessionId || typeof trackingData.sessionId !== 'string') {
      console.error('❌ SessionId inválido:', trackingData.sessionId)
      return { success: false, error: 'SessionId é obrigatório e deve ser string' }
    }
    
    // Preparar dados com validação mais rigorosa
    const visitData = {
      sessionId: trackingData.sessionId.trim(),
      whatsapp: trackingData.whatsapp || null,
      searchTerms: JSON.stringify(Array.isArray(trackingData.searchTerms) ? trackingData.searchTerms : []),
      categoriesVisited: JSON.stringify(Array.isArray(trackingData.categoriesVisited) ? trackingData.categoriesVisited : []),
      productsViewed: JSON.stringify(Array.isArray(trackingData.productsViewed) ? trackingData.productsViewed : []),
      status: trackingData.status || 'active',
      hasCart: Boolean(trackingData.cartData?.hasCart),
      cartValue: trackingData.cartData?.cartValue || null,
      cartItems: trackingData.cartData?.cartItems || null,
      cartData: trackingData.cartData?.items && trackingData.cartData.items.length > 0 
        ? JSON.stringify({
            items: trackingData.cartData.items,
            total: trackingData.cartData.total || trackingData.cartData.cartValue || 0
          }) 
        : Prisma.JsonNull,
      lastActivity: new Date(),
      whatsappCollectedAt: trackingData.whatsappCollectedAt ? new Date(trackingData.whatsappCollectedAt) : null
    }
    
    console.log('📊 Dados preparados para salvar:', {
      sessionId: visitData.sessionId,
      hasCart: visitData.hasCart,
      cartValue: visitData.cartValue,
      cartItems: visitData.cartItems
    })
    
    // Testar conexão antes de fazer upsert
    console.log('🔌 Testando conexão com banco...')
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Conexão com banco OK')
    
    const result = await prisma.visit.upsert({
      where: {
        sessionId: visitData.sessionId
      },
      update: {
        ...visitData,
        updatedAt: new Date()
      },
      create: {
        ...visitData,
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Visita salva no banco:', result.id)
    return { success: true }
    
  } catch (error: unknown) {
    const err = error as Error
    console.error('❌ Erro detalhado ao salvar visita no banco:')
    console.error('📋 Error type:', err?.constructor?.name)
    console.error('📋 Error message:', err?.message)
    console.error('📋 Error code:', (error as any)?.code)
    console.error('📋 Error stack:', err?.stack)
    
    let errorMessage = 'Erro desconhecido ao salvar no banco'
    
    if (err?.message) {
      if (err.message.includes('connect')) {
        errorMessage = 'Erro de conexão com banco de dados'
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Timeout na conexão com banco'
      } else if (err.message.includes('constraint') || err.message.includes('unique')) {
        errorMessage = 'Violação de constraint no banco'
      } else {
        errorMessage = err.message
      }
    }
    
    return { success: false, error: errorMessage }
  }
}

export async function POST(request: NextRequest) {
  console.log('🔥 API /api/visits/track chamada!')
  
  try {
    const trackingData: TrackingData = await request.json()
    console.log('📊 Dados recebidos:', {
      sessionId: trackingData.sessionId,
      whatsapp: trackingData.whatsapp,
      status: trackingData.status,
      hasSearchTerms: !!trackingData.searchTerms?.length,
      hasCategoriesVisited: !!trackingData.categoriesVisited?.length,
      hasProductsViewed: !!trackingData.productsViewed?.length
    })
    
    if (!trackingData.sessionId) {
      return NextResponse.json({
        success: false,
        error: 'SessionId é obrigatório'
      }, { status: 400 })
    }
    
    // Salvar visita no banco de dados
    const saveResult = await saveVisitToDatabase(trackingData)
    
    if (!saveResult.success) {
      console.error('❌ Falha ao salvar no banco:', saveResult.error)
      return NextResponse.json({
        success: false,
        error: saveResult.error || 'Erro ao salvar dados de visita no banco',
        details: saveResult.error
      }, { status: 500 })
    }
    
    // Log para debug
    console.log('📊 Visit tracking updated:', {
      sessionId: trackingData.sessionId,
      whatsapp: trackingData.whatsapp,
      status: trackingData.status,
      hasCart: trackingData.cartData?.hasCart
    })
    
    return NextResponse.json({
      success: true,
      message: 'Tracking atualizado com sucesso'
    })
    
  } catch (error) {
    console.error('Erro ao processar tracking de visita:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// GET para obter dados de tracking de uma sessão específica
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
    
    const visit = await prisma.visit.findUnique({
      where: { sessionId }
    })
    
    if (!visit) {
      return NextResponse.json({
        success: false,
        error: 'Visita não encontrada'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      visit
    })
    
  } catch (error) {
    console.error('Erro ao buscar tracking de visita:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
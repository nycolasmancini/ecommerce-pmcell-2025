import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Interfaces para tipagem
interface VisitData {
  sessionId: string
  whatsapp: string | null
  startTime: Date
  endTime?: Date
  sessionDuration?: number // em segundos
  searchTerms: string[]
  categoriesVisited: Array<{
    name: string
    visits: number
    lastVisit: number
  }>
  productsViewed: Array<{
    id: string
    name: string
    category: string
    visits: number
    lastView: number
  }>
  status: 'active' | 'abandoned' | 'completed'
  hasCart: boolean
  cartValue?: number
  cartItems?: number
  lastActivity: Date
  whatsappCollectedAt?: Date
}

interface CartData {
  sessionId: string
  whatsapp: string
  cartData: {
    items: Array<{
      id: string
      productId: string
      name: string
      quantity: number
      unitPrice: number
      modelName?: string
    }>
    total: number
  }
  analyticsData: {
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
  lastActivity: number | string
  webhookSent: boolean
  createdAt: number | string
  contacted?: boolean
}

const CARTS_FILE = path.join(process.cwd(), 'data', 'abandoned-carts.json')
const VISITS_FILE = path.join(process.cwd(), 'data', 'visits-tracking.json')

// Função para garantir que o diretório existe
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Função para ler carrinhos do arquivo
function readCartsFromFile(): CartData[] {
  ensureDataDirectory()
  
  if (!fs.existsSync(CARTS_FILE)) {
    return []
  }
  
  try {
    const data = fs.readFileSync(CARTS_FILE, 'utf8')
    const carts = JSON.parse(data)
    return Array.isArray(carts) ? carts : []
  } catch (error) {
    console.error('Erro ao ler arquivo de carrinhos:', error)
    return []
  }
}

// Função para ler visitas do arquivo de tracking (fallback)
function readVisitsFromFile(): any[] {
  ensureDataDirectory()
  
  if (!fs.existsSync(VISITS_FILE)) {
    return []
  }
  
  try {
    const data = fs.readFileSync(VISITS_FILE, 'utf8')
    const visits = JSON.parse(data)
    return Array.isArray(visits) ? visits : []
  } catch (error) {
    console.error('Erro ao ler arquivo de visitas:', error)
    return []
  }
}

// Função para ler visitas do banco de dados
async function readVisitsFromDatabase(): Promise<any[]> {
  try {
    console.log('🗃️ Lendo visitas do banco de dados...')
    
    const visits = await prisma.visit.findMany({
      orderBy: {
        startTime: 'desc'
      }
    })
    
    // Converter dados do banco para formato esperado
    const formattedVisits = visits.map(visit => ({
      sessionId: visit.sessionId,
      whatsapp: visit.whatsapp,
      startTime: visit.startTime,
      lastActivity: visit.lastActivity,
      searchTerms: visit.searchTerms ? JSON.parse(visit.searchTerms) : [],
      categoriesVisited: visit.categoriesVisited ? JSON.parse(visit.categoriesVisited) : [],
      productsViewed: visit.productsViewed ? JSON.parse(visit.productsViewed) : [],
      status: visit.status,
      hasCart: visit.hasCart,
      cartValue: visit.cartValue,
      cartItems: visit.cartItems,
      whatsappCollectedAt: visit.whatsappCollectedAt,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt
    }))
    
    console.log(`🗃️ ${formattedVisits.length} visitas encontradas no banco`)
    return formattedVisits
    
  } catch (error) {
    console.error('❌ Erro ao ler visitas do banco:', error)
    return []
  }
}

// Função para converter dados de visita do arquivo de tracking
function convertTrackingToVisit(visit: any): VisitData {
  const now = Date.now()
  
  // Converter timestamps
  let startTime = visit.startTime ? new Date(visit.startTime) : new Date(visit.createdAt)
  let lastActivity = visit.lastActivity ? new Date(visit.lastActivity) : new Date(visit.updatedAt)
  
  // Calcular duração da sessão
  const sessionDuration = Math.floor((lastActivity.getTime() - startTime.getTime()) / 1000)
  
  return {
    sessionId: visit.sessionId,
    whatsapp: visit.whatsapp,
    startTime: startTime,
    endTime: visit.status !== 'active' ? lastActivity : undefined,
    sessionDuration,
    searchTerms: visit.searchTerms || [],
    categoriesVisited: visit.categoriesVisited || [],
    productsViewed: visit.productsViewed || [],
    status: visit.status || 'active',
    hasCart: visit.hasCart || false,
    cartValue: visit.cartValue || 0,
    cartItems: visit.cartItems || 0,
    lastActivity: lastActivity,
    whatsappCollectedAt: visit.whatsappCollectedAt ? new Date(visit.whatsappCollectedAt) : undefined
  }
}

// Função para converter dados do carrinho em visita
function convertCartToVisit(cart: CartData): VisitData {
  const now = Date.now()
  
  // Converter timestamps
  let createdTime = cart.createdAt
  if (typeof createdTime === 'string') {
    createdTime = new Date(createdTime).getTime()
  }
  
  let lastActivityTime = cart.lastActivity
  if (typeof lastActivityTime === 'string') {
    lastActivityTime = new Date(lastActivityTime).getTime()
  }
  
  // Calcular duração da sessão
  const sessionDuration = Math.floor((lastActivityTime - createdTime) / 1000)
  
  // Determinar status
  const timeSinceLastActivity = now - lastActivityTime
  let status: 'active' | 'abandoned' | 'completed' = 'active'
  
  if (cart.contacted) {
    status = 'completed'
  } else if (timeSinceLastActivity > 30 * 60 * 1000 || cart.webhookSent) {
    status = 'abandoned'
  }
  
  return {
    sessionId: cart.sessionId,
    whatsapp: cart.whatsapp,
    startTime: new Date(createdTime),
    endTime: status !== 'active' ? new Date(lastActivityTime) : undefined,
    sessionDuration,
    searchTerms: cart.analyticsData.searchTerms?.map(s => s.term) || [],
    categoriesVisited: cart.analyticsData.categoriesVisited || [],
    productsViewed: cart.analyticsData.productsViewed || [],
    status,
    hasCart: cart.cartData.items.length > 0,
    cartValue: cart.cartData.total,
    cartItems: cart.cartData.items.length,
    lastActivity: new Date(lastActivityTime),
    whatsappCollectedAt: cart.analyticsData.whatsappCollectedAt ? new Date(cart.analyticsData.whatsappCollectedAt) : undefined
  }
}

// Função para formatar tempo de sessão
function formatSessionTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}min`
}

// Função para determinar status do pedido baseado no carrinho
function getOrderStatus(visit: VisitData): { status: string, color: string, label: string } {
  if (visit.status === 'completed') {
    return { status: 'finalizado', color: 'green', label: 'Finalizado' }
  } else if (visit.hasCart && visit.status === 'active') {
    return { status: 'carrinho_ativo', color: 'yellow', label: 'Carrinho Ativo' }
  } else {
    return { status: 'abandonado', color: 'red', label: 'Abandonado' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const phone = searchParams.get('phone')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 30 // 30 visitas por página
    
    // Ler dados das visitas do banco (nova fonte prioritária)
    const databaseVisits = await readVisitsFromDatabase()
    const trackingVisits = readVisitsFromFile() // fallback para arquivo
    const carts = readCartsFromFile()
    
    // Converter todas as fontes em visitas
    let databaseConverted = databaseVisits.map(convertTrackingToVisit)
    let trackingConverted = trackingVisits.map(convertTrackingToVisit)
    let cartsConverted = carts.map(convertCartToVisit)
    
    // Mesclar dados - priorizar banco > arquivo > carrinhos quando sessionId duplicado
    const databaseSessionIds = new Set(databaseConverted.map(v => v.sessionId))
    const filteredTracking = trackingConverted.filter(v => !databaseSessionIds.has(v.sessionId))
    
    const allSessionIds = new Set([...databaseSessionIds, ...filteredTracking.map(v => v.sessionId)])
    const filteredCarts = cartsConverted.filter(v => !allSessionIds.has(v.sessionId))
    
    let visits = [...databaseConverted, ...filteredTracking, ...filteredCarts]
    
    // Filtrar por data se fornecido
    if (startDate) {
      const start = new Date(startDate)
      visits = visits.filter(visit => visit.startTime >= start)
    }
    
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Final do dia
      visits = visits.filter(visit => visit.startTime <= end)
    }
    
    // Filtrar por telefone se fornecido
    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '')
      visits = visits.filter(visit => {
        if (!visit.whatsapp) return false
        const visitPhone = visit.whatsapp.replace(/[\s\-\(\)\.]/g, '')
        return visitPhone.includes(cleanPhone)
      })
    }
    
    // Ordenar por data mais recente
    visits.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    
    // Calcular paginação
    const totalVisits = visits.length
    const totalPages = Math.ceil(totalVisits / limit)
    const offset = (page - 1) * limit
    const paginatedVisits = visits.slice(offset, offset + limit)
    
    // Mapear visitas para formato da API
    const formattedVisits = paginatedVisits.map(visit => {
      const orderStatus = getOrderStatus(visit)
      
      return {
        id: visit.sessionId,
        whatsapp: visit.whatsapp ? visit.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : 'Não informado',
        whatsappRaw: visit.whatsapp,
        sessionTime: formatSessionTime(visit.sessionDuration || 0),
        sessionTimeSeconds: visit.sessionDuration || 0,
        searchTerms: visit.searchTerms,
        categoriesVisited: visit.categoriesVisited.map(c => c.name),
        orderStatus: {
          status: orderStatus.status,
          label: orderStatus.label,
          color: orderStatus.color
        },
        hasCart: visit.hasCart,
        cartValue: visit.cartValue || 0,
        cartItems: visit.cartItems || 0,
        startTime: visit.startTime.toLocaleString('pt-BR'),
        lastActivity: visit.lastActivity.toLocaleString('pt-BR'),
        status: visit.status
      }
    })
    
    // Estatísticas
    const stats = {
      total: totalVisits,
      active: visits.filter(v => v.status === 'active').length,
      abandoned: visits.filter(v => v.status === 'abandoned').length,
      completed: visits.filter(v => v.status === 'completed').length,
      withCart: visits.filter(v => v.hasCart).length,
      withPhone: visits.filter(v => v.whatsapp).length
    }
    
    return NextResponse.json({
      success: true,
      visits: formattedVisits,
      pagination: {
        page,
        limit,
        total: totalVisits,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Erro ao buscar visitas:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Endpoint para obter detalhes do carrinho de uma visita específica
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'SessionId é obrigatório'
      }, { status: 400 })
    }
    
    const carts = readCartsFromFile()
    const cart = carts.find(c => c.sessionId === sessionId)
    
    if (!cart) {
      return NextResponse.json({
        success: false,
        error: 'Carrinho não encontrado'
      }, { status: 404 })
    }
    
    // Retornar detalhes do carrinho
    return NextResponse.json({
      success: true,
      cart: {
        sessionId: cart.sessionId,
        whatsapp: cart.whatsapp,
        items: cart.cartData.items.map(item => ({
          id: item.id,
          name: item.name,
          modelName: item.modelName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity
        })),
        total: cart.cartData.total,
        lastActivity: new Date(typeof cart.lastActivity === 'string' ? cart.lastActivity : cart.lastActivity).toLocaleString('pt-BR'),
        analytics: {
          timeOnSite: Math.floor((cart.analyticsData.timeOnSite || 0) / 1000),
          categoriesVisited: cart.analyticsData.categoriesVisited || [],
          searchTerms: cart.analyticsData.searchTerms || [],
          productsViewed: cart.analyticsData.productsViewed || []
        }
      }
    })
    
  } catch (error) {
    console.error('Erro ao buscar detalhes do carrinho:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
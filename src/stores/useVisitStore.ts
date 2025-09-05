import { create } from 'zustand'
import React from 'react'

export interface Visit {
  id: string
  whatsapp: string
  whatsappRaw: string | null
  sessionTime: string
  sessionTimeSeconds: number
  searchTerms: string[]
  categoriesVisited: string[]
  orderStatus: {
    status: 'finalizado' | 'carrinho_ativo' | 'abandonado'
    label: string
    color: string
  }
  hasCart: boolean
  cartValue: number
  cartItems: number
  startTime: string
  lastActivity: string
  status: 'active' | 'abandoned' | 'completed'
}

export interface VisitCart {
  sessionId: string
  whatsapp: string
  items: Array<{
    id: string
    name: string
    modelName?: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  total: number
  lastActivity: string
  analytics: {
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
  }
}

export interface VisitFilters {
  startDate: string | null
  endDate: string | null
  phone: string
  hasContact: boolean
}

export interface VisitStats {
  total: number
  active: number
  abandoned: number
  completed: number
  withCart: number
  withPhone: number
}

export interface VisitPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface VisitStore {
  // Estado
  visits: Visit[]
  stats: VisitStats
  pagination: VisitPagination
  filters: VisitFilters
  isLoading: boolean
  selectedCart: VisitCart | null
  
  // Ações
  setVisits: (visits: Visit[]) => void
  setStats: (stats: VisitStats) => void
  setPagination: (pagination: VisitPagination) => void
  setFilters: (filters: Partial<VisitFilters>) => void
  setLoading: (loading: boolean) => void
  setSelectedCart: (cart: VisitCart | null) => void
  
  // Métodos
  fetchVisits: (page?: number) => Promise<void>
  fetchCartDetails: (sessionId: string) => Promise<void>
  clearFilters: () => void
  
  // Utilitários
  getVisitById: (id: string) => Visit | undefined
  getFilteredVisitsCount: () => number
}

export const useVisitStore = create<VisitStore>((set, get) => ({
  // Estado inicial
  visits: [],
  stats: {
    total: 0,
    active: 0,
    abandoned: 0,
    completed: 0,
    withCart: 0,
    withPhone: 0
  },
  pagination: {
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  },
  filters: {
    startDate: null,
    endDate: null,
    phone: '',
    hasContact: false
  },
  isLoading: false,
  selectedCart: null,
  
  // Ações
  setVisits: (visits) => set({ visits }),
  setStats: (stats) => set({ stats }),
  setPagination: (pagination) => set({ pagination }),
  setFilters: (newFilters) => set((state) => ({ 
    filters: { ...state.filters, ...newFilters }
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setSelectedCart: (cart) => set({ selectedCart: cart }),
  
  // Método para buscar visitas
  fetchVisits: async (page = 1) => {
    const { filters } = get()
    set({ isLoading: true })
    
    try {
      const params = new URLSearchParams({
        page: page.toString()
      })
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate)
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate)
      }
      
      if (filters.phone) {
        params.append('phone', filters.phone)
      }
      
      if (filters.hasContact) {
        params.append('hasContact', 'true')
      }
      
      const response = await fetch(`/api/admin/visits?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        set({
          visits: data.visits,
          stats: data.stats,
          pagination: data.pagination
        })
      } else {
        console.error('Erro ao buscar visitas:', data.error)
      }
    } catch (error) {
      console.error('Erro na requisição de visitas:', error)
    } finally {
      set({ isLoading: false })
    }
  },
  
  // Método para buscar detalhes do carrinho
  fetchCartDetails: async (sessionId: string, retryCount = 0) => {
    const maxRetries = 2
    set({ isLoading: true })
    
    console.log(`🛒 [CART_FETCH] Iniciando busca de carrinho - sessionId: ${sessionId}, tentativa: ${retryCount + 1}/${maxRetries + 1}`)
    
    try {
      const response = await fetch('/api/admin/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      })
      
      console.log(`🛒 [CART_FETCH] Resposta HTTP: ${response.status}`)
      
      const data = await response.json()
      
      if (data.success && data.cart) {
        console.log(`✅ [CART_FETCH] Carrinho encontrado:`, {
          sessionId: data.cart.sessionId,
          itemsCount: data.cart.items?.length || 0,
          total: data.cart.total
        })
        set({ selectedCart: data.cart })
      } else {
        console.error(`❌ [CART_FETCH] Falha na busca:`, data.error)
        
        // Retry se não é erro definitivo (não 400)
        if (retryCount < maxRetries && response.status !== 400) {
          console.log(`🔄 [CART_FETCH] Tentando novamente em 1s...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return get().fetchCartDetails(sessionId, retryCount + 1)
        }
        
        set({ selectedCart: null })
      }
    } catch (error) {
      console.error(`❌ [CART_FETCH] Erro de rede:`, error)
      
      // Retry para erros de rede
      if (retryCount < maxRetries) {
        console.log(`🔄 [CART_FETCH] Retry por erro de rede em 1s...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return get().fetchCartDetails(sessionId, retryCount + 1)
      }
      
      set({ selectedCart: null })
    } finally {
      if (retryCount === 0) { // Only clear loading on final attempt
        set({ isLoading: false })
      }
    }
  },
  
  // Limpar filtros
  clearFilters: () => {
    set({
      filters: {
        startDate: null,
        endDate: null,
        phone: '',
        hasContact: false
      }
    })
    
    // Recarregar visitas sem filtros
    get().fetchVisits(1)
  },
  
  // Utilitários
  getVisitById: (id: string) => {
    return get().visits.find(visit => visit.id === id)
  },
  
  getFilteredVisitsCount: () => {
    return get().visits.length
  }
}))

// Hook customizado para facilitar o uso (note: deve ser usado em componente React)
export const useVisits = () => {
  const store = useVisitStore()
  
  // Carregar visitas na primeira renderização
  React.useEffect(() => {
    store.fetchVisits()
  }, [])
  
  return store
}

// Utilitários para formatação
export const formatPhoneNumber = (phone: string | null): string => {
  if (!phone || phone.trim() === '') return 'Não informado'
  
  // Se já tem código de país diferente de +55, manter original
  if (phone.startsWith('+') && !phone.startsWith('+55')) {
    return phone
  }
  
  // Remover caracteres não numéricos, mas preservar + inicial
  let cleanPhone = phone.replace(/[^\d+]/g, '')
  
  // Se já tem +55, remover duplicatas e manter apenas um
  if (cleanPhone.includes('+55')) {
    cleanPhone = cleanPhone.replace(/\+55/g, '')
    cleanPhone = '55' + cleanPhone
  }
  
  // Remover qualquer + restante
  cleanPhone = cleanPhone.replace(/\+/g, '')
  
  // Se começar com 55 (código do Brasil), remover para processar
  let brazilianNumber = cleanPhone
  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
    brazilianNumber = cleanPhone.substring(2)
  }
  
  // Aplicar formatação brasileira
  if (brazilianNumber.length === 11) {
    // Celular: +55 (11) 98765-4321
    return `+55 ${brazilianNumber.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}`
  } else if (brazilianNumber.length === 10) {
    // Fixo: +55 (11) 3333-4444
    return `+55 ${brazilianNumber.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')}`
  }
  
  // Se não conseguir formatar, adicionar +55 ao número limpo
  return `+55 ${brazilianNumber}`
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const formatSessionDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}min`
}
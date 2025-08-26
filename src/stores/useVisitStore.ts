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
    phone: ''
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
  fetchCartDetails: async (sessionId: string) => {
    set({ isLoading: true })
    
    try {
      const response = await fetch('/api/admin/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        set({ selectedCart: data.cart })
      } else {
        console.error('Erro ao buscar detalhes do carrinho:', data.error)
        set({ selectedCart: null })
      }
    } catch (error) {
      console.error('Erro na requisição de detalhes do carrinho:', error)
      set({ selectedCart: null })
    } finally {
      set({ isLoading: false })
    }
  },
  
  // Limpar filtros
  clearFilters: () => {
    set({
      filters: {
        startDate: null,
        endDate: null,
        phone: ''
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
  if (!phone) return 'Não informado'
  
  // Remover caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Aplicar formatação brasileira
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
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
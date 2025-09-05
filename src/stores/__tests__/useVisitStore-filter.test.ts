import { renderHook, act } from '@testing-library/react'
import { useVisitStore } from '../useVisitStore'

// Mock fetch
global.fetch = jest.fn()

describe('useVisitStore - Contact Filter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the store state
    useVisitStore.setState({
      visits: [],
      stats: { total: 0, active: 0, abandoned: 0, completed: 0, withCart: 0, withPhone: 0 },
      pagination: { page: 1, limit: 30, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      filters: { startDate: null, endDate: null, phone: '', hasContact: false },
      isLoading: false,
      selectedCart: null
    })
  })

  it('deve adicionar filtro hasContact à interface de filtros', () => {
    const { result } = renderHook(() => useVisitStore())
    
    act(() => {
      result.current.setFilters({ hasContact: true })
    })
    
    expect(result.current.filters.hasContact).toBe(true)
  })

  it('deve fazer requisição com parâmetro hasContact quando filtro estiver ativo', async () => {
    const mockResponse = {
      success: true,
      visits: [],
      pagination: { page: 1, limit: 30, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      stats: { total: 0, active: 0, abandoned: 0, completed: 0, withCart: 0, withPhone: 0 }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    })
    
    const { result } = renderHook(() => useVisitStore())
    
    act(() => {
      result.current.setFilters({ hasContact: true })
    })
    
    await act(async () => {
      await result.current.fetchVisits()
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('hasContact=true')
    )
  })

  it('deve não incluir parâmetro hasContact quando filtro estiver inativo', async () => {
    const mockResponse = {
      success: true,
      visits: [],
      pagination: { page: 1, limit: 30, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      stats: { total: 0, active: 0, abandoned: 0, completed: 0, withCart: 0, withPhone: 0 }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    })
    
    const { result } = renderHook(() => useVisitStore())
    
    // hasContact permanece false por padrão
    await act(async () => {
      await result.current.fetchVisits()
    })
    
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(fetchCall).not.toContain('hasContact=true')
  })

  it('deve combinar filtro hasContact com outros filtros', async () => {
    const mockResponse = {
      success: true,
      visits: [],
      pagination: { page: 1, limit: 30, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      stats: { total: 0, active: 0, abandoned: 0, completed: 0, withCart: 0, withPhone: 0 }
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    })
    
    const { result } = renderHook(() => useVisitStore())
    
    act(() => {
      result.current.setFilters({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        phone: '11987654321',
        hasContact: true
      })
    })
    
    await act(async () => {
      await result.current.fetchVisits()
    })
    
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(fetchCall).toContain('startDate=2024-01-01')
    expect(fetchCall).toContain('endDate=2024-01-31')
    expect(fetchCall).toContain('phone=11987654321')
    expect(fetchCall).toContain('hasContact=true')
  })

  it('deve limpar filtro hasContact ao executar clearFilters', () => {
    const { result } = renderHook(() => useVisitStore())
    
    act(() => {
      result.current.setFilters({ hasContact: true })
    })
    
    expect(result.current.filters.hasContact).toBe(true)
    
    act(() => {
      result.current.clearFilters()
    })
    
    expect(result.current.filters.hasContact).toBe(false)
  })

  it('deve detectar filtros ativos quando hasContact estiver true', () => {
    const { result } = renderHook(() => useVisitStore())
    
    act(() => {
      result.current.setFilters({ hasContact: true })
    })
    
    // Verificar se o filtro é considerado ativo
    const hasActiveFilters = !!(result.current.filters.startDate || 
                                result.current.filters.endDate || 
                                result.current.filters.phone || 
                                result.current.filters.hasContact)
    
    expect(hasActiveFilters).toBe(true)
  })

  it('deve manter outros filtros quando definir hasContact', () => {
    const { result } = renderHook(() => useVisitStore())
    
    act(() => {
      result.current.setFilters({
        startDate: '2024-01-01',
        phone: '11987654321'
      })
    })
    
    act(() => {
      result.current.setFilters({ hasContact: true })
    })
    
    expect(result.current.filters.startDate).toBe('2024-01-01')
    expect(result.current.filters.phone).toBe('11987654321')
    expect(result.current.filters.hasContact).toBe(true)
  })
})
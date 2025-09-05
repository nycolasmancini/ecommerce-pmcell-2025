import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VisitasPage from '../page'

// Mock do useRouter
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock do useVisitStore
const mockFetchVisits = vi.fn()
const mockFetchCartDetails = vi.fn()
const mockSetSelectedCart = vi.fn()
const mockClearFilters = vi.fn()
const mockSetFilters = vi.fn()

const mockStoreReturn = {
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
  setFilters: mockSetFilters,
  fetchVisits: mockFetchVisits,
  fetchCartDetails: mockFetchCartDetails,
  setSelectedCart: mockSetSelectedCart,
  clearFilters: mockClearFilters
}

vi.mock('@/stores/useVisitStore', () => ({
  useVisitStore: () => mockStoreReturn,
  formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
  formatPhoneNumber: (phone: string) => phone
}))

// Mock dos componentes de UI
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@/components/admin/visits/DateRangePicker', () => ({
  __esModule: true,
  default: () => <div data-testid="date-range-picker">Date Range Picker</div>
}))

vi.mock('@/components/admin/visits/PhoneSearchInput', () => ({
  __esModule: true,
  default: () => <div data-testid="phone-search-input">Phone Search Input</div>
}))

vi.mock('@/components/admin/visits/CartDetailsModal', () => ({
  __esModule: true,
  default: () => <div data-testid="cart-details-modal">Cart Details Modal</div>
}))

describe('VisitasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Inicialização e Carregamento', () => {
    it('deve chamar fetchVisits apenas uma vez na entrada do módulo', async () => {
      render(<VisitasPage />)
      
      // Aguarda a execução do useEffect
      await waitFor(() => {
        expect(mockFetchVisits).toHaveBeenCalledTimes(1)
        expect(mockFetchVisits).toHaveBeenCalledWith()
      })
    })

    it('não deve configurar intervalos automáticos', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      
      render(<VisitasPage />)
      
      // Aguarda qualquer useEffect ser executado
      await waitFor(() => {
        expect(mockFetchVisits).toHaveBeenCalledTimes(1)
      })
      
      // Verifica que setInterval não foi chamado (não há auto-refresh)
      expect(setIntervalSpy).not.toHaveBeenCalled()
      
      setIntervalSpy.mockRestore()
    })

    it('não deve ter botão de auto-refresh', () => {
      render(<VisitasPage />)
      
      // Verifica que não existe botão de auto-refresh
      expect(screen.queryByText(/auto-refresh/i)).not.toBeInTheDocument()
    })
  })

  describe('Atualização Manual', () => {
    it('deve ter botão de atualização manual funcional', async () => {
      const user = userEvent.setup()
      render(<VisitasPage />)
      
      // Limpa as chamadas iniciais
      mockFetchVisits.mockClear()
      
      // Encontra e clica no botão de atualização
      const refreshButton = screen.getByRole('button', { name: /atualizar/i })
      await user.click(refreshButton)
      
      // Verifica que fetchVisits foi chamado
      expect(mockFetchVisits).toHaveBeenCalledTimes(1)
    })

    it('deve atualizar timestamp ao clicar em atualizar', async () => {
      const user = userEvent.setup()
      
      // Mock da data
      const mockDate = new Date('2023-01-01 10:30:00')
      vi.setSystemTime(mockDate)
      
      render(<VisitasPage />)
      
      // Verifica timestamp inicial
      expect(screen.getByText(/última atualização: 10:30:00/i)).toBeInTheDocument()
      
      // Avança o tempo e clica em atualizar
      const newDate = new Date('2023-01-01 10:31:00')
      vi.setSystemTime(newDate)
      
      mockFetchVisits.mockClear()
      const refreshButton = screen.getByRole('button', { name: /atualizar/i })
      await user.click(refreshButton)
      
      // Verifica que o timestamp foi atualizado
      await waitFor(() => {
        expect(screen.getByText(/última atualização: 10:31:00/i)).toBeInTheDocument()
      })
    })
  })

  describe('Comportamento de Re-renderização', () => {
    it('não deve fazer atualizações automáticas após tempo decorrido', async () => {
      render(<VisitasPage />)
      
      // Aguarda carregamento inicial
      await waitFor(() => {
        expect(mockFetchVisits).toHaveBeenCalledTimes(1)
      })
      
      // Limpa as chamadas
      mockFetchVisits.mockClear()
      
      // Avança 30 segundos (tempo que seria do auto-refresh)
      vi.advanceTimersByTime(30000)
      
      // Aguarda um pouco mais para garantir
      vi.advanceTimersByTime(5000)
      
      // Verifica que não houve novas chamadas
      expect(mockFetchVisits).not.toHaveBeenCalled()
    })

    it('não deve fazer atualizações automáticas após 1 minuto', async () => {
      render(<VisitasPage />)
      
      // Aguarda carregamento inicial
      await waitFor(() => {
        expect(mockFetchVisits).toHaveBeenCalledTimes(1)
      })
      
      // Limpa as chamadas
      mockFetchVisits.mockClear()
      
      // Avança 1 minuto
      vi.advanceTimersByTime(60000)
      
      // Verifica que não houve novas chamadas
      expect(mockFetchVisits).not.toHaveBeenCalled()
    })
  })

  describe('Funcionalidades Existentes Mantidas', () => {
    it('deve manter funcionalidade de filtros', async () => {
      const user = userEvent.setup()
      render(<VisitasPage />)
      
      // Clica no botão de filtros
      const filtersButton = screen.getByRole('button', { name: /filtros/i })
      await user.click(filtersButton)
      
      // Verifica que os componentes de filtro são exibidos
      expect(screen.getByTestId('date-range-picker')).toBeInTheDocument()
      expect(screen.getByTestId('phone-search-input')).toBeInTheDocument()
    })

    it('deve manter funcionalidade de paginação', () => {
      // Mock com múltiplas páginas
      const mockStoreWithPagination = {
        ...mockStoreReturn,
        pagination: {
          ...mockStoreReturn.pagination,
          totalPages: 3,
          hasNext: true,
          hasPrev: false
        }
      }
      
      vi.mocked(require('@/stores/useVisitStore').useVisitStore).mockReturnValue(mockStoreWithPagination)
      
      render(<VisitasPage />)
      
      // Verifica que os controles de paginação existem
      expect(screen.getByText(/página 1 de 3/i)).toBeInTheDocument()
    })

    it('deve manter funcionalidade de voltar para dashboard', async () => {
      const user = userEvent.setup()
      render(<VisitasPage />)
      
      // Clica no botão voltar
      const backButton = screen.getByRole('button', { name: /voltar/i })
      await user.click(backButton)
      
      // Verifica que a navegação foi chamada
      expect(mockPush).toHaveBeenCalledWith('/admin/dashboard')
    })
  })
})
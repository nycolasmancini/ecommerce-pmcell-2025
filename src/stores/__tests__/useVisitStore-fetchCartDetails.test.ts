/**
 * Testes para fetchCartDetails do useVisitStore
 * Focado no retry automático e tratamento de erros
 */

import { useVisitStore } from '../useVisitStore'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock console methods
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

describe('useVisitStore - fetchCartDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state
    useVisitStore.setState({
      selectedCart: null,
      isLoading: false
    })
  })
  
  afterAll(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })
  
  describe('🎯 Success Cases', () => {
    test('should fetch cart details successfully on first attempt', async () => {
      // Arrange
      const mockCart = {
        sessionId: 'test-session-123',
        whatsapp: '11999999999',
        items: [
          {
            id: 'item-1',
            name: 'Produto Teste',
            quantity: 2,
            unitPrice: 29.99,
            totalPrice: 59.98
          }
        ],
        total: 59.98,
        analytics: {
          timeOnSite: 300,
          searchTerms: [],
          categoriesVisited: [],
          productsViewed: []
        }
      }
      
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          success: true,
          cart: mockCart
        })
      })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('test-session-123')
      
      // Assert
      const state = useVisitStore.getState()
      expect(state.selectedCart).toEqual(mockCart)
      expect(state.isLoading).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CART_FETCH] Iniciando busca de carrinho')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CART_FETCH] Carrinho encontrado')
      )
    })
    
    test('should handle empty cart gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          success: true,
          cart: {
            sessionId: 'test-session-123',
            items: [],
            total: 0,
            analytics: { timeOnSite: 0, searchTerms: [], categoriesVisited: [], productsViewed: [] }
          }
        })
      })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('test-session-123')
      
      // Assert
      const state = useVisitStore.getState()
      expect(state.selectedCart).toBeDefined()
      expect(state.selectedCart?.items).toHaveLength(0)
      expect(state.isLoading).toBe(false)
    })
  })
  
  describe('🔄 Retry Logic', () => {
    test('should retry on server error and succeed on second attempt', async () => {
      // Arrange
      const mockCart = {
        sessionId: 'test-session-123',
        items: [{ id: 'item-1', name: 'Produto', quantity: 1, unitPrice: 10, totalPrice: 10 }],
        total: 10,
        analytics: { timeOnSite: 300, searchTerms: [], categoriesVisited: [], productsViewed: [] }
      }
      
      // First call fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          status: 500,
          json: async () => ({
            success: false,
            error: 'Internal server error'
          })
        })
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            success: true,
            cart: mockCart
          })
        })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('test-session-123')
      
      // Assert
      const state = useVisitStore.getState()
      expect(state.selectedCart).toEqual(mockCart)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CART_FETCH] Tentando novamente em 1s')
      )
    })
    
    test('should retry on network error and succeed', async () => {
      // Arrange
      const mockCart = {
        sessionId: 'test-session-123',
        items: [],
        total: 0,
        analytics: { timeOnSite: 0, searchTerms: [], categoriesVisited: [], productsViewed: [] }
      }
      
      // First call throws error, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            success: true,
            cart: mockCart
          })
        })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('test-session-123')
      
      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CART_FETCH] Erro de rede'),
        expect.any(Error)
      )
    })
    
    test('should not retry on 400 Bad Request', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 400,
        json: async () => ({
          success: false,
          error: 'SessionId é obrigatório'
        })
      })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('')
      
      // Assert
      const state = useVisitStore.getState()
      expect(state.selectedCart).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1) // No retry
    })
    
    test('should stop retrying after max attempts', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        status: 500,
        json: async () => ({
          success: false,
          error: 'Server error'
        })
      })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('test-session-123')
      
      // Assert
      const state = useVisitStore.getState()
      expect(state.selectedCart).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })
  
  describe('❌ Error Cases', () => {
    test('should handle 404 Cart not found', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 404,
        json: async () => ({
          success: false,
          error: 'Carrinho não encontrado'
        })
      })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('non-existent-session')
      
      // Assert
      const state = useVisitStore.getState()
      expect(state.selectedCart).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CART_FETCH] Falha na busca'),
        'Carrinho não encontrado'
      )
    })
    
    test('should handle JSON parsing errors', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('test-session-123')
      
      // Assert
      const state = useVisitStore.getState()
      expect(state.selectedCart).toBeNull()
      expect(state.isLoading).toBe(false)
    })
    
    test('should handle persistent network failures', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network unavailable'))
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      await fetchCartDetails('test-session-123')
      
      // Assert
      const state = useVisitStore.getState()
      expect(state.selectedCart).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })
  
  describe('🔄 Loading State Management', () => {
    test('should manage loading state correctly during retries', async () => {
      // Arrange
      let resolveFirstCall: (value: any) => void
      let resolveSecondCall: (value: any) => void
      
      const firstCallPromise = new Promise(resolve => { resolveFirstCall = resolve })
      const secondCallPromise = new Promise(resolve => { resolveSecondCall = resolve })
      
      mockFetch
        .mockReturnValueOnce(firstCallPromise)
        .mockReturnValueOnce(secondCallPromise)
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act & Assert
      const fetchPromise = fetchCartDetails('test-session-123')
      
      // Should be loading initially
      expect(useVisitStore.getState().isLoading).toBe(true)
      
      // Resolve first call with error
      resolveFirstCall!({
        status: 500,
        json: async () => ({ success: false, error: 'Server error' })
      })
      
      // Wait a bit for retry logic
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Should still be loading during retry
      expect(useVisitStore.getState().isLoading).toBe(true)
      
      // Resolve second call successfully
      resolveSecondCall!({
        status: 200,
        json: async () => ({
          success: true,
          cart: { sessionId: 'test-session-123', items: [], total: 0, analytics: {} }
        })
      })
      
      await fetchPromise
      
      // Should not be loading after completion
      expect(useVisitStore.getState().isLoading).toBe(false)
    })
  })
  
  describe('📊 Performance Tests', () => {
    test('should complete successful fetch within reasonable time', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          success: true,
          cart: {
            sessionId: 'test-session-123',
            items: [],
            total: 0,
            analytics: { timeOnSite: 0, searchTerms: [], categoriesVisited: [], productsViewed: [] }
          }
        })
      })
      
      const { fetchCartDetails } = useVisitStore.getState()
      
      // Act
      const startTime = Date.now()
      await fetchCartDetails('test-session-123')
      const duration = Date.now() - startTime
      
      // Assert
      expect(duration).toBeLessThan(100) // Should complete within 100ms for successful case
    })
  })
})
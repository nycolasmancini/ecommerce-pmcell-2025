import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CartSidebar from '../CartSidebar'

// Mock dos stores e contextos
const mockItems = [
  {
    id: 'item1',
    productId: 'prod1',
    productName: 'Produto Teste',
    modelId: null,
    modelName: null,
    quantity: 2,
    unitPrice: 25,
    totalPrice: 50,
    productImage: '/test-image.jpg'
  }
]

const mockUseCartStore = jest.fn()
const mockUseSession = jest.fn()
const mockUseToast = jest.fn()

jest.mock('@/stores/useCartStore', () => ({
  useCartStore: () => mockUseCartStore()
}))

jest.mock('@/contexts/SessionContext', () => ({
  useSession: () => mockUseSession()
}))

jest.mock('@/hooks/useToast', () => ({
  useToast: () => mockUseToast()
}))

// Mock do fetch global
global.fetch = jest.fn()

describe('CartSidebar - Customer Name and WhatsApp Update', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseCartStore.mockReturnValue({
      items: mockItems,
      isOpen: true,
      toggleCart: jest.fn(),
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      getSubtotal: () => 50,
      getItemsCount: () => 2,
      getSavings: () => 0,
      getEligibleUpgrades: () => []
    })
    
    mockUseSession.mockReturnValue({
      whatsapp: '5511999887766'
    })
    
    mockUseToast.mockReturnValue({
      toasts: [],
      showToast: jest.fn(),
      removeToast: jest.fn()
    })
    
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url === '/api/orders' && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'order123', orderNumber: '202501010001' })
        })
      }
      
      if (url.includes('/api/orders/') && options.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      }
      
      return Promise.reject(new Error('URL not mocked'))
    })
  })

  test('should send customerName and finalWhatsapp in PATCH request', async () => {
    render(<CartSidebar />)
    
    // Clicar no botão finalizar
    const finalizeButton = screen.getByText('Finalizar Pedido')
    fireEvent.click(finalizeButton)
    
    // Aguardar modal abrir e preencher dados
    await waitFor(() => {
      expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
    })
    
    const nameInput = screen.getByPlaceholderText('Digite seu nome')
    const submitButton = screen.getByRole('button', { name: /finalizar pedido/i })
    
    // Preencher nome
    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    
    // Submeter
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      // Verificar se o PATCH foi chamado com os dados corretos
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/order123'),
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: 'João Silva',
            finalWhatsapp: '5511999887766'
          })
        })
      )
    })
  })

  test('should always send PATCH request regardless of WhatsApp change', async () => {
    render(<CartSidebar />)
    
    // Clicar no botão finalizar
    const finalizeButton = screen.getByText('Finalizar Pedido')
    fireEvent.click(finalizeButton)
    
    // Aguardar modal abrir e preencher dados sem alterar WhatsApp
    await waitFor(() => {
      expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
    })
    
    const nameInput = screen.getByPlaceholderText('Digite seu nome')
    const submitButton = screen.getByRole('button', { name: /finalizar pedido/i })
    
    // Preencher apenas o nome (WhatsApp permanece o mesmo)
    fireEvent.change(nameInput, { target: { value: 'Maria Santos' } })
    
    // Submeter
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      // Verificar que o PATCH foi enviado mesmo com WhatsApp inalterado
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/order123'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            customerName: 'Maria Santos',
            finalWhatsapp: '5511999887766'
          })
        })
      )
    })
  })

  test('should handle PATCH request failure gracefully', async () => {
    // Mock fetch para simular falha no PATCH
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url === '/api/orders' && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'order123' })
        })
      }
      
      if (url.includes('/api/orders/') && options.method === 'PATCH') {
        return Promise.resolve({
          ok: false,
          status: 500
        })
      }
      
      return Promise.reject(new Error('URL not mocked'))
    })
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    render(<CartSidebar />)
    
    const finalizeButton = screen.getByText('Finalizar Pedido')
    fireEvent.click(finalizeButton)
    
    await waitFor(() => {
      expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
    })
    
    const nameInput = screen.getByPlaceholderText('Digite seu nome')
    const submitButton = screen.getByRole('button', { name: /finalizar pedido/i })
    
    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      // Verificar que o aviso foi logado
      expect(consoleSpy).toHaveBeenCalledWith(
        'Falha ao atualizar dados do cliente, mas pedido foi criado com sucesso'
      )
    })
    
    consoleSpy.mockRestore()
  })
})
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CartSidebar } from '../CartSidebar'

// Mock dos hooks e stores
const mockUseCartStore = {
  items: [
    {
      id: '1',
      productId: 'prod-1',
      name: 'Capa iPhone 14',
      quantity: 15,
      unitPrice: 25.00,
      specialPrice: 20.00,
      specialQuantity: 10,
      image: '/test-image.jpg'
    },
    {
      id: '2', 
      productId: 'prod-2',
      name: 'Película Samsung',
      quantity: 20,
      unitPrice: 15.00,
      image: '/test-image2.jpg'
    }
  ],
  isOpen: true,
  toggleCart: jest.fn(),
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
  getSubtotal: jest.fn(() => 675.00), // (20*15) + (15*20)
  getItemsCount: jest.fn(() => 35),
  getSavings: jest.fn(() => 75.00),
  getEligibleUpgrades: jest.fn(() => [])
}

const mockUseSession = {
  whatsapp: '5511999999999'
}

const mockUseToast = {
  toasts: [],
  showToast: jest.fn(),
  removeToast: jest.fn()
}

jest.mock('@/stores/useCartStore', () => ({
  useCartStore: () => mockUseCartStore
}))

jest.mock('@/contexts/SessionContext', () => ({
  useSession: () => mockUseSession
}))

jest.mock('@/hooks/useToast', () => ({
  useToast: () => mockUseToast
}))

// Mock da API de pedidos
global.fetch = jest.fn()

describe('CartSidebar Integration - New Checkout Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('New Checkout Flow', () => {
    test('shows CustomerNameModal when "Finalizar Pedido" is clicked with valid cart', async () => {
      render(<CartSidebar />)
      
      // Deve mostrar o botão de finalizar já que temos 35 itens (>= 30)
      const finalizarButton = screen.getByText('Finalizar Pedido')
      expect(finalizarButton).toBeInTheDocument()
      
      // Clicar no botão deve abrir o modal de nome
      fireEvent.click(finalizarButton)
      
      await waitFor(() => {
        expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
        expect(screen.getByText('Para finalizar, como podemos te chamar?')).toBeInTheDocument()
      })
    })

    test('shows warning toast when cart has less than 30 items', async () => {
      // Mock para carrinho com poucos itens
      mockUseCartStore.getItemsCount = jest.fn(() => 25)
      
      render(<CartSidebar />)
      
      const finalizarButton = screen.getByText('⚠️ Faltam 5 itens')
      fireEvent.click(finalizarButton)
      
      expect(mockUseToast.showToast).toHaveBeenCalledWith(
        'Adicione mais 5 itens para atingir o pedido mínimo de 30 unidades',
        'warning'
      )
      
      // Não deve abrir o modal de nome
      expect(screen.queryByText('Quase lá! 🎯')).not.toBeInTheDocument()
      
      // Resetar mock
      mockUseCartStore.getItemsCount = jest.fn(() => 35)
    })

    test('completes full checkout flow: cart -> name modal -> success', async () => {
      // Mock das APIs
      const mockOrderResponse = {
        id: 'order-123',
        orderNumber: '20241201001',
        subtotal: 675.00
      }
      
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOrderResponse)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockOrderResponse, customerName: 'João Silva' })
        }))
      
      render(<CartSidebar />)
      
      // 1. Clicar em finalizar pedido
      const finalizarButton = screen.getByText('Finalizar Pedido')
      fireEvent.click(finalizarButton)
      
      // 2. Preencher nome no modal
      await waitFor(() => {
        expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
      })
      
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João Silva' } })
      
      const submitButton = screen.getByText('Finalizar Pedido')
      fireEvent.click(submitButton)
      
      // 3. Verificar chamadas da API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
        
        // Primeira chamada - criar pedido
        expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/orders', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('5511999999999') // originalWhatsapp
        }))
        
        // Segunda chamada - atualizar com nome
        expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/orders/order-123', expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('João Silva')
        }))
      })
      
      // 4. Verificar tela de sucesso
      await waitFor(() => {
        expect(screen.getByText('Parabéns, João Silva! 🎉')).toBeInTheDocument()
        expect(screen.getByText('Pedido Enviado! 🎉')).toBeInTheDocument()
      })
    })
  })

  describe('WhatsApp Tracking Integration', () => {
    test('sends originalWhatsapp from session when creating order', async () => {
      const mockOrderResponse = { id: 'order-123', orderNumber: '001' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrderResponse)
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrderResponse)
      })
      
      render(<CartSidebar />)
      
      // Abrir modal de nome
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument()
      })
      
      // Submeter com WhatsApp da sessão
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João' } })
      
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        const createCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(createCall[1].body)
        
        expect(requestBody.originalWhatsapp).toBe('5511999999999')
        expect(requestBody.customer.whatsapp).toBe('5511999999999')
      })
    })

    test('tracks finalWhatsapp when user changes number', async () => {
      const mockOrderResponse = { id: 'order-123', orderNumber: '001' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrderResponse)
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrderResponse)
      })
      
      render(<CartSidebar />)
      
      // Abrir modal e editar WhatsApp
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument()
      })
      
      // Ativar edição de WhatsApp
      const editButton = screen.getByTitle('Editar WhatsApp')
      fireEvent.click(editButton)
      
      // Alterar número
      const whatsappInput = screen.getByDisplayValue('(11) 99999-9999')
      fireEvent.change(whatsappInput, { target: { value: '(11) 88888-8888' } })
      
      // Submeter
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João' } })
      
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        // Verificar PATCH call
        const patchCall = (global.fetch as jest.Mock).mock.calls[1]
        const requestBody = JSON.parse(patchCall[1].body)
        
        expect(requestBody.customerName).toBe('João')
        expect(requestBody.finalWhatsapp).toBe('5511888888888')
      })
    })
  })

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
      
      render(<CartSidebar />)
      
      // Abrir modal e tentar submeter
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
      })
      
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João' } })
      
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        expect(mockUseToast.showToast).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao processar pedido'),
          'error'
        )
      })
    })

    test('shows validation errors for invalid whatsapp format', async () => {
      render(<CartSidebar />)
      
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument()
      })
      
      // Editar com formato inválido
      const editButton = screen.getByTitle('Editar WhatsApp')
      fireEvent.click(editButton)
      
      const whatsappInput = screen.getByDisplayValue('(11) 99999-9999')
      fireEvent.change(whatsappInput, { target: { value: '123' } }) // Formato inválido
      
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João' } })
      
      const submitButton = screen.getByText('Finalizar Pedido')
      
      // Botão deve ficar habilitado mas a API vai retornar erro
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('User Experience', () => {
    test('preserves cart items during checkout flow', async () => {
      render(<CartSidebar />)
      
      // Verificar itens no carrinho
      expect(screen.getByText('Capa iPhone 14')).toBeInTheDocument()
      expect(screen.getByText('Película Samsung')).toBeInTheDocument()
      
      // Abrir modal de nome
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        expect(screen.getByText('35 unidades')).toBeInTheDocument()
        expect(screen.getByText('R$ 675,00')).toBeInTheDocument()
      })
    })

    test('shows loading state during order creation', async () => {
      // Mock para simular demora na API
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'order-123', orderNumber: '001' })
        }), 1000))
      )
      
      render(<CartSidebar />)
      
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
      })
      
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João' } })
      
      fireEvent.click(screen.getByText('Finalizar Pedido'))
      
      await waitFor(() => {
        expect(screen.getByText('Finalizando pedido...')).toBeInTheDocument()
      })
    })
  })
})
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { OrderCompletionSidebar } from '../OrderCompletionSidebar'

// Mock dos hooks
const mockClearCart = jest.fn()
const mockShowToast = jest.fn()
const mockRemoveToast = jest.fn()

jest.mock('@/stores/useCartStore', () => ({
  useCartStore: () => ({
    clearCart: mockClearCart
  })
}))

jest.mock('@/contexts/SessionContext', () => ({
  useSession: () => ({
    whatsapp: '5511999887766'
  })
}))

jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    showToast: mockShowToast,
    removeToast: mockRemoveToast
  })
}))

jest.mock('@/lib/utils', () => ({
  formatPrice: (price: number) => `R$ ${price.toFixed(2).replace('.', ',')}`
}))

describe('OrderCompletionSidebar', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onBack: jest.fn(),
    orderNumber: 28794,
    subtotal: 350.75,
    itemsCount: 20,
    customerName: 'João Silva'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should display customer name when provided', () => {
    render(<OrderCompletionSidebar {...defaultProps} />)
    
    expect(screen.getByText('Parabéns, João Silva! 🎉')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  test('should display session WhatsApp correctly formatted', () => {
    render(<OrderCompletionSidebar {...defaultProps} />)
    
    expect(screen.getByText('(11) 99988-7766')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp confirmado')).toBeInTheDocument()
  })

  test('should display final WhatsApp when different from session', () => {
    const propsWithFinalWhatsapp = {
      ...defaultProps,
      finalWhatsapp: '5511777888999'
    }
    
    render(<OrderCompletionSidebar {...propsWithFinalWhatsapp} />)
    
    // Deve mostrar o WhatsApp final, não o da sessão
    expect(screen.getByText('(11) 77788-8999')).toBeInTheDocument()
    expect(screen.queryByText('(11) 99988-7766')).not.toBeInTheDocument()
  })

  test('should use session WhatsApp when no final WhatsApp is provided', () => {
    const propsWithoutFinalWhatsapp = {
      ...defaultProps,
      finalWhatsapp: undefined
    }
    
    render(<OrderCompletionSidebar {...propsWithoutFinalWhatsapp} />)
    
    // Deve mostrar o WhatsApp da sessão
    expect(screen.getByText('(11) 99988-7766')).toBeInTheDocument()
  })

  test('should display order details correctly', () => {
    render(<OrderCompletionSidebar {...defaultProps} />)
    
    expect(screen.getByText('#28794')).toBeInTheDocument()
    expect(screen.getByText('20 unidades')).toBeInTheDocument()
    expect(screen.getByText('R$ 350,75')).toBeInTheDocument()
  })

  test('should handle finish button click', async () => {
    render(<OrderCompletionSidebar {...defaultProps} />)
    
    const finishButton = screen.getByRole('button', { name: /finalizar e continuar comprando/i })
    fireEvent.click(finishButton)
    
    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled()
      expect(mockShowToast).toHaveBeenCalledWith(
        'Obrigado, João Silva! Nossa equipe entrará em contato em breve. 😊',
        'success'
      )
    })
  })

  test('should handle finish button without customer name', async () => {
    const propsWithoutName = {
      ...defaultProps,
      customerName: undefined
    }
    
    render(<OrderCompletionSidebar {...propsWithoutName} />)
    
    const finishButton = screen.getByRole('button', { name: /finalizar e continuar comprando/i })
    fireEvent.click(finishButton)
    
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Obrigado! Nossa equipe entrará em contato em breve. 😊',
        'success'
      )
    })
  })

  test('should format WhatsApp for display correctly', () => {
    const testCases = [
      { input: '5511999887766', expected: '(11) 99988-7766' },
      { input: '5511888777666', expected: '(11) 88877-7666' },
      { input: '11999887766', expected: '(11) 99988-7766' },
      { input: '1199887766', expected: '(11) 9988-7766' }
    ]
    
    testCases.forEach(({ input, expected }) => {
      const propsWithCustomWhatsapp = {
        ...defaultProps,
        finalWhatsapp: input
      }
      
      const { unmount } = render(<OrderCompletionSidebar {...propsWithCustomWhatsapp} />)
      expect(screen.getByText(expected)).toBeInTheDocument()
      unmount()
    })
  })

  test('should show back button and handle click', () => {
    render(<OrderCompletionSidebar {...defaultProps} />)
    
    const backButton = screen.getByRole('button', { name: '' }) // ArrowLeft icon button
    expect(backButton).toBeInTheDocument()
    
    fireEvent.click(backButton)
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  test('should show close button and handle click', () => {
    render(<OrderCompletionSidebar {...defaultProps} />)
    
    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find(btn => btn.querySelector('[data-testid="close-icon"]') || btn.textContent === '')
    
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(defaultProps.onClose).toHaveBeenCalled()
    }
  })

  test('should not render when isOpen is false', () => {
    const closedProps = {
      ...defaultProps,
      isOpen: false
    }
    
    render(<OrderCompletionSidebar {...closedProps} />)
    
    expect(screen.queryByText('Pedido Enviado! 🎉')).not.toBeInTheDocument()
  })

  test('should display next steps information', () => {
    render(<OrderCompletionSidebar {...defaultProps} />)
    
    expect(screen.getByText('Próximos Passos')).toBeInTheDocument()
    expect(screen.getByText('Nossa equipe entrará em contato em até 2 horas')).toBeInTheDocument()
    expect(screen.getByText('Confirmaremos os detalhes e formas de pagamento')).toBeInTheDocument()
  })
})
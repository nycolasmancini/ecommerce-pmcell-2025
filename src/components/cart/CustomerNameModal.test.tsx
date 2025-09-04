import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CustomerNameModal from './CustomerNameModal'

// Mock do useSession
const mockUseSession = {
  whatsapp: '5511999999999'
}

jest.mock('@/contexts/SessionContext', () => ({
  useSession: () => mockUseSession
}))

describe('CustomerNameModal - CartSidebar Integration', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    totalValue: 1000.50,
    itemsCount: 35
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Modal Rendering', () => {
    test('renders modal when open with correct title and subtitle', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
      expect(screen.getByText('Para finalizar, como podemos te chamar?')).toBeInTheDocument()
      expect(screen.getByText('Usaremos para um atendimento personalizado')).toBeInTheDocument()
    })

    test('does not render when isOpen is false', () => {
      render(<CustomerNameModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('Quase lá! 🎯')).not.toBeInTheDocument()
    })

    test('displays order summary correctly', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      expect(screen.getByText('35 unidades')).toBeInTheDocument()
      expect(screen.getByText('R$ 1.000,50')).toBeInTheDocument()
    })
  })

  describe('WhatsApp Handling', () => {
    test('displays session whatsapp formatted correctly', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument()
      expect(screen.getByText('✅ Usando número da sua sessão')).toBeInTheDocument()
    })

    test('allows editing whatsapp when pencil icon is clicked', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      const editButton = screen.getByTitle('Editar WhatsApp')
      fireEvent.click(editButton)
      
      const whatsappInput = screen.getByDisplayValue('(11) 99999-9999')
      expect(whatsappInput).not.toBeDisabled()
    })

    test('shows warning when whatsapp is modified', async () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      // Ativar edição
      const editButton = screen.getByTitle('Editar WhatsApp')
      fireEvent.click(editButton)
      
      // Alterar WhatsApp
      const whatsappInput = screen.getByDisplayValue('(11) 99999-9999')
      fireEvent.change(whatsappInput, { target: { value: '(11) 88888-8888' } })
      
      await waitFor(() => {
        expect(screen.getByText(/Número atualizado para contato/)).toBeInTheDocument()
        expect(screen.getByText(/Original: \(11\) 99999-9999/)).toBeInTheDocument()
      })
    })

    test('formats whatsapp input correctly with brazilian mask', async () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      // Ativar edição
      const editButton = screen.getByTitle('Editar WhatsApp')
      fireEvent.click(editButton)
      
      const whatsappInput = screen.getByDisplayValue('(11) 99999-9999')
      
      // Digitar números sem formatação
      fireEvent.change(whatsappInput, { target: { value: '11987654321' } })
      
      await waitFor(() => {
        expect(whatsappInput.value).toBe('(11) 98765-4321')
      })
    })
  })

  describe('Form Validation', () => {
    test('validates name field as required', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      const submitButton = screen.getByText('Finalizar Pedido')
      expect(submitButton).toBeDisabled()
    })

    test('enables submit when name is provided', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João Silva' } })
      
      const submitButton = screen.getByText('Finalizar Pedido')
      expect(submitButton).not.toBeDisabled()
    })

    test('limits name input to 100 characters', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      const nameInput = screen.getByPlaceholderText('Digite seu nome') as HTMLInputElement
      expect(nameInput.maxLength).toBe(100)
    })
  })

  describe('Form Submission', () => {
    test('calls onSubmit with correct data when form is submitted', async () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      // Preencher nome
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João Silva' } })
      
      // Submeter sem alterar WhatsApp
      const submitButton = screen.getByText('Finalizar Pedido')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          customerName: 'João Silva',
          originalWhatsapp: '5511999999999',
          finalWhatsapp: '5511999999999'
        })
      })
    })

    test('calls onSubmit with modified whatsapp data', async () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      // Preencher nome
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João Silva' } })
      
      // Editar WhatsApp
      const editButton = screen.getByTitle('Editar WhatsApp')
      fireEvent.click(editButton)
      
      const whatsappInput = screen.getByDisplayValue('(11) 99999-9999')
      fireEvent.change(whatsappInput, { target: { value: '(11) 88888-8888' } })
      
      // Submeter
      const submitButton = screen.getByText('Finalizar Pedido')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          customerName: 'João Silva',
          originalWhatsapp: '5511999999999',
          finalWhatsapp: '5511888888888'
        })
      })
    })

    test('shows loading state during submission', async () => {
      const slowSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)))
      render(<CustomerNameModal {...defaultProps} onSubmit={slowSubmit} />)
      
      // Preencher e submeter
      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      fireEvent.change(nameInput, { target: { value: 'João Silva' } })
      
      const submitButton = screen.getByText('Finalizar Pedido')
      fireEvent.click(submitButton)
      
      // Verificar estado de loading
      await waitFor(() => {
        expect(screen.getByText('Finalizando pedido...')).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('Modal Interaction', () => {
    test('calls onClose when close button is clicked', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: /fechar/i })
      fireEvent.click(closeButton)
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    test('calls onClose when overlay is clicked', () => {
      render(<CustomerNameModal {...defaultProps} />)
      
      const overlay = screen.getByTestId('modal-overlay')
      fireEvent.click(overlay)
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })
})
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

describe('CustomerNameModal', () => {
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

  test('renders modal when open', () => {
    render(<CustomerNameModal {...defaultProps} />)
    
    expect(screen.getByText('Quase lá! 🎯')).toBeInTheDocument()
    expect(screen.getByText('Para finalizar seu pedido, como podemos te chamar?')).toBeInTheDocument()
  })

  test('displays session whatsapp formatted', () => {
    render(<CustomerNameModal {...defaultProps} />)
    
    expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument()
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
      expect(screen.getByText(/Número atualizado/)).toBeInTheDocument()
      expect(screen.getByText(/Original: \(11\) 99999-9999/)).toBeInTheDocument()
    })
  })

  test('validates name and whatsapp before allowing submit', () => {
    render(<CustomerNameModal {...defaultProps} />)
    
    const submitButton = screen.getByText('Finalizar Pedido')
    expect(submitButton).toBeDisabled()
    
    // Preencher nome
    const nameInput = screen.getByPlaceholderText('Digite seu nome')
    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    
    expect(submitButton).not.toBeDisabled()
  })

  test('calls onSubmit with correct data', async () => {
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

  test('formats whatsapp input correctly', async () => {
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

  test('does not render when isOpen is false', () => {
    render(<CustomerNameModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Quase lá! 🎯')).not.toBeInTheDocument()
  })
})
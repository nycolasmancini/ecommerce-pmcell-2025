import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CustomerNameModal from '../CustomerNameModal'

// Mock da SessionContext
const mockUseSession = jest.fn()
jest.mock('@/contexts/SessionContext', () => ({
  useSession: () => mockUseSession()
}))

// Mock do formatPrice
jest.mock('@/lib/utils', () => ({
  formatPrice: (price: number) => `R$ ${price.toFixed(2).replace('.', ',')}`
}))

describe('CustomerNameModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    totalValue: 250.50,
    itemsCount: 15
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      whatsapp: '5511999887766'
    })
  })

  test('should display original WhatsApp from session', async () => {
    render(<CustomerNameModal {...defaultProps} />)
    
    await waitFor(() => {
      const whatsappInput = screen.getByDisplayValue('(11) 99988-7766')
      expect(whatsappInput).toBeInTheDocument()
    })
  })

  test('should format edited WhatsApp correctly', async () => {
    render(<CustomerNameModal {...defaultProps} />)
    
    // Clicar para editar WhatsApp
    const editButton = screen.getByRole('button', { name: /editar whatsapp/i })
    fireEvent.click(editButton)
    
    // Alterar para novo número
    const whatsappInput = screen.getByDisplayValue('(11) 99988-7766')
    fireEvent.change(whatsappInput, { target: { value: '11888777666' } })
    
    await waitFor(() => {
      expect(whatsappInput).toHaveValue('(11) 88877-7666')
    })
  })

  test('should convert final WhatsApp to full format on submit', async () => {
    const onSubmitMock = jest.fn()
    render(<CustomerNameModal {...defaultProps} onSubmit={onSubmitMock} />)
    
    // Preencher nome
    const nameInput = screen.getByPlaceholderText(/como podemos te chamar/i)
    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    
    // Editar WhatsApp
    const editButton = screen.getByRole('button', { name: /editar whatsapp/i })
    fireEvent.click(editButton)
    
    const whatsappInput = screen.getByDisplayValue('(11) 99988-7766')
    fireEvent.change(whatsappInput, { target: { value: '11888777666' } })
    
    // Submeter
    const submitButton = screen.getByRole('button', { name: /finalizar pedido/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith({
        customerName: 'João Silva',
        originalWhatsapp: '5511999887766',
        finalWhatsapp: '5511888777666'
      })
    })
  })

  test('should track WhatsApp changes correctly', async () => {
    render(<CustomerNameModal {...defaultProps} />)
    
    // Verificar que não há indicação de mudança inicialmente
    expect(screen.queryByText(/alterado/i)).not.toBeInTheDocument()
    
    // Editar WhatsApp
    const editButton = screen.getByRole('button', { name: /editar whatsapp/i })
    fireEvent.click(editButton)
    
    const whatsappInput = screen.getByDisplayValue('(11) 99988-7766')
    fireEvent.change(whatsappInput, { target: { value: '11777888999' } })
    
    await waitFor(() => {
      // Verificar se há indicação visual de que foi alterado
      expect(screen.getByText(/número alterado/i)).toBeInTheDocument()
    })
  })

  test('should validate form correctly', async () => {
    render(<CustomerNameModal {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /finalizar pedido/i })
    
    // Botão deve estar desabilitado sem nome
    expect(submitButton).toBeDisabled()
    
    // Preencher nome
    const nameInput = screen.getByPlaceholderText(/como podemos te chamar/i)
    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })

  test('should reset form when closed', () => {
    const { rerender } = render(<CustomerNameModal {...defaultProps} />)
    
    // Preencher dados
    const nameInput = screen.getByPlaceholderText(/como podemos te chamar/i)
    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    
    // Fechar modal
    rerender(<CustomerNameModal {...defaultProps} isOpen={false} />)
    
    // Reabrir
    rerender(<CustomerNameModal {...defaultProps} isOpen={true} />)
    
    // Verificar que foi resetado
    const newNameInput = screen.getByPlaceholderText(/como podemos te chamar/i)
    expect(newNameInput).toHaveValue('')
  })

  test('should handle WhatsApp without country code', async () => {
    mockUseSession.mockReturnValue({
      whatsapp: '11999887766' // Sem código do país
    })
    
    render(<CustomerNameModal {...defaultProps} />)
    
    await waitFor(() => {
      const whatsappInput = screen.getByDisplayValue('(11) 99988-7766')
      expect(whatsappInput).toBeInTheDocument()
    })
    
    // Ao submeter, deve adicionar código do país
    const nameInput = screen.getByPlaceholderText(/como podemos te chamar/i)
    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    
    const submitButton = screen.getByRole('button', { name: /finalizar pedido/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        customerName: 'João Silva',
        originalWhatsapp: '11999887766', // Original permanece como estava
        finalWhatsapp: '5511999887766' // Final ganha código do país
      })
    })
  })
})
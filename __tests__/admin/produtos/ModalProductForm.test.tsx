import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ModalProductForm } from '@/components/admin/ModalProductForm'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ModalProductForm', () => {
  const defaultProps = {
    categories: [
      { id: '1', name: 'Capas' },
      { id: '2', name: 'Películas' }
    ],
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Renderização do Formulário', () => {
    test('deve renderizar todos os campos obrigatórios', () => {
      render(<ModalProductForm {...defaultProps} />)
      
      expect(screen.getByLabelText(/nome do produto/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/imagens/i)).toBeInTheDocument()
      expect(screen.getByText(/modelos de celular/i)).toBeInTheDocument()
    })

    test('deve renderizar o botão de adicionar modelo', () => {
      render(<ModalProductForm {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /adicionar modelo/i })).toBeInTheDocument()
    })

    test('deve renderizar os botões de ação', () => {
      render(<ModalProductForm {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /adicionar produto modal/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })
  })

  describe('Adição Dinâmica de Modelos', () => {
    test('deve adicionar novo modelo quando clicado', async () => {
      const user = userEvent.setup()
      render(<ModalProductForm {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      await user.click(addButton)
      
      expect(screen.getByPlaceholderText(/marca do modelo/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/nome do modelo/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/valor atacado/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/valor super atacado/i)).toBeInTheDocument()
    })

    test('deve permitir adicionar múltiplos modelos', async () => {
      const user = userEvent.setup()
      render(<ModalProductForm {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      
      // Adicionar primeiro modelo
      await user.click(addButton)
      // Adicionar segundo modelo
      await user.click(addButton)
      
      const marcaInputs = screen.getAllByPlaceholderText(/marca do modelo/i)
      const modeloInputs = screen.getAllByPlaceholderText(/nome do modelo/i)
      
      expect(marcaInputs).toHaveLength(2)
      expect(modeloInputs).toHaveLength(2)
    })

    test('deve remover modelo quando clicado no botão remover', async () => {
      const user = userEvent.setup()
      render(<ModalProductForm {...defaultProps} />)
      
      // Adicionar modelo
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      await user.click(addButton)
      
      // Verificar se foi adicionado
      expect(screen.getByPlaceholderText(/marca do modelo/i)).toBeInTheDocument()
      
      // Remover modelo
      const removeButton = screen.getByRole('button', { name: /remover modelo/i })
      await user.click(removeButton)
      
      // Verificar se foi removido
      expect(screen.queryByPlaceholderText(/marca do modelo/i)).not.toBeInTheDocument()
    })
  })

  describe('Validação de Campos', () => {
    test('deve mostrar erro quando campos obrigatórios não estão preenchidos', async () => {
      const user = userEvent.setup()
      render(<ModalProductForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /adicionar produto modal/i })
      await user.click(submitButton)
      
      // Verificar se não fez a chamada da API
      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('deve validar que marca é obrigatória no modelo', async () => {
      const user = userEvent.setup()
      render(<ModalProductForm {...defaultProps} />)
      
      // Preencher campos obrigatórios
      await user.type(screen.getByLabelText(/nome do produto/i), 'Capa Test')
      await user.type(screen.getByLabelText(/descrição/i), 'Descrição test')
      await user.selectOptions(screen.getByLabelText(/categoria/i), '1')
      
      // Adicionar modelo sem marca
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      await user.click(addButton)
      
      await user.type(screen.getByPlaceholderText(/nome do modelo/i), 'iPhone 15')
      await user.type(screen.getByPlaceholderText(/valor atacado/i), '25.00')
      
      // Tentar submeter
      const submitButton = screen.getByRole('button', { name: /adicionar produto modal/i })
      await user.click(submitButton)
      
      // Não deve chamar API sem marca
      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('deve validar que preço super atacado seja menor que atacado', async () => {
      const user = userEvent.setup()
      render(<ModalProductForm {...defaultProps} />)
      
      // Adicionar modelo
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      await user.click(addButton)
      
      await user.type(screen.getByPlaceholderText(/marca do modelo/i), 'Apple')
      await user.type(screen.getByPlaceholderText(/nome do modelo/i), 'iPhone 15')
      await user.type(screen.getByPlaceholderText(/valor atacado/i), '25.00')
      await user.type(screen.getByPlaceholderText(/valor super atacado/i), '30.00')
      
      // Deve mostrar erro de validação
      expect(screen.getByText(/preço super atacado deve ser menor/i)).toBeInTheDocument()
    })
  })

  describe('Preservação de Dados', () => {
    test('deve preservar dados quando adicionar/remover modelos', async () => {
      const user = userEvent.setup()
      render(<ModalProductForm {...defaultProps} />)
      
      // Preencher dados do produto
      await user.type(screen.getByLabelText(/nome do produto/i), 'Capa Test')
      await user.type(screen.getByLabelText(/descrição/i), 'Descrição test')
      
      // Adicionar modelo
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      await user.click(addButton)
      
      // Verificar se dados do produto foram preservados
      expect(screen.getByDisplayValue('Capa Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Descrição test')).toBeInTheDocument()
    })
  })

  describe('Submissão do Formulário', () => {
    test('deve chamar API com dados corretos quando formulário válido', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, product: { id: '1' } })
      })
      
      render(<ModalProductForm {...defaultProps} />)
      
      // Preencher formulário
      await user.type(screen.getByLabelText(/nome do produto/i), 'Capa Test')
      await user.type(screen.getByLabelText(/descrição/i), 'Descrição test')
      await user.selectOptions(screen.getByLabelText(/categoria/i), '1')
      
      // Adicionar modelo
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      await user.click(addButton)
      
      await user.type(screen.getByPlaceholderText(/marca do modelo/i), 'Apple')
      await user.type(screen.getByPlaceholderText(/nome do modelo/i), 'iPhone 15')
      await user.type(screen.getByPlaceholderText(/valor atacado/i), '25.00')
      await user.type(screen.getByPlaceholderText(/valor super atacado/i), '20.00')
      
      // Mock file input
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByLabelText(/imagens/i)
      await user.upload(fileInput, file)
      
      // Submeter formulário
      const submitButton = screen.getByRole('button', { name: /adicionar produto modal/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/products/modal', {
          method: 'POST',
          body: expect.any(FormData)
        })
      })
    })

    test('deve chamar onSuccess quando API retorna sucesso', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, product: { id: '1' } })
      })
      
      render(<ModalProductForm {...defaultProps} />)
      
      // Preencher formulário básico
      await user.type(screen.getByLabelText(/nome do produto/i), 'Capa Test')
      await user.type(screen.getByLabelText(/descrição/i), 'Descrição test')
      await user.selectOptions(screen.getByLabelText(/categoria/i), '1')
      
      // Adicionar modelo
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      await user.click(addButton)
      
      await user.type(screen.getByPlaceholderText(/marca do modelo/i), 'Apple')
      await user.type(screen.getByPlaceholderText(/nome do modelo/i), 'iPhone 15')
      await user.type(screen.getByPlaceholderText(/valor atacado/i), '25.00')
      
      // Mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByLabelText(/imagens/i)
      await user.upload(fileInput, file)
      
      // Submeter
      const submitButton = screen.getByRole('button', { name: /adicionar produto modal/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled()
      })
    })

    test('deve mostrar erro quando API falha', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<ModalProductForm {...defaultProps} />)
      
      // Preencher formulário básico
      await user.type(screen.getByLabelText(/nome do produto/i), 'Capa Test')
      await user.type(screen.getByLabelText(/descrição/i), 'Descrição test')
      await user.selectOptions(screen.getByLabelText(/categoria/i), '1')
      
      // Adicionar modelo
      const addButton = screen.getByRole('button', { name: /adicionar modelo/i })
      await user.click(addButton)
      
      await user.type(screen.getByPlaceholderText(/marca do modelo/i), 'Apple')
      await user.type(screen.getByPlaceholderText(/nome do modelo/i), 'iPhone 15')
      await user.type(screen.getByPlaceholderText(/valor atacado/i), '25.00')
      
      // Mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByLabelText(/imagens/i)
      await user.upload(fileInput, file)
      
      // Submeter
      const submitButton = screen.getByRole('button', { name: /adicionar produto modal/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/erro ao criar produto/i)).toBeInTheDocument()
      })
    })
  })

  describe('Cancelamento', () => {
    test('deve chamar onCancel quando botão cancelar é clicado', async () => {
      const user = userEvent.setup()
      render(<ModalProductForm {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      await user.click(cancelButton)
      
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })
  })
})
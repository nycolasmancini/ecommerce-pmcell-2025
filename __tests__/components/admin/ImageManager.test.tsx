import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ImageManager from '@/components/admin/ImageManager'
import { mockImageData } from '../../helpers/testHelpers'

// Mock das APIs
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('ImageManager', () => {
  const mockImages = [
    {
      id: 'img-1',
      productId: 'prod-1',
      url: mockImageData.smallImage,
      fileName: 'image1.jpg',
      order: 0,
      isMain: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'img-2',
      productId: 'prod-1',
      url: mockImageData.smallImage,
      fileName: 'image2.jpg',
      order: 1,
      isMain: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'img-3',
      productId: 'prod-1',
      url: mockImageData.smallImage,
      fileName: 'image3.jpg',
      order: 2,
      isMain: false,
      createdAt: new Date().toISOString()
    }
  ]

  const defaultProps = {
    productId: 'prod-1',
    images: mockImages,
    onUpdate: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve renderizar lista de miniaturas', () => {
    render(<ImageManager {...defaultProps} />)

    // Verificar se todas as imagens são renderizadas
    expect(screen.getAllByRole('img')).toHaveLength(3)
    
    // Verificar se os nomes dos arquivos são mostrados
    expect(screen.getByText('image1.jpg')).toBeInTheDocument()
    expect(screen.getByText('image2.jpg')).toBeInTheDocument()
    expect(screen.getByText('image3.jpg')).toBeInTheDocument()
  })

  it('deve mostrar indicador de imagem principal', () => {
    render(<ImageManager {...defaultProps} />)

    // A primeira imagem deve ter o indicador de principal
    const mainIndicator = screen.getByText('Principal')
    expect(mainIndicator).toBeInTheDocument()
  })

  it('deve exibir botões de deletar e favoritar para cada imagem', () => {
    render(<ImageManager {...defaultProps} />)

    // Cada imagem deve ter um botão de deletar
    const deleteButtons = screen.getAllByLabelText(/deletar imagem/i)
    expect(deleteButtons).toHaveLength(3)

    // Cada imagem deve ter um botão de favoritar
    const favoriteButtons = screen.getAllByLabelText(/favoritar imagem/i)
    expect(favoriteButtons).toHaveLength(3)
  })

  it('deve chamar API de deletar ao clicar no botão deletar', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response)

    // Mock do window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)

    render(<ImageManager {...defaultProps} />)

    const deleteButtons = screen.getAllByLabelText(/deletar imagem/i)
    fireEvent.click(deleteButtons[1]) // Deletar segunda imagem

    expect(confirmSpy).toHaveBeenCalledWith('Tem certeza que deseja deletar esta imagem?')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/products/prod-1/images/img-2',
        { method: 'DELETE' }
      )
    })

    expect(defaultProps.onUpdate).toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('deve cancelar deleção se usuário não confirmar', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

    render(<ImageManager {...defaultProps} />)

    const deleteButtons = screen.getAllByLabelText(/deletar imagem/i)
    fireEvent.click(deleteButtons[1])

    expect(confirmSpy).toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(defaultProps.onUpdate).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('deve chamar API de favoritar ao clicar no botão favoritar', async () => {
    const updatedImage = { ...mockImages[1], isMain: true }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updatedImage)
    } as Response)

    render(<ImageManager {...defaultProps} />)

    const favoriteButtons = screen.getAllByLabelText(/favoritar imagem/i)
    fireEvent.click(favoriteButtons[1]) // Favoritar segunda imagem

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/products/prod-1/images/img-2/favorite',
        { method: 'PATCH' }
      )
    })

    expect(defaultProps.onUpdate).toHaveBeenCalled()
  })

  it('deve mostrar loading state durante deleção', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response), 100)
    }))

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)

    render(<ImageManager {...defaultProps} />)

    const deleteButtons = screen.getAllByLabelText(/deletar imagem/i)
    fireEvent.click(deleteButtons[1])

    // Verificar se aparece o loading
    expect(screen.getByText('Deletando...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Deletando...')).not.toBeInTheDocument()
    })

    confirmSpy.mockRestore()
  })

  it('deve mostrar loading state durante favoritação', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ ...mockImages[1], isMain: true })
      } as Response), 100)
    }))

    render(<ImageManager {...defaultProps} />)

    const favoriteButtons = screen.getAllByLabelText(/favoritar imagem/i)
    fireEvent.click(favoriteButtons[1])

    // Verificar se aparece o loading
    expect(screen.getByText('Favoritando...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Favoritando...')).not.toBeInTheDocument()
    })
  })

  it('deve exibir erro quando API falhar', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Erro na API' })
    } as Response)

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(<ImageManager {...defaultProps} />)

    const deleteButtons = screen.getAllByLabelText(/deletar imagem/i)
    fireEvent.click(deleteButtons[1])

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Erro na API')
    })

    confirmSpy.mockRestore()
    alertSpy.mockRestore()
  })

  it('deve renderizar mensagem quando não há imagens', () => {
    render(<ImageManager {...defaultProps} images={[]} />)

    expect(screen.getByText('Nenhuma imagem encontrada')).toBeInTheDocument()
  })

  it('deve impedir deleção da única imagem', () => {
    const singleImage = [mockImages[0]]
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(<ImageManager {...defaultProps} images={singleImage} />)

    const deleteButton = screen.getByLabelText(/deletar imagem/i)
    fireEvent.click(deleteButton)

    expect(alertSpy).toHaveBeenCalledWith('Não é possível deletar a única imagem do produto')
    expect(mockFetch).not.toHaveBeenCalled()

    alertSpy.mockRestore()
  })

  it('deve aplicar classes CSS corretas para layout responsivo', () => {
    render(<ImageManager {...defaultProps} />)

    const grid = screen.getByTestId('images-grid')
    expect(grid).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-4')
  })

  it('deve implementar lazy loading nas imagens', () => {
    render(<ImageManager {...defaultProps} />)

    const images = screen.getAllByRole('img')
    images.forEach(img => {
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })
})
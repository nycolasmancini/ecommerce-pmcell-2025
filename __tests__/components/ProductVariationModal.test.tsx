import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ProductVariationModal from '@/components/products/ProductVariationModal'

// Mock do store do carrinho
jest.mock('@/stores/useCartStore', () => ({
  useCartStore: jest.fn(() => ({
    addItem: jest.fn(),
    updateQuantity: jest.fn(),
    items: []
  }))
}))

// Mock do fetch global
global.fetch = jest.fn()

const mockProduct = {
  id: '1',
  name: 'Produto Teste',
  description: 'Descrição do produto',
  image: 'test-image.jpg',
  images: [],
  quickAddIncrement: 1,
  isModalProduct: true
}

const mockModels = [
  {
    id: 'model1',
    brandName: 'Marca A',
    modelName: 'Modelo 1',
    price: 10.99,
    superWholesalePrice: 9.99,
    specialQuantity: 10
  },
  {
    id: 'model2',
    brandName: 'Marca B', 
    modelName: 'Modelo 2',
    price: 15.99
  }
]

describe('ProductVariationModal', () => {
  beforeEach(() => {
    // Reset do mock do fetch
    ;(fetch as jest.Mock).mockClear()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockModels
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Removal of test elements', () => {
    it('should NOT render "Quantidade no carrinho" text', async () => {
      render(
        <ProductVariationModal 
          product={mockProduct}
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      // Aguardar carregamento dos modelos
      await waitFor(() => {
        expect(screen.getByText('Marca A')).toBeInTheDocument()
      })

      // Expandir marca para mostrar modelos
      const brandButton = screen.getByText('Marca A')
      brandButton.click()

      await waitFor(() => {
        expect(screen.getByText('Modelo 1')).toBeInTheDocument()
      })

      // Verificar que o texto "Quantidade no carrinho" NÃO existe
      expect(screen.queryByText(/Quantidade no carrinho/)).not.toBeInTheDocument()
    })

    it('should NOT render redundant SimpleQuantityInput inside ModelItem', async () => {
      render(
        <ProductVariationModal 
          product={mockProduct}
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      // Aguardar carregamento dos modelos
      await waitFor(() => {
        expect(screen.getByText('Marca A')).toBeInTheDocument()
      })

      // Expandir marca para mostrar modelos
      const brandButton = screen.getByText('Marca A')
      brandButton.click()

      await waitFor(() => {
        expect(screen.getByText('Modelo 1')).toBeInTheDocument()
      })

      // Deve ter apenas os controles de quantidade principais (StableQuantityInput)
      // e NÃO deve ter input redundante com placeholder "0"
      const redundantInputs = document.querySelectorAll('input[placeholder="0"]')
      expect(redundantInputs).toHaveLength(0)
    })

    it('should NOT render test-related div with "mt-2" class containing quantity text', async () => {
      render(
        <ProductVariationModal 
          product={mockProduct}
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      // Aguardar carregamento dos modelos
      await waitFor(() => {
        expect(screen.getByText('Marca A')).toBeInTheDocument()
      })

      // Expandir marca para mostrar modelos
      const brandButton = screen.getByText('Marca A')
      brandButton.click()

      await waitFor(() => {
        expect(screen.getByText('Modelo 1')).toBeInTheDocument()
      })

      // Não deve existir div com mt-2 que contém o texto de teste
      const testDiv = document.querySelector('.mt-2')
      if (testDiv) {
        expect(testDiv.textContent).not.toMatch(/Quantidade no carrinho/)
      }
    })
  })

  describe('Core functionality still works', () => {
    it('should render product name and models correctly', async () => {
      render(
        <ProductVariationModal 
          product={mockProduct}
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      // Verificar nome do produto
      expect(screen.getByText('Produto Teste')).toBeInTheDocument()

      // Aguardar carregamento dos modelos
      await waitFor(() => {
        expect(screen.getByText('Marca A')).toBeInTheDocument()
        expect(screen.getByText('Marca B')).toBeInTheDocument()
      })
    })

    it('should expand brand and show models when clicked', async () => {
      render(
        <ProductVariationModal 
          product={mockProduct}
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      // Aguardar carregamento
      await waitFor(() => {
        expect(screen.getByText('Marca A')).toBeInTheDocument()
      })

      // Expandir marca A
      const brandButton = screen.getByText('Marca A')
      brandButton.click()

      await waitFor(() => {
        expect(screen.getByText('Modelo 1')).toBeInTheDocument()
      })

      // Deve ter apenas os controles corretos (não redundantes)
      expect(screen.getByText('R$ 10,99')).toBeInTheDocument()
    })
  })
})
import { render, screen, fireEvent } from '@testing-library/react'
import { useCartStore } from '@/stores/useCartStore'
import ProductCard from '../ProductCard'
import { useSession } from '@/contexts/SessionContext'
import { useAnalytics } from '@/lib/analytics'

// Mock do contexto de sessão
jest.mock('@/contexts/SessionContext', () => ({
  useSession: jest.fn(),
}))

// Mock do analytics
jest.mock('@/lib/analytics', () => ({
  useAnalytics: jest.fn(),
}))

// Mock do store do carrinho
jest.mock('@/stores/useCartStore')

// Mock do Next.js Image component
jest.mock('next/image', () => {
  return function Image({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  }
})

const mockUseCartStore = useCartStore as jest.MockedFunction<typeof useCartStore>
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>

// Produto de teste
const mockProduct = {
  id: 'product-1',
  name: 'iPhone 15',
  subname: 'Celular Apple',
  description: 'Smartphone da Apple',
  brand: 'Apple',
  category: 'Smartphones',
  image: '/images/iphone15.jpg',
  images: [
    { id: 'img1', url: '/images/iphone15.jpg', isMain: true }
  ],
  price: 1200,
  superWholesalePrice: 1000,
  superWholesaleQuantity: 10,
  specialPrice: 1100,
  specialQuantity: 5,
  boxQuantity: 1,
  hasModels: false,
  isModalProduct: false
}

describe('ProductCard - Cart Badge', () => {
  // Setup padrão para os mocks
  beforeEach(() => {
    // Mock do contexto de sessão
    mockUseSession.mockReturnValue({
      unlocked: true
    })

    // Mock do analytics
    mockUseAnalytics.mockReturnValue({
      trackProductView: jest.fn(),
      trackCartEvent: jest.fn(),
      getSnapshot: jest.fn().mockReturnValue({
        sessionId: 'test-session',
        whatsappCollected: null
      })
    })

    // Configuração padrão do store (sem itens no carrinho)
    mockUseCartStore.mockImplementation((selector) => {
      const store = {
        items: [],
        addItem: jest.fn(),
        getItemsCount: () => 0
      }
      return selector(store)
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Badge de quantidade no carrinho', () => {
    it('não deve mostrar badge quando não há itens no carrinho', () => {
      render(<ProductCard product={mockProduct} />)
      
      // Badge não deve existir
      const badge = screen.queryByTestId('cart-quantity-badge')
      expect(badge).not.toBeInTheDocument()
    })

    it('deve mostrar badge quando há 1 item do produto no carrinho', () => {
      // Mock do store com 1 item no carrinho
      mockUseCartStore.mockImplementation((selector) => {
        const store = {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              name: 'iPhone 15',
              quantity: 1,
              unitPrice: 1200
            }
          ],
          addItem: jest.fn(),
          getItemsCount: () => 1
        }
        return selector(store)
      })

      render(<ProductCard product={mockProduct} />)
      
      // Badge deve existir e mostrar quantidade 1
      const badge = screen.getByTestId('cart-quantity-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('1')
    })

    it('deve mostrar badge com quantidade correta quando há múltiplos itens', () => {
      // Mock do store com 3 itens do mesmo produto no carrinho
      mockUseCartStore.mockImplementation((selector) => {
        const store = {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              name: 'iPhone 15',
              quantity: 3,
              unitPrice: 1200
            }
          ],
          addItem: jest.fn(),
          getItemsCount: () => 3
        }
        return selector(store)
      })

      render(<ProductCard product={mockProduct} />)
      
      // Badge deve mostrar quantidade 3
      const badge = screen.getByTestId('cart-quantity-badge')
      expect(badge).toHaveTextContent('3')
    })

    it('deve mostrar badge com fundo verde', () => {
      // Mock do store com item no carrinho
      mockUseCartStore.mockImplementation((selector) => {
        const store = {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              name: 'iPhone 15',
              quantity: 2,
              unitPrice: 1200
            }
          ],
          addItem: jest.fn(),
          getItemsCount: () => 2
        }
        return selector(store)
      })

      render(<ProductCard product={mockProduct} />)
      
      const badge = screen.getByTestId('cart-quantity-badge')
      expect(badge).toHaveClass('bg-green-500')
    })

    it('deve conter ícone de carrinho no badge', () => {
      // Mock do store com item no carrinho
      mockUseCartStore.mockImplementation((selector) => {
        const store = {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              name: 'iPhone 15',
              quantity: 1,
              unitPrice: 1200
            }
          ],
          addItem: jest.fn(),
          getItemsCount: () => 1
        }
        return selector(store)
      })

      render(<ProductCard product={mockProduct} />)
      
      const cartIcon = screen.getByTestId('cart-badge-icon')
      expect(cartIcon).toBeInTheDocument()
    })

    it('deve estar posicionado no canto inferior direito da imagem', () => {
      // Mock do store com item no carrinho
      mockUseCartStore.mockImplementation((selector) => {
        const store = {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              name: 'iPhone 15',
              quantity: 1,
              unitPrice: 1200
            }
          ],
          addItem: jest.fn(),
          getItemsCount: () => 1
        }
        return selector(store)
      })

      render(<ProductCard product={mockProduct} />)
      
      const badge = screen.getByTestId('cart-quantity-badge')
      
      // Verificar classes de posicionamento
      expect(badge).toHaveClass('absolute')
      expect(badge).toHaveClass('bottom-2')
      expect(badge).toHaveClass('right-2')
    })

    it('não deve mostrar badge para produto diferente no carrinho', () => {
      // Mock do store com item de outro produto no carrinho
      mockUseCartStore.mockImplementation((selector) => {
        const store = {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-2', // Produto diferente
              name: 'Samsung Galaxy',
              quantity: 2,
              unitPrice: 800
            }
          ],
          addItem: jest.fn(),
          getItemsCount: () => 2
        }
        return selector(store)
      })

      render(<ProductCard product={mockProduct} />)
      
      // Badge não deve existir para este produto
      const badge = screen.queryByTestId('cart-quantity-badge')
      expect(badge).not.toBeInTheDocument()
    })

    it('deve somar quantidades de múltiplos itens do mesmo produto', () => {
      // Mock do store com múltiplos itens do mesmo produto
      mockUseCartStore.mockImplementation((selector) => {
        const store = {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              name: 'iPhone 15',
              quantity: 2,
              unitPrice: 1200
            },
            {
              id: 'cart-item-2',
              productId: 'product-1',
              name: 'iPhone 15',
              quantity: 3,
              unitPrice: 1200
            }
          ],
          addItem: jest.fn(),
          getItemsCount: () => 5
        }
        return selector(store)
      })

      render(<ProductCard product={mockProduct} />)
      
      const badge = screen.getByTestId('cart-quantity-badge')
      expect(badge).toHaveTextContent('5')
    })
  })

  describe('Badge para produtos com modelos', () => {
    const productWithModels = {
      ...mockProduct,
      hasModels: true,
      isModalProduct: true
    }

    it('não deve mostrar badge para produto com modelos quando não há itens específicos', () => {
      // Mock do store com item de modelo específico no carrinho
      mockUseCartStore.mockImplementation((selector) => {
        const store = {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              modelId: 'model-128gb',
              name: 'iPhone 15',
              quantity: 2,
              unitPrice: 1200
            }
          ],
          addItem: jest.fn(),
          getItemsCount: () => 2
        }
        return selector(store)
      })

      render(<ProductCard product={productWithModels} />)
      
      // Badge não deve mostrar para o produto geral, apenas para modelos específicos
      const badge = screen.queryByTestId('cart-quantity-badge')
      expect(badge).not.toBeInTheDocument()
    })
  })
})
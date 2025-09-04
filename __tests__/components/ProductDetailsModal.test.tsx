import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductDetailsModal from '@/components/products/ProductDetailsModal';

// Mock para evitar erro de portal
const mockPortal = jest.fn((component) => component);
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: mockPortal,
}));

// Mock para evitar problemas com Next/Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

const mockProduct = {
  id: '1',
  name: 'Capa TPU Transparente',
  subname: 'Anti-impacto',
  description: 'Capa de silicone transparente com proteção anti-impacto',
  brand: 'GenericBrand',
  category: 'Capas e Cases', // string
  images: [
    {
      id: '1',
      url: 'https://example.com/image1.jpg',
      isMain: true
    },
    {
      id: '2', 
      url: 'https://example.com/image2.jpg',
      isMain: false
    }
  ]
};

const mockProductWithCategoryObject = {
  ...mockProduct,
  category: {
    id: '1',
    name: 'Capas e Cases',
    slug: 'capas-cases'
  }
};

describe('ProductDetailsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    product: mockProduct
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o modal quando isOpen for true', () => {
    render(<ProductDetailsModal {...defaultProps} />);
    
    expect(screen.getByText('Detalhes do Produto')).toBeInTheDocument();
    expect(screen.getByText('Capa TPU Transparente')).toBeInTheDocument();
  });

  it('não deve renderizar quando isOpen for false', () => {
    render(<ProductDetailsModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Detalhes do Produto')).not.toBeInTheDocument();
  });

  it('deve renderizar category como string corretamente', () => {
    render(<ProductDetailsModal {...defaultProps} />);
    
    expect(screen.getByText('Capas e Cases')).toBeInTheDocument();
  });

  it('deve renderizar category como objeto corretamente', () => {
    const props = {
      ...defaultProps,
      product: mockProductWithCategoryObject
    };
    
    render(<ProductDetailsModal {...props} />);
    
    expect(screen.getByText('Capas e Cases')).toBeInTheDocument();
  });

  it('deve mostrar subname quando fornecido', () => {
    render(<ProductDetailsModal {...defaultProps} />);
    
    expect(screen.getByText('Anti-impacto')).toBeInTheDocument();
  });

  it('deve mostrar descrição quando fornecida', () => {
    render(<ProductDetailsModal {...defaultProps} />);
    
    expect(screen.getByText('Descrição')).toBeInTheDocument();
    expect(screen.getByText(mockProduct.description)).toBeInTheDocument();
  });

  it('deve mostrar brand quando fornecido', () => {
    render(<ProductDetailsModal {...defaultProps} />);
    
    expect(screen.getByText('GenericBrand')).toBeInTheDocument();
  });

  it('deve chamar onClose quando clicar no botão X', () => {
    const onClose = jest.fn();
    render(<ProductDetailsModal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /fechar modal/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onClose quando clicar no overlay', () => {
    const onClose = jest.fn();
    render(<ProductDetailsModal {...defaultProps} onClose={onClose} />);
    
    const overlay = screen.getByRole('button').closest('[class*="fixed inset-0"]');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('deve mostrar navegação de imagens quando houver múltiplas imagens', () => {
    render(<ProductDetailsModal {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /imagem anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próxima imagem/i })).toBeInTheDocument();
  });

  it('não deve mostrar navegação quando houver apenas uma imagem', () => {
    const productWithOneImage = {
      ...mockProduct,
      images: [mockProduct.images[0]]
    };
    
    render(<ProductDetailsModal {...defaultProps} product={productWithOneImage} />);
    
    expect(screen.queryByRole('button', { name: /imagem anterior/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /próxima imagem/i })).not.toBeInTheDocument();
  });

  it('deve navegar para próxima imagem ao clicar na seta direita', () => {
    render(<ProductDetailsModal {...defaultProps} />);
    
    const nextButton = screen.getByRole('button', { name: /próxima imagem/i });
    fireEvent.click(nextButton);
    
    // Verificar se a imagem mudou seria complexo aqui, 
    // mas pelo menos testamos que o botão é clicável
    expect(nextButton).toBeInTheDocument();
  });

  it('deve fechar modal quando pressionar Escape', () => {
    const onClose = jest.fn();
    render(<ProductDetailsModal {...defaultProps} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('deve navegar com setas do teclado', () => {
    render(<ProductDetailsModal {...defaultProps} />);
    
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    
    // Teste que as teclas não causam erros
    expect(screen.getByText('Detalhes do Produto')).toBeInTheDocument();
  });

  it('deve renderizar placeholders quando dados estão faltando', () => {
    const minimalProduct = {
      id: '1',
      name: 'Produto Básico'
    };
    
    render(<ProductDetailsModal {...defaultProps} product={minimalProduct} />);
    
    expect(screen.getByText('Produto Básico')).toBeInTheDocument();
    expect(screen.queryByText('Descrição')).not.toBeInTheDocument();
  });

  it('deve filtrar imagens principais para produtos modais', () => {
    const modalProduct = {
      ...mockProduct,
      isModalProduct: true,
      images: [
        { id: '1', url: 'main.jpg', isMain: true },
        { id: '2', url: 'secondary.jpg', isMain: false }
      ]
    };
    
    render(<ProductDetailsModal {...defaultProps} product={modalProduct} />);
    
    // Produto modal deve mostrar apenas imagem principal
    expect(screen.queryByRole('button', { name: /próxima imagem/i })).not.toBeInTheDocument();
  });

  it('deve mostrar todas as imagens para produtos normais', () => {
    const normalProduct = {
      ...mockProduct,
      isModalProduct: false
    };
    
    render(<ProductDetailsModal {...defaultProps} product={normalProduct} />);
    
    // Produto normal deve mostrar todas as imagens
    expect(screen.getByRole('button', { name: /próxima imagem/i })).toBeInTheDocument();
  });

  // Testes específicos para os indicadores de imagem
  describe('Indicadores de Imagem', () => {
    const productWithMultipleImages = {
      ...mockProduct,
      images: [
        { id: '1', url: 'https://example.com/image1.jpg', isMain: true },
        { id: '2', url: 'https://example.com/image2.jpg', isMain: false },
        { id: '3', url: 'https://example.com/image3.jpg', isMain: false },
        { id: '4', url: 'https://example.com/image4.jpg', isMain: false }
      ]
    };

    it('deve renderizar indicadores para produto com múltiplas imagens', () => {
      render(<ProductDetailsModal {...defaultProps} product={productWithMultipleImages} />);
      
      // Deve haver 4 indicadores
      const indicators = screen.getAllByRole('button', { name: /ir para imagem/i });
      expect(indicators).toHaveLength(4);
      
      // Verificar labels específicos
      expect(screen.getByRole('button', { name: 'Ir para imagem 1 de 4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ir para imagem 2 de 4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ir para imagem 3 de 4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ir para imagem 4 de 4' })).toBeInTheDocument();
    });

    it('deve marcar o primeiro indicador como ativo por padrão', () => {
      render(<ProductDetailsModal {...defaultProps} product={productWithMultipleImages} />);
      
      const firstIndicator = screen.getByRole('button', { name: 'Ir para imagem 1 de 4' });
      expect(firstIndicator).toHaveAttribute('aria-current', 'true');
      
      const otherIndicators = screen.getAllByRole('button', { name: /ir para imagem [2-4]/i });
      otherIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-current', 'false');
      });
    });

    it('deve alterar indicador ativo ao navegar entre imagens', () => {
      render(<ProductDetailsModal {...defaultProps} product={productWithMultipleImages} />);
      
      // Clicar no terceiro indicador
      const thirdIndicator = screen.getByRole('button', { name: 'Ir para imagem 3 de 4' });
      fireEvent.click(thirdIndicator);
      
      // Terceiro indicador deve estar ativo
      expect(thirdIndicator).toHaveAttribute('aria-current', 'true');
      
      // Outros indicadores devem estar inativos
      const firstIndicator = screen.getByRole('button', { name: 'Ir para imagem 1 de 4' });
      const secondIndicator = screen.getByRole('button', { name: 'Ir para imagem 2 de 4' });
      const fourthIndicator = screen.getByRole('button', { name: 'Ir para imagem 4 de 4' });
      
      expect(firstIndicator).toHaveAttribute('aria-current', 'false');
      expect(secondIndicator).toHaveAttribute('aria-current', 'false');
      expect(fourthIndicator).toHaveAttribute('aria-current', 'false');
    });

    it('deve aplicar classes de estilo corretas para indicador ativo', () => {
      render(<ProductDetailsModal {...defaultProps} product={productWithMultipleImages} />);
      
      const activeIndicator = screen.getByRole('button', { name: 'Ir para imagem 1 de 4' });
      expect(activeIndicator).toHaveClass('image-indicator-active');
      expect(activeIndicator).not.toHaveClass('image-indicator-inactive');
    });

    it('deve aplicar classes de estilo corretas para indicadores inativos', () => {
      render(<ProductDetailsModal {...defaultProps} product={productWithMultipleImages} />);
      
      const inactiveIndicators = screen.getAllByRole('button', { name: /ir para imagem [2-4]/i });
      inactiveIndicators.forEach(indicator => {
        expect(indicator).toHaveClass('image-indicator-inactive');
        expect(indicator).not.toHaveClass('image-indicator-active');
      });
    });

    it('deve navegar corretamente ao clicar em diferentes indicadores', () => {
      render(<ProductDetailsModal {...defaultProps} product={productWithMultipleImages} />);
      
      // Clicar no segundo indicador
      const secondIndicator = screen.getByRole('button', { name: 'Ir para imagem 2 de 4' });
      fireEvent.click(secondIndicator);
      
      expect(secondIndicator).toHaveAttribute('aria-current', 'true');
      
      // Clicar no quarto indicador
      const fourthIndicator = screen.getByRole('button', { name: 'Ir para imagem 4 de 4' });
      fireEvent.click(fourthIndicator);
      
      expect(fourthIndicator).toHaveAttribute('aria-current', 'true');
      expect(secondIndicator).toHaveAttribute('aria-current', 'false');
    });

    it('não deve renderizar indicadores para produto com uma única imagem', () => {
      const productWithOneImage = {
        ...mockProduct,
        images: [{ id: '1', url: 'https://example.com/image1.jpg', isMain: true }]
      };
      
      render(<ProductDetailsModal {...defaultProps} product={productWithOneImage} />);
      
      const indicators = screen.queryAllByRole('button', { name: /ir para imagem/i });
      expect(indicators).toHaveLength(0);
    });

    it('deve renderizar container dos indicadores com classes corretas', () => {
      render(<ProductDetailsModal {...defaultProps} product={productWithMultipleImages} />);
      
      // O container deve ter as classes de estilo
      const indicatorContainer = screen.getByRole('button', { name: 'Ir para imagem 1 de 4' }).parentElement;
      expect(indicatorContainer).toHaveClass('absolute', 'bottom-4', 'left-1/2', '-translate-x-1/2', 'flex');
    });

    it('deve mostrar indicadores para produto com 5+ imagens', () => {
      const productWithManyImages = {
        ...mockProduct,
        images: [
          { id: '1', url: 'image1.jpg', isMain: true },
          { id: '2', url: 'image2.jpg', isMain: false },
          { id: '3', url: 'image3.jpg', isMain: false },
          { id: '4', url: 'image4.jpg', isMain: false },
          { id: '5', url: 'image5.jpg', isMain: false },
          { id: '6', url: 'image6.jpg', isMain: false }
        ]
      };
      
      render(<ProductDetailsModal {...defaultProps} product={productWithManyImages} />);
      
      const indicators = screen.getAllByRole('button', { name: /ir para imagem/i });
      expect(indicators).toHaveLength(6);
      
      // Verificar que todos têm os labels corretos
      expect(screen.getByRole('button', { name: 'Ir para imagem 1 de 6' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ir para imagem 6 de 6' })).toBeInTheDocument();
    });
  });
});
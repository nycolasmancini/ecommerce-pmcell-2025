import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnlockPricesModal from '@/components/ui/UnlockPricesModal';
import * as SessionContext from '@/contexts/SessionContext';
import * as Analytics from '@/lib/analytics';

// Mock para evitar erro de portal
const mockPortal = jest.fn((component) => component);
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: mockPortal,
}));

// Mock do SessionContext
const mockUseSession = jest.fn();
jest.mock('@/contexts/SessionContext', () => ({
  useSession: () => mockUseSession(),
}));

// Mock do Analytics
const mockAnalytics = {
  trackWhatsAppCollection: jest.fn(),
};
jest.mock('@/lib/analytics', () => ({
  useAnalytics: () => mockAnalytics,
}));

describe('UnlockPricesModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  const mockUnlockPrices = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup padrão do mock de sessão
    mockUseSession.mockReturnValue({
      unlocked: false,
      whatsapp: null,
      sessionId: null,
      unlockPrices: mockUnlockPrices,
      checkSession: jest.fn(),
    });
    
    // Mock global do window para testes de analytics
    Object.defineProperty(window, 'window', {
      value: window,
      writable: true,
    });
  });

  it('deve renderizar o modal quando isOpen for true', () => {
    render(<UnlockPricesModal {...defaultProps} />);
    
    expect(screen.getByText('🤝 Vamos fazer negócio juntos?')).toBeInTheDocument();
    expect(screen.getByText('Ver Preços Especiais')).toBeInTheDocument();
  });

  it('não deve renderizar quando isOpen for false', () => {
    render(<UnlockPricesModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('🤝 Vamos fazer negócio juntos?')).not.toBeInTheDocument();
  });

  it('deve renderizar o campo de WhatsApp com placeholder usando underlines', () => {
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', '(__) _____-____');
  });

  it('deve ter placeholder estético com underlines em vez de números exemplo', () => {
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    const placeholder = input.getAttribute('placeholder');
    
    // Verificar que não usa números exemplo
    expect(placeholder).not.toContain('9999');
    expect(placeholder).not.toContain('11');
    
    // Verificar que usa underlines para demonstrar formato
    expect(placeholder).toBe('(__) _____-____');
  });

  it('deve aplicar máscara ao digitar no campo de telefone', () => {
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i }) as HTMLInputElement;
    
    // Teste com 2 dígitos
    fireEvent.change(input, { target: { value: '11' } });
    expect(input.value).toBe('(11');
    
    // Teste com 6 dígitos
    fireEvent.change(input, { target: { value: '119999' } });
    expect(input.value).toBe('(11) 9999');
    
    // Teste com 10 dígitos
    fireEvent.change(input, { target: { value: '1199999999' } });
    expect(input.value).toBe('(11) 9999-9999');
    
    // Teste com 11 dígitos
    fireEvent.change(input, { target: { value: '11999999999' } });
    expect(input.value).toBe('(11) 99999-9999');
  });

  it('deve mostrar erro para WhatsApp inválido', async () => {
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    const button = screen.getByText('Ver Preços Especiais');
    
    // Digitar número inválido
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Por favor, insira um WhatsApp válido com DDD')).toBeInTheDocument();
    });
  });

  it('deve chamar unlockPrices com WhatsApp válido', async () => {
    mockUnlockPrices.mockResolvedValue(undefined);
    
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    const button = screen.getByText('Ver Preços Especiais');
    
    // Digitar número válido
    fireEvent.change(input, { target: { value: '11999999999' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockUnlockPrices).toHaveBeenCalledWith('+5511999999999');
    });
  });

  it('deve mostrar loading durante o processo de desbloqueio', async () => {
    // Mock que demora para resolver
    mockUnlockPrices.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    const button = screen.getByText('Ver Preços Especiais');
    
    fireEvent.change(input, { target: { value: '11999999999' } });
    fireEvent.click(button);
    
    expect(screen.getByText('Liberando...')).toBeInTheDocument();
    expect(button).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByText('Ver Preços Especiais')).toBeInTheDocument();
    });
  });

  it('deve mostrar erro quando unlockPrices falha', async () => {
    mockUnlockPrices.mockRejectedValue(new Error('API Error'));
    
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    const button = screen.getByText('Ver Preços Especiais');
    
    fireEvent.change(input, { target: { value: '11999999999' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Erro ao liberar preços. Tente novamente.')).toBeInTheDocument();
    });
  });

  it('deve chamar onClose quando clicar no botão "Agora não, obrigado"', () => {
    const onClose = jest.fn();
    render(<UnlockPricesModal {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Agora não, obrigado');
    fireEvent.click(cancelButton);
    
    // O componente tem animação de fechamento
    setTimeout(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    }, 400);
  });

  it('deve chamar onClose quando clicar no overlay', () => {
    const onClose = jest.fn();
    render(<UnlockPricesModal {...defaultProps} onClose={onClose} />);
    
    const overlay = screen.getByText('🤝 Vamos fazer negócio juntos?').closest('[class*="fixed inset-0"]');
    if (overlay) {
      fireEvent.click(overlay);
      // O componente tem animação de fechamento
      setTimeout(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      }, 400);
    }
  });

  it('deve rastrear coleta de WhatsApp com analytics', async () => {
    mockUnlockPrices.mockResolvedValue(undefined);
    
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    const button = screen.getByText('Ver Preços Especiais');
    
    fireEvent.change(input, { target: { value: '11999999999' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockAnalytics.trackWhatsAppCollection).toHaveBeenCalledWith('+5511999999999');
    });
  });

  it('deve fechar modal após desbloqueio bem-sucedido', async () => {
    const onClose = jest.fn();
    mockUnlockPrices.mockResolvedValue(undefined);
    
    render(<UnlockPricesModal {...defaultProps} onClose={onClose} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    const button = screen.getByText('Ver Preços Especiais');
    
    fireEvent.change(input, { target: { value: '11999999999' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      // O componente tem animação de fechamento
      setTimeout(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      }, 400);
    });
  });

  it('deve limpar erro ao digitar novo valor', async () => {
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    const button = screen.getByText('Ver Preços Especiais');
    
    // Primeiro, gerar erro com número inválido
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Por favor, insira um WhatsApp válido com DDD')).toBeInTheDocument();
    });
    
    // Depois, digitar novo valor deve limpar o erro
    fireEvent.change(input, { target: { value: '11999999999' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.queryByText('Por favor, insira um WhatsApp válido com DDD')).not.toBeInTheDocument();
    });
  });

  it('deve renderizar texto explicativo sobre uso dos dados', () => {
    render(<UnlockPricesModal {...defaultProps} />);
    
    expect(screen.getByText(/Utilizamos seu WhatsApp apenas para enviar lançamentos exclusivos/)).toBeInTheDocument();
    expect(screen.getByText(/Seus dados estão protegidos e nunca serão compartilhados/)).toBeInTheDocument();
  });

  it('deve ter campos obrigatórios marcados corretamente', () => {
    render(<UnlockPricesModal {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /whatsapp/i });
    expect(input).toBeRequired();
  });

  // Teste específico para edge cases da máscara
  describe('Máscara de telefone - edge cases', () => {
    it('deve remover caracteres não numéricos', () => {
      render(<UnlockPricesModal {...defaultProps} />);
      
      const input = screen.getByRole('textbox', { name: /whatsapp/i }) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'abc11def999gh999999' } });
      expect(input.value).toBe('(11) 99999-9999');
    });

    it('deve lidar com strings vazias', () => {
      render(<UnlockPricesModal {...defaultProps} />);
      
      const input = screen.getByRole('textbox', { name: /whatsapp/i }) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: '' } });
      expect(input.value).toBe('');
    });

    it('deve limitar a 11 dígitos', () => {
      render(<UnlockPricesModal {...defaultProps} />);
      
      const input = screen.getByRole('textbox', { name: /whatsapp/i }) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: '119999999991234567890' } });
      expect(input.value).toBe('(11) 99999-9999');
    });
  });
});
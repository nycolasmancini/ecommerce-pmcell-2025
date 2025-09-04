'use client'

import { useState } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { validateBrazilianWhatsApp, formatWhatsApp } from '@/lib/utils'
import { useAnalytics } from '@/lib/analytics'

interface UnlockPricesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UnlockPricesModal({ isOpen, onClose }: UnlockPricesModalProps) {
  const { unlockPrices } = useSession()
  const [whatsapp, setWhatsapp] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  // Aplicar máscara brasileira para telefone
  const applyPhoneMask = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      // Format para 10 dígitos: (XX) XXXX-XXXX
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    } else {
      // Format para 11 dígitos: (XX) XXXXX-XXXX
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = applyPhoneMask(e.target.value);
    setWhatsapp(maskedValue);
  };
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300) // Duração da animação
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Formatar WhatsApp
    const formattedWhatsApp = formatWhatsApp(whatsapp)

    // Validar
    if (!validateBrazilianWhatsApp(formattedWhatsApp)) {
      setError('Por favor, insira um WhatsApp válido com DDD')
      return
    }

    setLoading(true)

    try {
      console.log('📞 Iniciando desbloqueio para:', formattedWhatsApp)
      
      await unlockPrices(formattedWhatsApp)
      
      console.log('✅ Preços desbloqueados com sucesso')
      
      // Track WhatsApp collection
      console.log('📞 Modal: WhatsApp coletado, iniciando tracking...')
      if (typeof window !== 'undefined') {
        try {
          const analytics = useAnalytics()
          console.log('📞 Modal: Analytics instance obtida:', analytics)
          analytics.trackWhatsAppCollection(formattedWhatsApp)
          console.log('📞 Modal: trackWhatsAppCollection chamado com sucesso')
        } catch (analyticsError) {
          console.error('❌ Erro no tracking de WhatsApp:', analyticsError)
        }
      }
      
      handleClose()
    } catch (error) {
      console.error('❌ Erro ao liberar preços:', error)
      setError('Erro ao liberar preços. Tente novamente.')
    } finally {
      console.log('🔄 Finalizando processo de desbloqueio')
      setLoading(false)
    }
  }

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center p-4 z-50 ${
        isClosing ? '' : 'animate-fade-in'
      }`}
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: isClosing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out'
      }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl transform transition-all duration-300" 
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: isClosing ? 'modalSlideOut 0.3s ease-out' : 'modalSlideIn 0.3s ease-out'
        }}
      >
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🤝 Vamos fazer negócio juntos?
          </h2>
          <p className="text-gray-600">
            Deixe seu WhatsApp para ver preços personalizados e ter um atendimento direto quando precisar. Somos parceiros do seu sucesso!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="whatsapp" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.484 3.687" fill="#25D366"/>
              </svg>
              WhatsApp
            </label>
            <input
              type="tel"
              id="whatsapp"
              value={whatsapp}
              onChange={handlePhoneChange}
              placeholder="(__) _____-____"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#FC6D36' }}
            >
              {loading ? 'Liberando...' : 'Ver Preços Especiais'}
            </button>
            
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2 px-4 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors text-sm"
            >
              Agora não, obrigado
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Utilizamos seu WhatsApp apenas para enviar lançamentos exclusivos e ofertas especiais.
            Seus dados estão protegidos e nunca serão compartilhados com terceiros.
          </p>
        </div>
      </div>
    </div>
  )
}
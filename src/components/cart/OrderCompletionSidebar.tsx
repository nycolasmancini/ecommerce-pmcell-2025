'use client'

import { useState } from 'react'
import { X, CheckCircle, Package, ArrowLeft } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/stores/useCartStore'
import { useSession } from '@/contexts/SessionContext'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/ui/Toast'

interface OrderCompletionSidebarProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  orderNumber: number
  subtotal: number
  itemsCount: number
  customerName?: string
  finalWhatsapp?: string
}

export function OrderCompletionSidebar({ 
  isOpen, 
  onClose, 
  onBack, 
  orderNumber, 
  subtotal, 
  itemsCount,
  customerName = '',
  finalWhatsapp
}: OrderCompletionSidebarProps) {
  const { clearCart } = useCartStore()
  const { whatsapp } = useSession()
  const { toasts, showToast, removeToast } = useToast()
  
  const [isClosing, setIsClosing] = useState(false)

  const handleFinish = () => {
    setIsClosing(true)
    
    // Limpar carrinho
    clearCart()
    
    // Mostrar toast de confirmação
    showToast(
      `Obrigado${customerName ? `, ${customerName}` : ''}! Nossa equipe entrará em contato em breve. 😊`,
      'success'
    )
    
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 1500)
  }

  // Função para formatar WhatsApp para exibição
  const formatWhatsAppForDisplay = (phone: string) => {
    if (!phone) return ''
    
    const numbers = phone.replace(/\D/g, '')
    const withoutCountry = numbers.startsWith('55') ? numbers.substring(2) : numbers
    
    if (withoutCountry.length === 11) {
      return withoutCountry.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (withoutCountry.length === 10) {
      return withoutCountry.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    
    return withoutCountry
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-300 ease-out ${
          isOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl flex flex-col
          transition-all duration-300 ease-out transform ${
            isOpen 
              ? 'translate-x-0 opacity-100' 
              : 'translate-x-full opacity-0'
          }`}
        style={{
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1), -10px 0 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              Pedido Enviado! 🎉
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Success Icon & Message */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle className="w-12 h-12 text-green-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 animate-in slide-in-from-bottom duration-300 delay-200">
              {customerName ? `Parabéns, ${customerName}! 🎉` : 'Parabéns! 🎉'}
            </h3>
            <p className="text-gray-600 leading-relaxed animate-in slide-in-from-bottom duration-300 delay-300">
              Seu pedido foi enviado com sucesso e nossa equipe entrará em contato em breve!
            </p>
          </div>

          {/* Order Details */}
          <div className="space-y-6">
            {/* Order Number */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border-l-4 border-[#FC6D36] animate-in slide-in-from-left duration-300 delay-400">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-[#FC6D36]" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Número do Pedido</p>
                  <p className="text-xl font-bold text-[#FC6D36]">#{orderNumber}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            {customerName && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 animate-in slide-in-from-right duration-300 delay-500">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">Nome confirmado</p>
                    <p className="font-semibold text-blue-900">{customerName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Info */}
            {(finalWhatsapp || whatsapp) && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 animate-in slide-in-from-left duration-300 delay-600">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">WhatsApp confirmado</p>
                    <p className="font-semibold text-green-900">{formatWhatsAppForDisplay(finalWhatsapp || whatsapp || '')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom duration-300 delay-700">
              <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Resumo do Pedido
              </h4>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quantidade de itens:</span>
                <span className="font-medium">{itemsCount} unidades</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600">✅ Pedido mínimo atingido</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Valor Total:</span>
                <span className="text-[#FC6D36]">{formatPrice(subtotal)}</span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-xl p-4 animate-in slide-in-from-bottom duration-300 delay-800">
              <h4 className="font-semibold text-blue-900 mb-3">Próximos Passos</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Nossa equipe entrará em contato em até 2 horas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Confirmaremos os detalhes e formas de pagamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Processaremos seu pedido rapidamente</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-white space-y-3">
          <button
            onClick={handleFinish}
            disabled={isClosing}
            className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${
              isClosing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
            }`}
          >
            {isClosing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Finalizando...
              </div>
            ) : (
              '✨ Finalizar e Continuar Comprando'
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            Obrigado pela preferência! Em caso de dúvidas, entre em contato conosco. 💚
          </p>
        </div>
      </div>
      
      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  )
}
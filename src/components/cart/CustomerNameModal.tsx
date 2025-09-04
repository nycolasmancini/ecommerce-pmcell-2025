'use client'

import { useState, useEffect } from 'react'
import { X, Edit3, User } from 'lucide-react'
import { useSession } from '@/contexts/SessionContext'
import { formatPrice } from '@/lib/utils'

interface CustomerNameModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    customerName: string
    originalWhatsapp: string
    finalWhatsapp: string
  }) => void
  totalValue: number
  itemsCount: number
}

export default function CustomerNameModal({
  isOpen,
  onClose,
  onSubmit,
  totalValue,
  itemsCount
}: CustomerNameModalProps) {
  const { whatsapp: sessionWhatsapp } = useSession()
  const [customerName, setCustomerName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [isEditingWhatsapp, setIsEditingWhatsapp] = useState(false)
  const [originalWhatsapp, setOriginalWhatsapp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Função para formatar WhatsApp para exibição
  const formatWhatsAppForDisplay = (phone: string) => {
    if (!phone) return ''
    
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '')
    
    // Se começar com 55, remove
    const withoutCountry = numbers.startsWith('55') ? numbers.substring(2) : numbers
    
    // Aplica máscara brasileira
    if (withoutCountry.length === 11) {
      return withoutCountry.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (withoutCountry.length === 10) {
      return withoutCountry.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    
    return withoutCountry
  }

  // Função para formatar entrada de WhatsApp
  const formatWhatsappInput = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11)
    
    // Aplica máscara (99) 99999-9999
    if (limited.length <= 10) {
      return limited.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
    } else {
      return limited.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
    }
  }

  // Converter WhatsApp formatado para formato brasileiro (55XXXXXXXXXXX)
  const convertToFullFormat = (formattedPhone: string) => {
    const numbers = formattedPhone.replace(/\D/g, '')
    return numbers.length === 11 ? `55${numbers}` : numbers.length === 10 ? `55${numbers}` : numbers
  }

  // Inicializar com dados da sessão quando abrir
  useEffect(() => {
    if (isOpen && sessionWhatsapp) {
      const formattedWhatsapp = formatWhatsAppForDisplay(sessionWhatsapp)
      setWhatsappNumber(formattedWhatsapp)
      setOriginalWhatsapp(formattedWhatsapp)
      setIsEditingWhatsapp(false)
    }
  }, [isOpen, sessionWhatsapp])

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) {
      setCustomerName('')
      setWhatsappNumber('')
      setOriginalWhatsapp('')
      setIsEditingWhatsapp(false)
      setIsSubmitting(false)
    }
  }, [isOpen])

  const handleWhatsappEdit = () => {
    setIsEditingWhatsapp(!isEditingWhatsapp)
  }

  const handleWhatsappChange = (value: string) => {
    const formatted = formatWhatsappInput(value)
    setWhatsappNumber(formatted)
  }

  const handleSubmit = async () => {
    if (!customerName.trim() || !whatsappNumber.trim()) return

    setIsSubmitting(true)

    try {
      const originalFull = sessionWhatsapp || ''
      const finalFull = convertToFullFormat(whatsappNumber)

      await onSubmit({
        customerName: customerName.trim(),
        originalWhatsapp: originalFull,
        finalWhatsapp: finalFull
      })
    } catch (error) {
      console.error('Error submitting customer data:', error)
      setIsSubmitting(false)
    }
  }

  const isFormValid = customerName.trim() && whatsappNumber.trim()
  const hasWhatsappChanged = originalWhatsapp && originalWhatsapp !== whatsappNumber

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform">
        <div className="mx-4 overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Quase lá! 🎯</h2>
                <p className="text-sm text-gray-600">Para finalizar seu pedido, como podemos te chamar?</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/60 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Customer Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4 text-orange-500" />
                Seu nome
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite seu nome"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                disabled={isSubmitting}
                maxLength={100}
              />
              <p className="text-xs text-gray-500">
                Usaremos seu nome para um atendimento mais pessoal no WhatsApp
              </p>
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <div className="w-4 h-4 rounded bg-green-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </div>
                WhatsApp para contato
              </label>
              
              {sessionWhatsapp && (
                <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                  ✅ Usando o número da sua sessão
                </p>
              )}
              
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={!isEditingWhatsapp || isSubmitting}
                  className={`flex-1 px-4 py-3 border border-gray-200 rounded-xl transition-all duration-200 ${
                    isEditingWhatsapp 
                      ? 'focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white' 
                      : 'bg-gray-50 text-gray-600'
                  }`}
                />
                <button
                  onClick={handleWhatsappEdit}
                  disabled={isSubmitting}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isEditingWhatsapp
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isEditingWhatsapp ? 'Confirmar WhatsApp' : 'Editar WhatsApp'}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              
              {hasWhatsappChanged && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  ⚠️ Número atualizado. Usaremos este para contato.<br />
                  <span className="text-gray-600">Original: {originalWhatsapp}</span>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 text-center">
                Resumo do seu pedido
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Itens:</span>
                  <span className="font-medium">{itemsCount} unidades</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-orange-600">{formatPrice(totalValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                isFormValid && !isSubmitting
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Finalizando pedido...
                </div>
              ) : (
                'Finalizar Pedido'
              )}
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-3 leading-relaxed">
              Ao finalizar, você concorda com nossos termos de uso.<br />
              Nossa equipe entrará em contato em breve! 😊
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
'use client'

import React from 'react'
import { X, ShoppingCart, Clock, Search, Eye, AlertCircle, Package } from 'lucide-react'
import { VisitCart, formatCurrency, formatSessionDuration } from '@/stores/useVisitStore'

interface CartDetailsModalProps {
  cart: VisitCart | null
  isOpen: boolean
  onClose: () => void
  error?: string | null
}

export default function CartDetailsModal({ cart, isOpen, onClose, error }: CartDetailsModalProps) {
  if (!isOpen) return null
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Detalhes do Carrinho</h2>
              <p className="text-sm text-gray-600">{cart?.whatsapp || 'Telefone não informado'}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-medium text-red-800">Erro ao carregar carrinho</h3>
              </div>
              <p className="text-red-700 mb-3">{error}</p>
              <div className="text-sm text-red-600 bg-red-100 rounded-md p-3">
                <strong>Possíveis causas:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Carrinho pode ter expirado ou foi removido</li>
                  <li>Sessão não foi salva corretamente no banco de dados</li>
                  <li>Cliente não adicionou itens ao carrinho</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Empty Cart State */}
          {!error && cart && (!cart.items || cart.items.length === 0) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Carrinho Vazio</h3>
              <p className="text-gray-600 mb-4">
                Este usuário não possui itens no carrinho ou o carrinho foi limpo.
              </p>
              <div className="text-sm text-gray-500">
                Última atividade: {cart.lastActivity}
              </div>
            </div>
          )}
          
          {/* Normal Cart Content */}
          {!error && cart && cart.items && cart.items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Itens do Carrinho */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Itens do Carrinho ({cart.items.length})
                </h3>
                
                <div className="space-y-3">
                  {cart.items.map((item, index) => (
                    <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.name}
                          </h4>
                          {item.modelName && (
                            <p className="text-sm text-gray-600 mt-1">
                              Modelo: {item.modelName}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Qtd: {item.quantity}</span>
                            <span>Unitário: {formatCurrency(item.unitPrice)}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span className="text-gray-900">Total do Carrinho:</span>
                    <span className="text-green-600">{formatCurrency(cart.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Analytics e Informações */}
            <div className="space-y-4">
              
              {/* Info da Sessão */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Informações da Sessão
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Tempo no Site:</span>
                    <span className="font-medium text-blue-900">
                      {formatSessionDuration(cart.analytics.timeOnSite)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Última Atividade:</span>
                    <span className="font-medium text-blue-900 text-xs">
                      {cart.lastActivity}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Pesquisas Realizadas */}
              {cart.analytics.searchTerms.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Pesquisas Realizadas ({cart.analytics.searchTerms.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {cart.analytics.searchTerms.slice(0, 5).map((search, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-yellow-800 font-medium">"{search.term}"</span>
                        <span className="text-yellow-600 text-xs">{search.count}x</span>
                      </div>
                    ))}
                    
                    {cart.analytics.searchTerms.length > 5 && (
                      <div className="text-xs text-yellow-600 text-center pt-2">
                        +{cart.analytics.searchTerms.length - 5} pesquisas
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Categorias Visitadas */}
              {cart.analytics.categoriesVisited.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-3">
                    Categorias Visitadas ({cart.analytics.categoriesVisited.length})
                  </h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {cart.analytics.categoriesVisited.slice(0, 8).map((category, index) => (
                      <span 
                        key={index}
                        className="inline-block px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full"
                      >
                        {category.name} ({category.visits})
                      </span>
                    ))}
                    
                    {cart.analytics.categoriesVisited.length > 8 && (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                        +{cart.analytics.categoriesVisited.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Produtos Visualizados */}
              {cart.analytics.productsViewed.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Produtos Visualizados ({cart.analytics.productsViewed.length})
                  </h3>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cart.analytics.productsViewed.slice(0, 10).map((product, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="text-purple-800 font-medium truncate">
                            {product.name}
                          </div>
                          <div className="text-purple-600 text-xs">
                            {product.category}
                          </div>
                        </div>
                        <span className="text-purple-600 text-xs ml-2">
                          {product.visits}x
                        </span>
                      </div>
                    ))}
                    
                    {cart.analytics.productsViewed.length > 10 && (
                      <div className="text-xs text-purple-600 text-center pt-2">
                        +{cart.analytics.productsViewed.length - 10} produtos
                      </div>
                    )}
                  </div>
                </div>
              )}
              
            </div>
          </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
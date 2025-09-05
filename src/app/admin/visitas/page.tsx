'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Eye, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  X,
  ShoppingCart,
  Clock,
  Search,
  Users,
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVisitStore, formatCurrency, formatPhoneNumber } from '@/stores/useVisitStore'
import DateRangePicker from '@/components/admin/visits/DateRangePicker'
import PhoneSearchInput from '@/components/admin/visits/PhoneSearchInput'
import CartDetailsModal from '@/components/admin/visits/CartDetailsModal'

export default function VisitasPage() {
  const router = useRouter()
  const {
    visits,
    stats,
    pagination,
    filters,
    isLoading,
    selectedCart,
    setFilters,
    fetchVisits,
    fetchCartDetails,
    setSelectedCart,
    clearFilters
  } = useVisitStore()
  
  const [showFilters, setShowFilters] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  
  // Carregar dados iniciais
  useEffect(() => {
    fetchVisits()
    setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
  }, [])
  
  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchVisits(pagination.page)
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
    }, 30000)
    
    return () => clearInterval(interval)
  }, [autoRefresh, pagination.page])
  
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
  }
  
  const handleApplyFilters = () => {
    fetchVisits(1) // Resetar para primeira página
    setShowFilters(false)
  }
  
  const handleClearFilters = () => {
    clearFilters()
    setShowFilters(false)
  }
  
  const handlePageChange = (page: number) => {
    fetchVisits(page)
  }
  
  const handleViewCart = async (sessionId: string) => {
    await fetchCartDetails(sessionId)
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'finalizado': return <CheckCircle className="w-4 h-4" />
      case 'carrinho_ativo': return <ShoppingCart className="w-4 h-4" />
      case 'abandonado': return <AlertTriangle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }
  
  const getBadgeVariant = (color: string) => {
    switch (color) {
      case 'green': return 'default'
      case 'yellow': return 'secondary'
      case 'red': return 'destructive'
      default: return 'outline'
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Voltar
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tracking de Visitas</h1>
                <p className="text-sm text-gray-600">
                  Última atualização: {lastUpdate}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>
              
              <button
                onClick={() => {
                  fetchVisits(pagination.page)
                  setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-600">Total Visitas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-xs text-gray-600">Finalizadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  <p className="text-xs text-gray-600">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.abandoned}</p>
                  <p className="text-xs text-gray-600">Abandonadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <ShoppingCart className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.withCart}</p>
                  <p className="text-xs text-gray-600">Com Carrinho</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Eye className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.withPhone}</p>
                  <p className="text-xs text-gray-600">Com WhatsApp</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filtros */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {(filters.startDate || filters.endDate || filters.phone || filters.hasContact) && (
                <Badge variant="secondary" className="ml-2">
                  Ativos
                </Badge>
              )}
            </button>
            
            {(filters.startDate || filters.endDate || filters.phone || filters.hasContact) && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </button>
            )}
          </div>
          
          {showFilters && (
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DateRangePicker
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                  onStartDateChange={(date) => handleFilterChange({ startDate: date })}
                  onEndDateChange={(date) => handleFilterChange({ endDate: date })}
                />
                
                <PhoneSearchInput
                  value={filters.phone}
                  onChange={(phone) => handleFilterChange({ phone })}
                />
              </div>
              
              {/* Filtro Apenas com WhatsApp */}
              <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <button
                  onClick={() => handleFilterChange({ hasContact: !filters.hasContact })}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filters.hasContact 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Apenas com WhatsApp
                  {filters.hasContact && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>
                <span className="text-xs text-gray-500">
                  {filters.hasContact ? 'Mostrando apenas visitas com telefone' : 'Mostrando todas as visitas'}
                </span>
              </div>
            </div>
          )}
          
          {showFilters && (
            <div className="flex gap-3">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aplicar Filtros
              </button>
              
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
        
        {/* Tabela de Visitas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Visitas ({pagination.total})</span>
              <span className="text-sm font-normal text-gray-500">
                Página {pagination.page} de {pagination.totalPages}
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WhatsApp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tempo de Sessão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pesquisas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categorias
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status do Pedido
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Carregando visitas...
                      </td>
                    </tr>
                  ) : visits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>Nenhuma visita encontrada</p>
                        <p className="text-sm">Tente ajustar os filtros ou aguarde novas visitas</p>
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {visit.whatsapp}
                          </div>
                          <div className="text-xs text-gray-500">
                            {visit.startTime}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {visit.sessionTime}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {visit.searchTerms.slice(0, 3).map((term, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                "{term}"
                              </Badge>
                            ))}
                            {visit.searchTerms.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{visit.searchTerms.length - 3}
                              </Badge>
                            )}
                            {visit.searchTerms.length === 0 && (
                              <span className="text-xs text-gray-400">Nenhuma</span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {visit.categoriesVisited.slice(0, 2).map((category, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                            {visit.categoriesVisited.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{visit.categoriesVisited.length - 2}
                              </Badge>
                            )}
                            {visit.categoriesVisited.length === 0 && (
                              <span className="text-xs text-gray-400">Nenhuma</span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={getBadgeVariant(visit.orderStatus.color)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getStatusIcon(visit.orderStatus.status)}
                            {visit.orderStatus.label}
                          </Badge>
                          {visit.hasCart && visit.cartValue > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatCurrency(visit.cartValue)} ({visit.cartItems} itens)
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {visit.hasCart ? (
                            <button
                              onClick={() => handleViewCart(visit.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Carrinho
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Sem carrinho</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Mostrando página {pagination.page} de {pagination.totalPages} 
                  ({pagination.total} visitas no total)
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      const isActive = pageNum === pagination.page
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            isActive 
                              ? 'bg-blue-600 text-white' 
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Modal de Detalhes do Carrinho */}
      <CartDetailsModal
        cart={selectedCart}
        isOpen={!!selectedCart}
        onClose={() => setSelectedCart(null)}
      />
    </div>
  )
}
import { useEffect, useCallback } from 'react'
import { useCartStore } from '@/stores/useCartStore'

export function useCartSync() {
  const { loadFromServer, syncToServer, isLoading, lastSyncTimestamp } = useCartStore()

  // Carregar carrinho do servidor quando componente montar
  const initializeCart = useCallback(async () => {
    console.log('🔄 CartSync: Inicializando sincronização...')
    try {
      await loadFromServer()
      console.log('✅ CartSync: Carrinho carregado do servidor')
    } catch (error) {
      console.warn('⚠️ CartSync: Erro ao carregar carrinho:', error)
    }
  }, [loadFromServer])

  // Effect para inicialização
  useEffect(() => {
    // Só executar se não houver sincronização recente (5 minutos)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const shouldSync = !lastSyncTimestamp || lastSyncTimestamp < fiveMinutesAgo

    if (shouldSync) {
      initializeCart()
    } else {
      console.log('🔄 CartSync: Sincronização recente encontrada, pulando inicialização')
    }
  }, [initializeCart, lastSyncTimestamp])

  // Função para forçar sincronização manual
  const forceSync = useCallback(async () => {
    console.log('🔄 CartSync: Sincronização forçada solicitada...')
    await initializeCart()
  }, [initializeCart])

  // Função para sincronizar carrinho para o servidor
  const forceSyncToServer = useCallback(async () => {
    console.log('🔄 CartSync: Forçando sincronização para servidor...')
    try {
      await syncToServer()
      console.log('✅ CartSync: Carrinho sincronizado para servidor')
    } catch (error) {
      console.error('❌ CartSync: Erro ao sincronizar para servidor:', error)
    }
  }, [syncToServer])

  return {
    isLoading,
    forceSync,
    forceSyncToServer,
    lastSyncTimestamp
  }
}
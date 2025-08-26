'use client'

import React, { useEffect, useRef } from 'react'
import { useAnalytics } from '@/lib/analytics'

interface AnalyticsProviderProps {
  children: React.ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const analytics = useAnalytics()
  const saveInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    console.log('📊 AnalyticsProvider: Inicializando tracking global')
    
    // Garantir que o analytics esteja inicializado
    if (analytics) {
      console.log('📊 AnalyticsProvider: Analytics instance criada:', analytics.getSessionId())
      
      // Salvar visita inicial imediatamente
      const saveInitialVisit = () => {
        if (typeof window !== 'undefined') {
          const sessionId = analytics.getSessionId()
          const analyticsData = analytics.getAnalytics()
          
          const initialPayload = {
            sessionId,
            whatsapp: analyticsData.whatsappCollected,
            searchTerms: [],
            categoriesVisited: [],
            productsViewed: [],
            cartData: {
              hasCart: false,
              cartValue: 0,
              cartItems: 0
            },
            status: 'active',
            whatsappCollectedAt: null
          }
          
          fetch('/api/visits/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(initialPayload)
          })
          .then(response => {
            if (response.ok) {
              console.log('📊 AnalyticsProvider: Visita inicial salva com sucesso')
            }
          })
          .catch(error => {
            console.warn('📊 AnalyticsProvider: Erro ao salvar visita inicial:', error.message)
          })
        }
      }
      
      // Salvar imediatamente
      setTimeout(saveInitialVisit, 1000) // Aguardar 1 segundo para garantir que tudo foi carregado
      
      // Auto-save a cada 30 segundos
      saveInterval.current = setInterval(() => {
        // Salvar dados de visita no servidor
        if (typeof window !== 'undefined') {
          const sessionId = analytics.getSessionId()
          const analyticsData = analytics.getAnalytics()
          
          // Verificar se há carrinho
          const cartStore = localStorage.getItem('cart-storage')
          const cartData = cartStore ? JSON.parse(cartStore) : null
          const hasCart = cartData?.state?.items?.length > 0 || cartData?.items?.length > 0
          
          let cartValue = 0
          let cartItems = 0
          
          if (hasCart) {
            const items = cartData?.state?.items || cartData?.items || []
            cartItems = items.length
            cartValue = items.reduce((total: number, item: any) => {
              return total + (item.unitPrice || 0) * (item.quantity || 0)
            }, 0)
          }
          
          const trackingPayload = {
            sessionId,
            whatsapp: analyticsData.whatsappCollected,
            searchTerms: analyticsData.searchTerms.map((s: any) => s.term),
            categoriesVisited: analyticsData.categoriesVisited,
            productsViewed: analyticsData.productsViewed,
            cartData: {
              hasCart,
              cartValue,
              cartItems
            },
            status: 'active', // Visitas sempre começam ativas
            whatsappCollectedAt: analyticsData.whatsappCollectedAt
          }
          
          // Salvar no servidor
          fetch('/api/visits/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(trackingPayload)
          })
          .then(response => {
            if (response.ok) {
              console.log('📊 AnalyticsProvider: Auto-save realizado com sucesso')
            }
          })
          .catch(error => {
            console.warn('📊 AnalyticsProvider: Erro no auto-save:', error.message)
          })
        }
      }, 30000) // 30 segundos
      
      console.log('📊 AnalyticsProvider: Auto-save configurado para 30s')
    }
    
    // Cleanup
    return () => {
      if (saveInterval.current) {
        clearInterval(saveInterval.current)
        console.log('📊 AnalyticsProvider: Auto-save limpo')
      }
    }
  }, [analytics])

  return <>{children}</>
}
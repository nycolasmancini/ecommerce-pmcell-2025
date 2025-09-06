// Sistema de Analytics para tracking de comportamento do usuário
import { analyticsLogger } from './analytics-logger'

export interface UserAnalytics {
  sessionId: string
  startTime: number
  lastActivity: number
  timeOnSite: number
  categoriesVisited: Array<{
    name: string
    visits: number
    lastVisit: number
  }>
  searchTerms: Array<{
    term: string
    count: number
    lastSearch: number
  }>
  productsViewed: Array<{
    id: string
    name: string
    category: string
    visits: number
    lastView: number
  }>
  cartEvents: Array<{
    type: 'add' | 'remove' | 'update'
    productId: string
    quantity: number
    timestamp: number
  }>
  lastCartActivity: number
  whatsappCollected: string | null
  whatsappCollectedAt: number | null
}

class Analytics {
  private analytics: UserAnalytics
  private storageKey = 'pmcell_analytics'
  private cartAbandonTimer: NodeJS.Timeout | null = null
  private readonly CART_ABANDON_TIME = 1 * 60 * 1000 // 1 minuto para testes (era 30 minutos)

  constructor() {
    this.analytics = this.loadAnalytics()
    this.updateLastActivity()
    
    // Verificar se há carrinho abandonado antes de configurar timer
    this.checkForAbandonedCart()
    this.setupCartAbandonTimer()
    
    // Salvar visita inicial no servidor (apenas no primeiro acesso)
    this.saveInitialVisit()
  }

  private saveInitialVisit(): void {
    // Salvar apenas se for uma nova sessão (sem dados salvos anteriormente)
    if (typeof window !== 'undefined') {
      const hasVisitBeenSaved = localStorage.getItem(`${this.storageKey}_visit_saved`)
      
      if (!hasVisitBeenSaved) {
        // Marcar como salva para não duplicar
        localStorage.setItem(`${this.storageKey}_visit_saved`, 'true')
        
        // Aguardar um pouco para garantir que tudo foi inicializado
        setTimeout(() => {
          this.saveVisitToServer()
          console.log('📊 Analytics: Visita inicial salva automaticamente')
        }, 2000)
      }
    }
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private loadAnalytics(): UserAnalytics {
    if (typeof window === 'undefined') {
      return this.createNewSession()
    }

    const stored = localStorage.getItem(this.storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Se a sessão é muito antiga (mais de 24h), criar nova
      if (Date.now() - parsed.lastActivity > 24 * 60 * 60 * 1000) {
        // Limpar flag de visita salva para nova sessão
        localStorage.removeItem(`${this.storageKey}_visit_saved`)
        return this.createNewSession()
      }
      return parsed
    }
    
    // Limpar flag de visita salva para nova sessão
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${this.storageKey}_visit_saved`)
    }
    return this.createNewSession()
  }

  private createNewSession(): UserAnalytics {
    return {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      timeOnSite: 0,
      categoriesVisited: [],
      searchTerms: [],
      productsViewed: [],
      cartEvents: [],
      lastCartActivity: 0,
      whatsappCollected: null,
      whatsappCollectedAt: null
    }
  }

  private saveAnalytics(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.analytics))
    }
  }

  private updateLastActivity(): void {
    this.analytics.lastActivity = Date.now()
    this.analytics.timeOnSite = Date.now() - this.analytics.startTime
    this.saveAnalytics()
  }

  // Verificar se há carrinho abandonado ao inicializar
  private checkForAbandonedCart(): void {
    if (typeof window === 'undefined') return

    try {
      // Verificar se há carrinho no localStorage
      const cartStore = localStorage.getItem('cart-storage')
      if (!cartStore) return

      const cart = JSON.parse(cartStore)
      if (!cart.state?.items?.length) return

      // Verificar se há atividade de carrinho registrada
      if (this.analytics.lastCartActivity === 0) return

      const timeSinceLastCart = Date.now() - this.analytics.lastCartActivity
      console.log(`🛒 Analytics: Verificando carrinho abandonado - tempo desde última atividade: ${Math.round(timeSinceLastCart / 1000)}s`)

      // Se passou do tempo limite, considerar como abandonado
      if (timeSinceLastCart >= this.CART_ABANDON_TIME) {
        console.log(`🛒 Analytics: Carrinho abandonado detectado! (${Math.round(timeSinceLastCart / 1000)}s > ${Math.round(this.CART_ABANDON_TIME / 1000)}s)`)
        console.log('🛒 Analytics: Enviando webhook de carrinho abandonado imediatamente')
        
        // Enviar webhook imediatamente
        this.sendCartAbandonedWebhook()
        
        // Resetar a atividade para evitar múltiplos envios
        this.analytics.lastCartActivity = 0
        this.saveAnalytics()
      } else {
        console.log(`🛒 Analytics: Carrinho ainda não abandonado (${Math.round(timeSinceLastCart / 1000)}s < ${Math.round(this.CART_ABANDON_TIME / 1000)}s)`)
      }
    } catch (error) {
      console.error('❌ Erro ao verificar carrinho abandonado:', error)
    }
  }

  // Setup timer para carrinho abandonado
  private setupCartAbandonTimer(): void {
    if (this.cartAbandonTimer) {
      clearTimeout(this.cartAbandonTimer)
    }

    if (this.analytics.lastCartActivity > 0) {
      const timeSinceLastCart = Date.now() - this.analytics.lastCartActivity
      const remainingTime = this.CART_ABANDON_TIME - timeSinceLastCart

      console.log(`🛒 Analytics: Configurando timer de abandono - tempo restante: ${Math.round(remainingTime / 1000)}s`)

      if (remainingTime > 0) {
        this.cartAbandonTimer = setTimeout(() => {
          console.log('🛒 Analytics: Timer de carrinho abandonado disparado!')
          this.sendCartAbandonedWebhook()
          
          // Resetar a atividade após enviar
          this.analytics.lastCartActivity = 0
          this.saveAnalytics()
        }, remainingTime)
        
        console.log(`🛒 Analytics: Timer configurado para ${Math.round(remainingTime / 1000)}s`)
      } else {
        console.log('🛒 Analytics: Tempo já expirado, não configurando timer')
      }
    } else {
      console.log('🛒 Analytics: Sem atividade de carrinho, não configurando timer')
    }
  }

  // Tracking de categoria visitada
  trackCategoryVisit(categoryName: string): void {
    this.updateLastActivity()
    
    const existing = this.analytics.categoriesVisited.find(c => c.name === categoryName)
    if (existing) {
      existing.visits++
      existing.lastVisit = Date.now()
    } else {
      this.analytics.categoriesVisited.push({
        name: categoryName,
        visits: 1,
        lastVisit: Date.now()
      })
    }

    // Ordenar por número de visitas
    this.analytics.categoriesVisited.sort((a, b) => b.visits - a.visits)
    this.saveAnalytics()
    
    // Salvar visita no servidor quando categoria for visitada
    this.saveVisitToServer()
  }

  // Tracking de busca
  trackSearch(searchTerm: string): void {
    this.updateLastActivity()
    
    const term = searchTerm.toLowerCase().trim()
    if (!term) return

    const existing = this.analytics.searchTerms.find(s => s.term === term)
    if (existing) {
      existing.count++
      existing.lastSearch = Date.now()
    } else {
      this.analytics.searchTerms.push({
        term,
        count: 1,
        lastSearch: Date.now()
      })
    }

    // Ordenar por frequência
    this.analytics.searchTerms.sort((a, b) => b.count - a.count)
    this.saveAnalytics()
    
    // Salvar visita no servidor quando busca for realizada
    this.saveVisitToServer()
  }

  // Tracking de produto visualizado
  trackProductView(productId: string, productName: string, category: string): void {
    this.updateLastActivity()
    
    const existing = this.analytics.productsViewed.find(p => p.id === productId)
    if (existing) {
      existing.visits++
      existing.lastView = Date.now()
    } else {
      this.analytics.productsViewed.push({
        id: productId,
        name: productName,
        category,
        visits: 1,
        lastView: Date.now()
      })
    }

    // Manter apenas os 50 produtos mais visualizados
    this.analytics.productsViewed.sort((a, b) => b.visits - a.visits)
    this.analytics.productsViewed = this.analytics.productsViewed.slice(0, 50)
    this.saveAnalytics()
    
    // Salvar visita no servidor quando produto for visualizado
    this.saveVisitToServer()
  }

  // Tracking de eventos do carrinho
  trackCartEvent(type: 'add' | 'remove' | 'update', productId: string, quantity: number): void {
    console.log(`🛒 Analytics: trackCartEvent chamado - type: ${type}, productId: ${productId}, quantity: ${quantity}`)
    
    this.updateLastActivity()
    
    const timestamp = Date.now()
    this.analytics.cartEvents.push({
      type,
      productId,
      quantity,
      timestamp
    })

    this.analytics.lastCartActivity = timestamp
    console.log(`🛒 Analytics: lastCartActivity atualizado para: ${timestamp} (${new Date(timestamp).toLocaleTimeString()})`)

    // Manter apenas os 100 últimos eventos
    this.analytics.cartEvents = this.analytics.cartEvents.slice(-100)
    
    this.saveAnalytics()
    console.log(`🛒 Analytics: Dados salvos no localStorage, configurando timer...`)
    this.setupCartAbandonTimer()
    
    // Salvar também no servidor para rastreamento server-side
    this.saveCartToServer()
  }

  // Método para salvar carrinho no servidor
  private saveCartToServer(): void {
    if (typeof window === 'undefined') return

    try {
      // Buscar dados do carrinho no localStorage
      const cartStore = localStorage.getItem('cart-storage')
      
      if (!cartStore) {
        console.log('🛒 Analytics: Sem dados de carrinho para salvar no servidor')
        return
      }

      const parsedCartStore = JSON.parse(cartStore)
      // Zustand persist wrapper - pegar state se existir
      const cartState = parsedCartStore.state || parsedCartStore
      
      // Validar e normalizar dados do carrinho
      if (!cartState.items || !Array.isArray(cartState.items)) {
        console.log('🛒 Analytics: Formato de carrinho inválido')
        return
      }
      
      // Preparar dados normalizados do carrinho
      const normalizedCart = {
        items: cartState.items.map((item: any) => ({
          id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId: item.productId || item.id || 'unknown',
          name: item.name || 'Produto sem nome',
          modelName: item.modelName,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0
        })),
        total: cartState.items.reduce((sum: number, item: any) => 
          sum + ((item.quantity || 1) * (item.unitPrice || 0)), 0
        )
      }
      
      const payload = {
        sessionId: this.analytics.sessionId,
        whatsapp: this.analytics.whatsappCollected,
        cartData: normalizedCart,
        analyticsData: this.getAnalyticsSnapshot(),
        lastActivity: this.analytics.lastCartActivity
      }

      console.log('🛒 Analytics: Enviando carrinho normalizado para servidor:', {
        sessionId: payload.sessionId,
        itemsCount: normalizedCart.items.length,
        total: normalizedCart.total
      })

      // Salvar no servidor de forma assíncrona (não bloquear UI)
      fetch('/api/cart/simple-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (response.ok) {
          console.log('🛒 Analytics: Carrinho salvo no servidor com sucesso')
        } else {
          console.warn('🛒 Analytics: Erro ao salvar carrinho no servidor:', response.status)
        }
      })
      .catch(error => {
        console.warn('🛒 Analytics: Falha na requisição para salvar carrinho:', error.message)
      })

      // Também salvar dados de visita para tracking
      this.saveVisitToServer()

    } catch (error) {
      console.warn('🛒 Analytics: Erro ao preparar dados para servidor:', error)
    }
  }

  // Método para salvar dados de visita no servidor
  private saveVisitToServer(): void {
    this.saveVisitToServerWithStatus()
  }

  // Método para salvar dados de visita no servidor com status específico
  private saveVisitToServerWithStatus(forceStatus?: 'active' | 'abandoned' | 'completed'): void {
    if (typeof window === 'undefined') return

    try {
      // Buscar dados do carrinho para determinar status
      const cartStore = localStorage.getItem('cart-storage')
      const cartData = cartStore ? JSON.parse(cartStore) : null
      const hasCart = cartData?.state?.items?.length > 0 || cartData?.items?.length > 0
      
      // Calcular valor do carrinho
      let cartValue = 0
      let cartItems = 0
      
      if (hasCart) {
        const items = cartData?.state?.items || cartData?.items || []
        cartItems = items.length
        cartValue = items.reduce((total: number, item: any) => {
          return total + (item.unitPrice || 0) * (item.quantity || 0)
        }, 0)
      }

      // Determinar status
      let status: 'active' | 'abandoned' | 'completed' = 'active'
      if (forceStatus) {
        status = forceStatus
      }
      // Status sempre ativo para tracking em tempo real
      // Abandonado só quando forçado pelo webhook system

      const trackingPayload = {
        sessionId: this.analytics.sessionId,
        whatsapp: this.analytics.whatsappCollected,
        searchTerms: this.analytics.searchTerms.map(s => s.term),
        categoriesVisited: this.analytics.categoriesVisited,
        productsViewed: this.analytics.productsViewed,
        cartData: {
          hasCart,
          cartValue,
          cartItems
        },
        status,
        whatsappCollectedAt: this.analytics.whatsappCollectedAt
      }

      // Salvar dados de visita
      fetch('/api/visits/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trackingPayload)
      })
      .then(response => {
        if (response.ok) {
          console.log(`📊 Analytics: Dados de visita salvos no servidor (status: ${status})`)
        } else {
          console.warn('📊 Analytics: Erro ao salvar dados de visita:', response.status)
        }
      })
      .catch(error => {
        console.warn('📊 Analytics: Falha ao salvar dados de visita:', error.message)
      })

    } catch (error) {
      console.warn('📊 Analytics: Erro ao preparar dados de visita:', error)
    }
  }

  // Método para marcar carrinho como concluído (pedido finalizado)
  private markCartAsCompleted(): void {
    if (typeof window === 'undefined') return

    try {
      const sessionId = this.analytics.sessionId
      
      console.log('🛒 Analytics: Marcando carrinho como concluído:', sessionId)
      
      // Enviar requisição para marcar como contatado/concluído
      fetch('/api/admin/carts/mark-contacted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          sessionId, 
          contacted: true 
        })
      })
      .then(response => {
        if (response.ok) {
          console.log('✅ Analytics: Carrinho marcado como concluído com sucesso')
        } else {
          console.warn('⚠️ Analytics: Erro ao marcar carrinho como concluído:', response.status)
        }
      })
      .catch(error => {
        console.warn('⚠️ Analytics: Falha ao marcar carrinho como concluído:', error.message)
      })

    } catch (error) {
      console.warn('⚠️ Analytics: Erro ao marcar carrinho como concluído:', error)
    }
  }

  // Coleta de WhatsApp
  trackWhatsAppCollection(whatsapp: string): void {
    console.log('📞 Analytics: WhatsApp coletado:', whatsapp)
    console.log('📞 Analytics: Ambiente atual:', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'servidor',
      port: typeof window !== 'undefined' ? window.location.port : 'N/A',
      sessionId: this.analytics.sessionId
    })
    this.updateLastActivity()
    
    this.analytics.whatsappCollected = whatsapp
    this.analytics.whatsappCollectedAt = Date.now()
    this.saveAnalytics()
    
    console.log('📞 Analytics: Dados salvos, enviando webhook WhatsApp...')
    this.sendWhatsAppCollectedWebhook()
    
    // Salvar dados de visita quando WhatsApp for coletado
    this.saveVisitToServer()
  }

  // Finalização de pedido
  trackOrderCompletion(orderData: any): void {
    console.log('🛒 Analytics: Pedido finalizado recebido:', orderData)
    console.log('🛒 Analytics: Ambiente atual:', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'servidor',
      port: typeof window !== 'undefined' ? window.location.port : 'N/A',
      sessionId: this.analytics.sessionId,
      whatsappColetado: this.analytics.whatsappCollected
    })
    this.updateLastActivity()
    
    // Limpar timer de carrinho abandonado
    if (this.cartAbandonTimer) {
      clearTimeout(this.cartAbandonTimer)
      this.cartAbandonTimer = null
      console.log('🛒 Analytics: Timer de carrinho abandonado limpo')
    }
    
    console.log('🛒 Analytics: Enviando webhook de pedido finalizado...')
    this.sendOrderCompletedWebhook(orderData)
    
    // Marcar carrinho como concluído no servidor
    this.markCartAsCompleted()
    
    // Salvar dados de visita como finalizada
    this.saveVisitToServerWithStatus('completed')
  }

  // Função auxiliar para remover imagens dos itens do carrinho (para webhooks mais leves)
  private removeImagesFromCartItems(cartItems: any[]): any[] {
    if (!Array.isArray(cartItems)) return []
    
    return cartItems.map(item => {
      const { image, ...itemWithoutImage } = item
      return itemWithoutImage
    })
  }

  // Webhooks
  private async sendWebhook(eventType: string, data: any, maxRetries: number = 2): Promise<void> {
    let retryCount = 0
    
    while (retryCount <= maxRetries) {
      try {
        const settings = await this.getWebhookSettings()
        console.log('🔧 Configurações de webhook:', settings)
        
        const webhookConfig = settings[eventType as keyof typeof settings]
        console.log(`🔧 Config do webhook ${eventType}:`, webhookConfig)
        
        if (!webhookConfig?.enabled) {
          console.log(`⚠️ Webhook ${eventType} não está habilitado`)
          return
        }

        const baseUrl = webhookConfig.environment === 'production' 
          ? 'https://n8n.pmcell.shop/webhook/'
          : 'https://n8n.pmcell.shop/webhook-test/'

        const fullUrl = baseUrl + eventType
        console.log(`🚀 Enviando webhook para: ${fullUrl} (tentativa ${retryCount + 1}/${maxRetries + 1})`)

        const payload = {
          event: eventType,
          timestamp: new Date().toISOString(),
          user: {
            whatsapp: this.analytics.whatsappCollected,
            sessionId: this.analytics.sessionId
          },
          analytics: this.getAnalyticsSnapshot(),
          data
        }

        console.log('📦 Payload do webhook:', payload)

        // Criar controller para timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

        try {
          // Enviar webhook para N8N com timeout e configurações para CORS
          const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': window.location.origin
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
            mode: 'cors'
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            console.log(`✅ Webhook enviado com sucesso! Status: ${response.status}`)
            this.logWebhook(eventType, webhookConfig.environment, fullUrl)
            return // Sucesso - sair da função
          } else {
            console.error(`❌ Erro ao enviar webhook! Status: ${response.status}`)
            throw new Error(`HTTP ${response.status}`)
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          
          if (fetchError.name === 'AbortError') {
            throw new Error('Timeout - webhook demorou mais de 10 segundos')
          } else if (fetchError.message.includes('CORS') || fetchError.message.includes('network')) {
            throw new Error(`Erro de rede/CORS: ${fetchError.message}`)
          } else {
            throw fetchError
          }
        }
      } catch (error: any) {
        console.error(`❌ Erro ao enviar webhook (tentativa ${retryCount + 1}):`, error.message)
        
        retryCount++
        
        if (retryCount <= maxRetries) {
          console.log(`🔄 Tentando novamente em 2 segundos... (${retryCount}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 2000)) // Aguardar 2 segundos
        } else {
          console.error(`❌ Webhook ${eventType} falhou após ${maxRetries + 1} tentativas:`, error.message)
          console.log(`⚠️ Continuando sem enviar webhook - isso não afeta o funcionamento da aplicação`)
          return
        }
      }
    }
  }

  private sendWhatsAppCollectedWebhook(): void {
    this.sendWebhook('whatsappCollected', {
      whatsapp: this.analytics.whatsappCollected,
      collectedAt: this.analytics.whatsappCollectedAt
    })
  }

  private sendOrderCompletedWebhook(orderData: any): void {
    // Remover imagens dos itens se existirem
    let filteredOrderData = { ...orderData }
    if (filteredOrderData.items && Array.isArray(filteredOrderData.items)) {
      filteredOrderData.items = this.removeImagesFromCartItems(filteredOrderData.items)
    }
    
    this.sendWebhook('orderCompleted', filteredOrderData)
  }

  private sendCartAbandonedWebhook(): void {
    console.log('🛒 Analytics: sendCartAbandonedWebhook chamado')
    
    // Verificar se há itens no carrinho
    if (typeof window !== 'undefined') {
      const cartStore = localStorage.getItem('cart-storage')
      console.log('🛒 Analytics: Verificando carrinho no localStorage:', cartStore ? 'encontrado' : 'não encontrado')
      
      if (cartStore) {
        try {
          const cart = JSON.parse(cartStore)
          console.log('🛒 Analytics: Dados do carrinho:', {
            hasState: !!cart.state,
            itemsLength: cart.state?.items?.length || 0
          })
          
          if (cart.state?.items?.length > 0) {
            const webhookData = {
              cartItems: this.removeImagesFromCartItems(cart.state.items),
              abandonedAt: Date.now(),
              timeSinceLastActivity: this.analytics.lastCartActivity > 0 ? Date.now() - this.analytics.lastCartActivity : 0,
              sessionId: this.analytics.sessionId,
              whatsappCollected: this.analytics.whatsappCollected
            }
            
            console.log('🛒 Analytics: Enviando webhook de carrinho abandonado com dados:', webhookData)
            this.sendWebhook('cartAbandoned', webhookData)
          } else {
            console.log('🛒 Analytics: Carrinho vazio, não enviando webhook')
          }
        } catch (error) {
          console.error('❌ Erro ao processar dados do carrinho:', error)
        }
      } else {
        console.log('🛒 Analytics: Sem dados de carrinho no localStorage')
      }
    } else {
      console.log('🛒 Analytics: Não está no browser, não pode acessar localStorage')
    }
  }

  private async getWebhookSettings(): Promise<any> {
    try {
      // Detectar ambiente mais robustamente
      const currentHostname = window.location.hostname
      const currentPort = window.location.port
      const currentProtocol = window.location.protocol
      
      // Verificar variável de ambiente NODE_ENV se disponível
      const nodeEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : 'production'
      
      const isDevelopment = currentHostname === 'localhost' || 
                           currentHostname === '127.0.0.1' ||
                           currentPort === '3000' ||
                           currentPort === '3001' ||
                           nodeEnv === 'development'
      
      const isProduction = !isDevelopment
      
      console.log(`🔧 Detecção de ambiente: hostname=${currentHostname}, port=${currentPort}, protocol=${currentProtocol}, NODE_ENV=${nodeEnv}`)
      console.log(`🔧 Ambiente detectado: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`)
      
      // Sempre buscar configurações da API primeiro
      try {
        const response = await fetch('/api/webhook-settings')
        if (response.ok) {
          const dbSettings = await response.json()
          console.log('🔧 Configurações recebidas da API:', dbSettings)
          
          // Converter formato do banco para o formato esperado
          const settings: any = {}
          dbSettings.forEach((setting: any) => {
            settings[setting.webhookType] = {
              enabled: setting.enabled,
              environment: setting.environment.toLowerCase()
            }
          })
          
          console.log('🔧 Configurações convertidas:', settings)
          
          // Em desenvolvimento, respeitar configurações do banco
          if (isDevelopment) {
            console.log('🔧 [DESENVOLVIMENTO] Usando configurações do banco/arquivo')
            return settings
          }
          
          // Em produção, usar configurações do banco mas garantir que estão ativas se marcadas como PRODUCTION
          if (isProduction) {
            console.log('🔧 [PRODUÇÃO] Aplicando configurações de produção')
            const productionSettings: any = {}
            Object.keys(settings).forEach(key => {
              const setting = settings[key]
              productionSettings[key] = {
                enabled: setting.enabled && setting.environment === 'production',
                environment: setting.environment
              }
            })
            
            console.log('🔧 [PRODUÇÃO] Configurações finais:', productionSettings)
            return productionSettings
          }
          
          return settings
        }
      } catch (apiError) {
        console.warn('⚠️ Erro ao buscar configurações da API:', apiError)
      }
      
      // Fallback baseado no ambiente
      if (isDevelopment) {
        console.log('🔧 [DESENVOLVIMENTO] Usando fallback - webhooks desabilitados')
        return {
          whatsappCollected: { enabled: false, environment: 'test' },
          orderCompleted: { enabled: false, environment: 'test' },
          cartAbandoned: { enabled: false, environment: 'test' },
          analyticsUpdate: { enabled: false, environment: 'test' }
        }
      } else {
        console.log('🔧 [PRODUÇÃO] Usando fallback - webhooks ativos')
        return {
          whatsappCollected: { enabled: true, environment: 'production' },
          orderCompleted: { enabled: true, environment: 'production' },
          cartAbandoned: { enabled: true, environment: 'production' },
          analyticsUpdate: { enabled: true, environment: 'production' }
        }
      }
      
    } catch (error) {
      console.error('❌ Erro crítico ao buscar configurações de webhook:', error)
      
      // Fallback de emergência baseado no hostname
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1'
      
      if (isLocalhost) {
        console.log('🚨 [EMERGÊNCIA] Ambiente local detectado - webhooks desabilitados')
        return {
          whatsappCollected: { enabled: false, environment: 'test' },
          orderCompleted: { enabled: false, environment: 'test' },
          cartAbandoned: { enabled: false, environment: 'test' },
          analyticsUpdate: { enabled: false, environment: 'test' }
        }
      } else {
        console.log('🚨 [EMERGÊNCIA] Ambiente remoto detectado - webhooks ativos')
        return {
          whatsappCollected: { enabled: true, environment: 'production' },
          orderCompleted: { enabled: true, environment: 'production' },
          cartAbandoned: { enabled: true, environment: 'production' },
          analyticsUpdate: { enabled: true, environment: 'production' }
        }
      }
    }
  }

  private logWebhook(webhook: string, environment: string, url: string): void {
    if (typeof window === 'undefined') return

    const logs = JSON.parse(localStorage.getItem('webhookLogs') || '[]')
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      webhook,
      environment,
      status: 'success',
      url
    }
    
    const updatedLogs = [newLog, ...logs].slice(0, 50)
    localStorage.setItem('webhookLogs', JSON.stringify(updatedLogs))
  }

  private getAnalyticsSnapshot() {
    return {
      sessionId: this.analytics.sessionId,
      timeOnSite: Math.floor((Date.now() - this.analytics.startTime) / 1000), // em segundos
      categoriesVisited: this.analytics.categoriesVisited,
      searchTerms: this.analytics.searchTerms,
      productsViewed: this.analytics.productsViewed.slice(0, 10), // Top 10 mais visualizados
      totalCartEvents: this.analytics.cartEvents.length,
      lastCartActivity: this.analytics.lastCartActivity,
      whatsappCollected: this.analytics.whatsappCollected,
      whatsappCollectedAt: this.analytics.whatsappCollectedAt
    }
  }

  // Getters públicos
  getAnalytics(): UserAnalytics {
    return { ...this.analytics }
  }

  getSessionId(): string {
    return this.analytics.sessionId
  }

  getSnapshot() {
    return this.getAnalyticsSnapshot()
  }

  getTopCategories(limit: number = 5) {
    return this.analytics.categoriesVisited.slice(0, limit)
  }

  getTopSearches(limit: number = 5) {
    return this.analytics.searchTerms.slice(0, limit)
  }

  getTopProducts(limit: number = 5) {
    return this.analytics.productsViewed.slice(0, limit)
  }
}

// Função global para verificar carrinho abandonado (independente do singleton)
export const checkAbandonedCartGlobal = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  try {
    // Verificar se há carrinho no localStorage
    const cartStore = localStorage.getItem('cart-storage')
    if (!cartStore) {
      console.log('🛒 Global Check: Sem dados de carrinho')
      return false
    }

    const cart = JSON.parse(cartStore)
    if (!cart.state?.items?.length) {
      console.log('🛒 Global Check: Carrinho vazio')
      return false
    }

    // Verificar analytics
    const analyticsStore = localStorage.getItem('pmcell_analytics')
    if (!analyticsStore) {
      console.log('🛒 Global Check: Sem dados de analytics')
      return false
    }

    const analytics = JSON.parse(analyticsStore)
    if (analytics.lastCartActivity === 0) {
      console.log('🛒 Global Check: Sem atividade de carrinho registrada')
      return false
    }

    const CART_ABANDON_TIME = 1 * 60 * 1000 // 1 minuto
    const timeSinceLastCart = Date.now() - analytics.lastCartActivity
    
    console.log(`🛒 Global Check: Tempo desde última atividade: ${Math.round(timeSinceLastCart / 1000)}s`)
    
    if (timeSinceLastCart >= CART_ABANDON_TIME) {
      console.log(`🛒 Global Check: CARRINHO ABANDONADO DETECTADO! (${Math.round(timeSinceLastCart / 1000)}s >= ${Math.round(CART_ABANDON_TIME / 1000)}s)`)
      
      // Buscar configurações de webhook
      try {
        const response = await fetch('/api/webhook-settings')
        if (!response.ok) {
          console.error('🛒 Global Check: Erro ao buscar configurações de webhook')
          return false
        }

        const settings = await response.json()
        const cartSetting = settings.find((s: any) => s.webhookType === 'cartAbandoned')
        
        if (!cartSetting?.enabled) {
          console.log('🛒 Global Check: Webhook cartAbandoned não está habilitado')
          return false
        }

        // Função auxiliar para remover imagens dos itens (mesma lógica da classe)
        const removeImagesFromItems = (items: any[]): any[] => {
          if (!Array.isArray(items)) return []
          return items.map(item => {
            const { image, ...itemWithoutImage } = item
            return itemWithoutImage
          })
        }

        // Preparar dados do webhook
        const webhookData = {
          event: 'cartAbandoned',
          timestamp: new Date().toISOString(),
          user: {
            whatsapp: analytics.whatsappCollected,
            sessionId: analytics.sessionId
          },
          analytics: {
            sessionId: analytics.sessionId,
            timeOnSite: Math.floor(timeSinceLastCart / 1000),
            categoriesVisited: analytics.categoriesVisited || [],
            searchTerms: analytics.searchTerms || [],
            productsViewed: analytics.productsViewed || [],
            totalCartEvents: analytics.cartEvents?.length || 0,
            lastCartActivity: analytics.lastCartActivity
          },
          data: {
            cartItems: removeImagesFromItems(cart.state.items),
            abandonedAt: Date.now(),
            timeSinceLastActivity: timeSinceLastCart,
            sessionId: analytics.sessionId,
            whatsappCollected: analytics.whatsappCollected
          }
        }

        // Enviar webhook
        const webhookUrl = cartSetting.environment === 'PRODUCTION' 
          ? 'https://n8n.pmcell.shop/webhook/cartAbandoned'
          : 'https://n8n.pmcell.shop/webhook-test/cartAbandoned'

        console.log(`🛒 Global Check: Enviando webhook para: ${webhookUrl}`)
        
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(webhookData)
        })

        if (webhookResponse.ok) {
          console.log(`✅ Global Check: Webhook enviado com sucesso! Status: ${webhookResponse.status}`)
          
          // Resetar lastCartActivity para evitar múltiplos envios
          analytics.lastCartActivity = 0
          localStorage.setItem('pmcell_analytics', JSON.stringify(analytics))
          
          return true
        } else {
          console.error(`❌ Global Check: Erro ao enviar webhook! Status: ${webhookResponse.status}`)
          return false
        }
        
      } catch (webhookError) {
        console.error('❌ Global Check: Erro no webhook:', webhookError)
        return false
      }
    } else {
      console.log(`🛒 Global Check: Carrinho ainda não abandonado (${Math.round(timeSinceLastCart / 1000)}s < ${Math.round(CART_ABANDON_TIME / 1000)}s)`)
      return false
    }
  } catch (error) {
    console.error('❌ Global Check: Erro na verificação:', error)
    return false
  }
}

// Função para iniciar verificação periódica
let periodicCheckInterval: NodeJS.Timeout | null = null

export const startPeriodicAbandonmentCheck = (): void => {
  if (typeof window === 'undefined') return
  
  // Limpar intervalo anterior se existir
  if (periodicCheckInterval) {
    clearInterval(periodicCheckInterval)
  }
  
  console.log('🔄 Iniciando verificação periódica de carrinho abandonado (30s)')
  
  // Verificar imediatamente
  checkAbandonedCartGlobal()
  
  // Verificar a cada 30 segundos
  periodicCheckInterval = setInterval(() => {
    checkAbandonedCartGlobal()
  }, 30000) // 30 segundos
}

// Singleton instance
let analyticsInstance: Analytics | null = null

export const useAnalytics = (): Analytics => {
  // Verificar se estamos no lado do cliente
  if (typeof window === 'undefined') {
    // No servidor, retornar uma instância mock
    return {
      trackCategoryVisit: () => {},
      trackSearch: () => {},
      trackProductView: () => {},
      trackCartEvent: () => {},
      trackWhatsAppCollection: () => {},
      trackOrderCompletion: () => {},
      getAnalytics: () => ({} as any),
      getTopCategories: () => [],
      getTopSearches: () => [],
      getTopProducts: () => []
    } as any
  }

  if (!analyticsInstance) {
    try {
      analyticsInstance = new Analytics()
      
      // Iniciar verificação periódica quando o Analytics for criado
      startPeriodicAbandonmentCheck()
      
    } catch (error) {
      console.error('❌ Erro ao criar instância do Analytics:', error)
      // Retornar instância mock em caso de erro
      return {
        trackCategoryVisit: (name: string) => console.log('Mock trackCategoryVisit:', name),
        trackSearch: (term: string) => console.log('Mock trackSearch:', term),
        trackProductView: (id: string, name: string, category: string) => console.log('Mock trackProductView:', id, name, category),
        trackCartEvent: (type: string, productId: string, quantity: number) => console.log('Mock trackCartEvent:', type, productId, quantity),
        trackWhatsAppCollection: (whatsapp: string) => console.log('Mock trackWhatsAppCollection:', whatsapp),
        trackOrderCompletion: (orderData: any) => console.log('Mock trackOrderCompletion:', orderData),
        getAnalytics: () => ({} as any),
        getTopCategories: () => [],
        getTopSearches: () => [],
        getTopProducts: () => []
      } as any
    }
  } else {
    // Se já existe instância, garantir que a verificação periódica esteja rodando
    if (!periodicCheckInterval) {
      startPeriodicAbandonmentCheck()
    }
  }
  
  return analyticsInstance!
}

export default useAnalytics
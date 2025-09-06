// Sistema de logging para analytics com níveis e persistência
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
  sessionId?: string
}

class AnalyticsLogger {
  private static instance: AnalyticsLogger
  private logs: LogEntry[] = []
  private maxLogs = 500
  private logLevel: LogLevel = LogLevel.INFO
  private storageKey = 'pmcell_analytics_logs'
  private flushTimer: NodeJS.Timeout | null = null

  private constructor() {
    // Carregar logs salvos do localStorage
    this.loadLogs()
    
    // Configurar flush automático a cada 30 segundos
    this.startAutoFlush()
  }

  static getInstance(): AnalyticsLogger {
    if (!AnalyticsLogger.instance) {
      AnalyticsLogger.instance = new AnalyticsLogger()
    }
    return AnalyticsLogger.instance
  }

  private loadLogs(): void {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.logs = parsed.slice(-this.maxLogs) // Manter apenas os últimos logs
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    }
  }

  private saveLogs(): void {
    if (typeof window === 'undefined') return
    
    try {
      // Manter apenas os logs mais recentes
      const logsToSave = this.logs.slice(-this.maxLogs)
      localStorage.setItem(this.storageKey, JSON.stringify(logsToSave))
    } catch (error) {
      console.error('Erro ao salvar logs:', error)
    }
  }

  private startAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    // Flush a cada 30 segundos
    this.flushTimer = setInterval(() => {
      this.flush()
    }, 30000)
  }

  private formatMessage(level: LogLevel, category: string, message: string): string {
    const emoji = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: '📊',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌'
    }
    
    return `${emoji[level]} [${category}] ${message}`
  }

  log(level: LogLevel, category: string, message: string, data?: any, sessionId?: string): void {
    if (level < this.logLevel) return
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      sessionId: sessionId || this.getSessionId()
    }
    
    this.logs.push(entry)
    
    // Console log para desenvolvimento
    const consoleMessage = this.formatMessage(level, category, message)
    
    switch (level) {
      case LogLevel.DEBUG:
        console.log(consoleMessage, data || '')
        break
      case LogLevel.INFO:
        console.log(consoleMessage, data || '')
        break
      case LogLevel.WARN:
        console.warn(consoleMessage, data || '')
        break
      case LogLevel.ERROR:
        console.error(consoleMessage, data || '')
        break
    }
    
    // Limitar tamanho da lista
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data)
  }

  info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data)
  }

  warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data)
  }

  error(category: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data)
  }

  // Obter sessionId do analytics
  private getSessionId(): string | undefined {
    if (typeof window === 'undefined') return undefined
    
    try {
      const analytics = localStorage.getItem('pmcell_analytics')
      if (analytics) {
        const parsed = JSON.parse(analytics)
        return parsed.sessionId
      }
    } catch {
      // Ignorar erro
    }
    
    return undefined
  }

  // Flush manual dos logs para o localStorage
  flush(): void {
    this.saveLogs()
  }

  // Obter logs filtrados
  getLogs(filter?: {
    level?: LogLevel
    category?: string
    sessionId?: string
    since?: Date
  }): LogEntry[] {
    let filtered = [...this.logs]
    
    if (filter) {
      if (filter.level !== undefined) {
        filtered = filtered.filter(log => log.level >= filter.level!)
      }
      
      if (filter.category) {
        filtered = filtered.filter(log => log.category === filter.category)
      }
      
      if (filter.sessionId) {
        filtered = filtered.filter(log => log.sessionId === filter.sessionId)
      }
      
      if (filter.since) {
        const sinceTime = filter.since.getTime()
        filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= sinceTime)
      }
    }
    
    return filtered
  }

  // Limpar logs
  clear(): void {
    this.logs = []
    this.saveLogs()
  }

  // Enviar logs críticos para o servidor (para debugging)
  async sendCriticalLogs(): Promise<void> {
    const criticalLogs = this.logs.filter(log => log.level >= LogLevel.WARN)
    
    if (criticalLogs.length === 0) return
    
    try {
      await fetch('/api/analytics/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: criticalLogs,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      })
      
      // Limpar logs críticos após envio bem-sucedido
      this.logs = this.logs.filter(log => log.level < LogLevel.WARN)
      this.saveLogs()
    } catch (error) {
      console.error('Erro ao enviar logs críticos:', error)
    }
  }

  // Método para configurar nível de log
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  // Destruir instance (cleanup)
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush()
  }
}

// Exportar singleton
export const analyticsLogger = AnalyticsLogger.getInstance()

// Hook para React
export function useAnalyticsLogger() {
  return analyticsLogger
}
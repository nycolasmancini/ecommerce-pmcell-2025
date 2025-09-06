import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Configurações padrão dos webhooks
const DEFAULT_WEBHOOK_SETTINGS = {
  whatsappCollected: {
    enabled: true,
    environment: 'production',
    url: 'https://n8n.pmcell.shop/webhook/whatsappCollected',
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
  },
  orderCompleted: {
    enabled: true,
    environment: 'production',
    url: 'https://n8n.pmcell.shop/webhook/orderCompleted',
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
  },
  cartAbandoned: {
    enabled: true,
    environment: 'production',
    url: 'https://n8n.pmcell.shop/webhook/cartAbandoned',
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
  },
  analyticsUpdate: {
    enabled: true,
    environment: 'production',
    url: 'https://n8n.pmcell.shop/webhook/analyticsUpdate',
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
  },
};

export async function GET(request: NextRequest) {
  try {
    // Buscar configurações do banco de dados
    const settings = await prisma.webhookSettings.findMany();
    
    // Se não houver configurações no banco, retornar padrões
    if (settings.length === 0) {
      console.log('🔧 [webhook-settings] Nenhuma configuração encontrada no banco, retornando padrões');
      
      // Criar configurações padrão no banco para futuras requisições
      await createDefaultSettings();
      
      return NextResponse.json(DEFAULT_WEBHOOK_SETTINGS);
    }
    
    // Converter array de settings em objeto
    const settingsMap: Record<string, any> = {};
    settings.forEach(setting => {
      settingsMap[setting.webhookType] = {
        enabled: setting.enabled,
        environment: setting.environment,
        url: setting.url || DEFAULT_WEBHOOK_SETTINGS[setting.webhookType as keyof typeof DEFAULT_WEBHOOK_SETTINGS]?.url,
        retryAttempts: setting.retryAttempts,
        retryDelayMs: setting.retryDelayMs,
        timeoutMs: setting.timeoutMs,
        headers: setting.headers,
      };
    });
    
    // Garantir que todos os tipos de webhook tenham configuração
    const completeSettings = {
      ...DEFAULT_WEBHOOK_SETTINGS,
      ...settingsMap,
    };
    
    return NextResponse.json(completeSettings);
  } catch (error) {
    console.error('❌ [webhook-settings] Erro ao buscar configurações:', error);
    
    // Em caso de erro no banco, retornar configurações padrão
    return NextResponse.json(DEFAULT_WEBHOOK_SETTINGS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookType, ...settings } = body;
    
    if (!webhookType) {
      return NextResponse.json(
        { error: 'webhookType é obrigatório' },
        { status: 400 }
      );
    }
    
    // Upsert da configuração
    const result = await prisma.webhookSettings.upsert({
      where: { webhookType },
      update: settings,
      create: {
        webhookType,
        ...settings,
      },
    });
    
    console.log(`✅ [webhook-settings] Configuração atualizada para ${webhookType}`);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ [webhook-settings] Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração de webhook' },
      { status: 500 }
    );
  }
}

// Função auxiliar para criar configurações padrão no banco
async function createDefaultSettings() {
  try {
    const webhookTypes = Object.keys(DEFAULT_WEBHOOK_SETTINGS);
    
    for (const type of webhookTypes) {
      const config = DEFAULT_WEBHOOK_SETTINGS[type as keyof typeof DEFAULT_WEBHOOK_SETTINGS];
      
      await prisma.webhookSettings.upsert({
        where: { webhookType: type },
        update: {},
        create: {
          webhookType: type,
          enabled: config.enabled,
          environment: config.environment,
          url: config.url,
          retryAttempts: config.retryAttempts,
          retryDelayMs: config.retryDelayMs,
          timeoutMs: config.timeoutMs,
        },
      });
    }
    
    console.log('✅ [webhook-settings] Configurações padrão criadas no banco');
  } catch (error) {
    console.error('❌ [webhook-settings] Erro ao criar configurações padrão:', error);
  }
}
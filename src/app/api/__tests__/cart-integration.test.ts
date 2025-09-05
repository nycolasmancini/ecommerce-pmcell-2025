import { prisma } from '@/lib/prisma'

// Este teste de integração verifica o fluxo completo:
// 1. Salvar carrinho via API
// 2. Sincronização com visita
// 3. Recuperação de detalhes do carrinho

describe('Cart Integration Tests', () => {
  const mockSessionId = 'integration-test-session'
  const mockWhatsapp = '11987654321'

  beforeEach(async () => {
    // Limpar dados de teste
    try {
      await prisma.visit.deleteMany({
        where: { sessionId: mockSessionId }
      })
    } catch (error) {
      // Ignorar erros se tabela não existe ainda
    }
  })

  afterAll(async () => {
    // Limpar dados de teste
    try {
      await prisma.visit.deleteMany({
        where: { sessionId: mockSessionId }
      })
    } catch (error) {
      // Ignorar erros
    }
  })

  it('deve completar o fluxo de salvar carrinho e recuperar detalhes', async () => {
    const mockCartData = {
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          name: 'Produto de Teste',
          quantity: 2,
          unitPrice: 75.50,
          modelName: 'Modelo Teste'
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          name: 'Outro Produto',
          quantity: 1,
          unitPrice: 120.25
        }
      ],
      total: 271.25
    }

    // Step 1: Simular salvamento do carrinho (como seria feito pela API)
    const savedVisit = await prisma.visit.upsert({
      where: { sessionId: mockSessionId },
      update: {
        hasCart: true,
        cartValue: mockCartData.total,
        cartItems: mockCartData.items.length,
        cartData: JSON.stringify({
          items: mockCartData.items,
          total: mockCartData.total
        }),
        lastActivity: new Date(),
        whatsapp: mockWhatsapp
      },
      create: {
        sessionId: mockSessionId,
        whatsapp: mockWhatsapp,
        hasCart: true,
        cartValue: mockCartData.total,
        cartItems: mockCartData.items.length,
        cartData: JSON.stringify({
          items: mockCartData.items,
          total: mockCartData.total
        }),
        lastActivity: new Date(),
        startTime: new Date()
      }
    })

    expect(savedVisit).toBeDefined()
    expect(savedVisit.sessionId).toBe(mockSessionId)
    expect(savedVisit.hasCart).toBe(true)
    expect(savedVisit.cartValue).toBe(271.25)
    expect(savedVisit.cartItems).toBe(2)

    // Step 2: Recuperar dados da visita
    const retrievedVisit = await prisma.visit.findUnique({
      where: { sessionId: mockSessionId }
    })

    expect(retrievedVisit).toBeDefined()
    expect(retrievedVisit!.cartData).toBeDefined()

    // Step 3: Verificar parse dos dados do carrinho
    const parsedCartData = JSON.parse(retrievedVisit!.cartData as string)
    expect(parsedCartData.items).toHaveLength(2)
    expect(parsedCartData.total).toBe(271.25)

    // Step 4: Simular formatação dos items (como seria feito pela API)
    const formattedItems = parsedCartData.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      modelName: item.modelName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * item.quantity
    }))

    expect(formattedItems[0]).toEqual({
      id: 'item-1',
      name: 'Produto de Teste',
      modelName: 'Modelo Teste',
      quantity: 2,
      unitPrice: 75.50,
      totalPrice: 151.00
    })

    expect(formattedItems[1]).toEqual({
      id: 'item-2',
      name: 'Outro Produto',
      modelName: undefined,
      quantity: 1,
      unitPrice: 120.25,
      totalPrice: 120.25
    })
  })

  it('deve lidar com carrinho vazio corretamente', async () => {
    // Primeiro criar uma visita com carrinho
    await prisma.visit.create({
      data: {
        sessionId: mockSessionId,
        hasCart: true,
        cartValue: 100,
        cartItems: 1,
        cartData: JSON.stringify({
          items: [{ id: 'temp', productId: 'temp', name: 'temp', quantity: 1, unitPrice: 100 }],
          total: 100
        }),
        lastActivity: new Date(),
        startTime: new Date()
      }
    })

    // Simular remoção do carrinho
    const emptyCartUpdate = await prisma.visit.update({
      where: { sessionId: mockSessionId },
      data: {
        hasCart: false,
        cartValue: null,
        cartItems: null,
        cartData: null,
        lastActivity: new Date()
      }
    })

    expect(emptyCartUpdate.hasCart).toBe(false)
    expect(emptyCartUpdate.cartValue).toBeNull()
    expect(emptyCartUpdate.cartItems).toBeNull()
    expect(emptyCartUpdate.cartData).toBeNull()
  })

  it('deve preservar dados de analytics ao atualizar carrinho', async () => {
    const mockAnalytics = {
      searchTerms: ['produto teste'],
      categoriesVisited: [{ name: 'Categoria A', visits: 3, lastVisit: Date.now() }],
      productsViewed: [{ id: 'prod-1', name: 'Produto', category: 'Cat A', visits: 2, lastView: Date.now() }]
    }

    // Criar visita com analytics
    await prisma.visit.create({
      data: {
        sessionId: mockSessionId,
        searchTerms: JSON.stringify(mockAnalytics.searchTerms),
        categoriesVisited: JSON.stringify(mockAnalytics.categoriesVisited),
        productsViewed: JSON.stringify(mockAnalytics.productsViewed),
        hasCart: false,
        lastActivity: new Date(),
        startTime: new Date()
      }
    })

    // Adicionar carrinho mantendo analytics
    const updatedVisit = await prisma.visit.update({
      where: { sessionId: mockSessionId },
      data: {
        hasCart: true,
        cartValue: 150,
        cartItems: 1,
        cartData: JSON.stringify({
          items: [{ id: 'item-1', productId: 'prod-1', name: 'Produto', quantity: 1, unitPrice: 150 }],
          total: 150
        }),
        lastActivity: new Date()
      }
    })

    expect(updatedVisit.hasCart).toBe(true)
    expect(updatedVisit.cartValue).toBe(150)
    
    // Verificar que analytics foram preservados
    expect(JSON.parse(updatedVisit.searchTerms as string)).toEqual(mockAnalytics.searchTerms)
    expect(JSON.parse(updatedVisit.categoriesVisited as string)).toEqual(mockAnalytics.categoriesVisited)
    expect(JSON.parse(updatedVisit.productsViewed as string)).toEqual(mockAnalytics.productsViewed)
  })
})
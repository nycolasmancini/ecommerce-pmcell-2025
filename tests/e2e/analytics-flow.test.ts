import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Analytics Flow End-to-End Tests', () => {
  const testSessionId = 'e2e_test_' + Date.now();
  const testWhatsapp = '+5519999888777';

  beforeEach(async () => {
    // Limpar dados de teste anteriores
    try {
      await prisma.visit.delete({
        where: { sessionId: testSessionId }
      });
    } catch {
      // Ignorar se não existe
    }
  });

  afterAll(async () => {
    // Limpeza final
    try {
      await prisma.visit.delete({
        where: { sessionId: testSessionId }
      });
    } catch {
      // Ignorar se não existe
    }
    await prisma.$disconnect();
  });

  describe('Complete Visit Flow', () => {
    test('should handle complete visit lifecycle with cart tracking', async () => {
      console.log('🚀 Iniciando teste E2E do fluxo de visita...');

      // 1. Visita inicial (sem carrinho)
      console.log('📊 1. Criando visita inicial...');
      const initialVisit = await prisma.visit.upsert({
        where: { sessionId: testSessionId },
        update: {
          lastActivity: new Date()
        },
        create: {
          sessionId: testSessionId,
          startTime: new Date(),
          status: 'active',
          hasCart: false,
          lastActivity: new Date()
        }
      });

      expect(initialVisit).toBeDefined();
      expect(initialVisit.sessionId).toBe(testSessionId);
      expect(initialVisit.hasCart).toBe(false);
      expect(initialVisit.cartData).toBeNull();

      // 2. Usuário navega e busca produtos
      console.log('📊 2. Adicionando atividade de navegação...');
      const searchTerms = ['capinha iphone', 'película vidro'];
      const categoriesVisited = [
        { name: 'Capinhas', visits: 2, lastVisit: Date.now() },
        { name: 'Películas', visits: 1, lastVisit: Date.now() }
      ];
      const productsViewed = [
        { 
          id: 'prod_123', 
          name: 'Capinha iPhone 14', 
          category: 'Capinhas',
          visits: 3,
          lastView: Date.now()
        }
      ];

      const navigationVisit = await prisma.visit.update({
        where: { sessionId: testSessionId },
        data: {
          searchTerms: JSON.stringify(searchTerms),
          categoriesVisited: JSON.stringify(categoriesVisited),
          productsViewed: JSON.stringify(productsViewed),
          lastActivity: new Date()
        }
      });

      expect(JSON.parse(navigationVisit.searchTerms as string)).toEqual(searchTerms);
      expect(JSON.parse(navigationVisit.categoriesVisited as string)).toEqual(categoriesVisited);

      // 3. Usuário adiciona itens ao carrinho
      console.log('📊 3. Adicionando itens ao carrinho...');
      const cartData = {
        items: [
          {
            id: 'cart_item_1',
            productId: 'prod_123',
            name: 'Capinha iPhone 14 Pro',
            quantity: 1,
            unitPrice: 45.90,
            modelName: 'iPhone 14 Pro'
          },
          {
            id: 'cart_item_2',
            productId: 'prod_456',
            name: 'Película de Vidro',
            quantity: 1,
            unitPrice: 25.00,
            modelName: 'iPhone 14 Pro'
          }
        ],
        total: 70.90
      };

      const cartVisit = await prisma.visit.update({
        where: { sessionId: testSessionId },
        data: {
          hasCart: true,
          cartValue: 70.90,
          cartItems: 2,
          cartData: JSON.stringify(cartData),
          lastActivity: new Date()
        }
      });

      expect(cartVisit.hasCart).toBe(true);
      expect(cartVisit.cartValue).toBe(70.90);
      expect(cartVisit.cartItems).toBe(2);
      expect(JSON.parse(cartVisit.cartData as string)).toEqual(cartData);

      // 4. Usuário fornece WhatsApp para liberar preços
      console.log('📊 4. Coletando WhatsApp...');
      const whatsappVisit = await prisma.visit.update({
        where: { sessionId: testSessionId },
        data: {
          whatsapp: testWhatsapp,
          whatsappCollectedAt: new Date(),
          lastActivity: new Date()
        }
      });

      expect(whatsappVisit.whatsapp).toBe(testWhatsapp);
      expect(whatsappVisit.whatsappCollectedAt).toBeDefined();

      // 5. Usuário atualiza carrinho (adiciona mais itens)
      console.log('📊 5. Atualizando carrinho...');
      const updatedCartData = {
        items: [
          ...cartData.items,
          {
            id: 'cart_item_3',
            productId: 'prod_789',
            name: 'Carregador Tipo C',
            quantity: 1,
            unitPrice: 35.00,
            modelName: 'Universal'
          }
        ],
        total: 105.90
      };

      const updatedCartVisit = await prisma.visit.update({
        where: { sessionId: testSessionId },
        data: {
          cartValue: 105.90,
          cartItems: 3,
          cartData: JSON.stringify(updatedCartData),
          lastActivity: new Date()
        }
      });

      expect(updatedCartVisit.cartValue).toBe(105.90);
      expect(updatedCartVisit.cartItems).toBe(3);
      const storedCartData = JSON.parse(updatedCartVisit.cartData as string);
      expect(storedCartData.items).toHaveLength(3);
      expect(storedCartData.total).toBe(105.90);

      // 6. Verificar dados finais da visita
      console.log('📊 6. Verificando estado final da visita...');
      const finalVisit = await prisma.visit.findUnique({
        where: { sessionId: testSessionId }
      });

      expect(finalVisit).toBeDefined();
      expect(finalVisit!.sessionId).toBe(testSessionId);
      expect(finalVisit!.whatsapp).toBe(testWhatsapp);
      expect(finalVisit!.hasCart).toBe(true);
      expect(finalVisit!.cartValue).toBe(105.90);
      expect(finalVisit!.cartItems).toBe(3);
      expect(finalVisit!.cartData).toBeDefined();
      expect(finalVisit!.searchTerms).toBeDefined();
      expect(finalVisit!.categoriesVisited).toBeDefined();
      expect(finalVisit!.productsViewed).toBeDefined();

      console.log('✅ Teste E2E do fluxo de visita concluído com sucesso!');
    });

    test('should handle cart abandonment scenario', async () => {
      console.log('🛒 Iniciando teste E2E de abandono de carrinho...');

      // 1. Criar visita com carrinho
      const cartData = {
        items: [
          {
            id: 'abandon_item_1',
            productId: 'prod_abandon',
            name: 'Produto Abandonado',
            quantity: 2,
            unitPrice: 50.00
          }
        ],
        total: 100.00
      };

      const abandonedVisit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: testWhatsapp,
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartValue: 100.00,
          cartItems: 2,
          cartData: JSON.stringify(cartData),
          lastActivity: new Date(),
          whatsappCollectedAt: new Date()
        }
      });

      expect(abandonedVisit.hasCart).toBe(true);
      expect(JSON.parse(abandonedVisit.cartData as string)).toEqual(cartData);

      // 2. Simular abandono (atualizar status)
      const now = new Date();
      const abandonedAt = new Date(now.getTime() + (65 * 1000)); // 65 segundos depois

      const updatedVisit = await prisma.visit.update({
        where: { sessionId: testSessionId },
        data: {
          status: 'abandoned',
          endTime: abandonedAt,
          sessionDuration: 65 // segundos
        }
      });

      expect(updatedVisit.status).toBe('abandoned');
      expect(updatedVisit.endTime).toBeDefined();
      expect(updatedVisit.sessionDuration).toBe(65);

      // 3. Verificar que dados do carrinho foram preservados
      const finalAbandonedVisit = await prisma.visit.findUnique({
        where: { sessionId: testSessionId }
      });

      expect(finalAbandonedVisit!.status).toBe('abandoned');
      expect(finalAbandonedVisit!.hasCart).toBe(true);
      expect(finalAbandonedVisit!.cartData).toBeDefined();
      
      const preservedCartData = JSON.parse(finalAbandonedVisit!.cartData as string);
      expect(preservedCartData.items).toHaveLength(1);
      expect(preservedCartData.total).toBe(100.00);

      console.log('✅ Teste E2E de abandono de carrinho concluído!');
    });

    test('should handle visit without cart (browse only)', async () => {
      console.log('👀 Iniciando teste E2E de visita sem carrinho...');

      // Visita apenas para navegação (sem adicionar ao carrinho)
      const browseOnlyVisit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          startTime: new Date(),
          status: 'completed',
          hasCart: false,
          cartValue: null,
          cartItems: null,
          cartData: null, // Explicitamente null
          searchTerms: JSON.stringify(['busca teste']),
          categoriesVisited: JSON.stringify([
            { name: 'Categoria Teste', visits: 1, lastVisit: Date.now() }
          ]),
          productsViewed: JSON.stringify([
            { 
              id: 'browse_prod', 
              name: 'Produto Visualizado',
              category: 'Teste',
              visits: 1,
              lastView: Date.now()
            }
          ]),
          lastActivity: new Date(),
          endTime: new Date(),
          sessionDuration: 120
        }
      });

      expect(browseOnlyVisit.hasCart).toBe(false);
      expect(browseOnlyVisit.cartData).toBeNull();
      expect(browseOnlyVisit.cartValue).toBeNull();
      expect(browseOnlyVisit.cartItems).toBeNull();
      expect(browseOnlyVisit.status).toBe('completed');

      console.log('✅ Teste E2E de visita sem carrinho concluído!');
    });
  });

  describe('Data Integrity Tests', () => {
    test('should handle large cart data without issues', async () => {
      console.log('📦 Testando carrinho grande...');

      const largeCartData = {
        items: Array.from({ length: 25 }, (_, i) => ({
          id: `large_item_${i}`,
          productId: `large_prod_${i}`,
          name: `Produto Grande ${i + 1}`,
          quantity: i + 1,
          unitPrice: (i + 1) * 15.50,
          modelName: `Modelo ${i + 1}`
        })),
        total: 8137.50 // Calculado
      };

      const largeCartVisit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartValue: 8137.50,
          cartItems: 325, // Soma das quantidades
          cartData: JSON.stringify(largeCartData),
          lastActivity: new Date()
        }
      });

      expect(largeCartVisit.hasCart).toBe(true);
      const storedLargeData = JSON.parse(largeCartVisit.cartData as string);
      expect(storedLargeData.items).toHaveLength(25);
      expect(storedLargeData.total).toBe(8137.50);

      console.log('✅ Teste de carrinho grande concluído!');
    });

    test('should handle special characters and unicode in cart data', async () => {
      console.log('🌍 Testando caracteres especiais...');

      const specialCartData = {
        items: [
          {
            id: 'special_item',
            productId: 'special_prod',
            name: 'Produto "Especial" & <Teste> 💯🔥',
            quantity: 1,
            unitPrice: 99.99,
            modelName: 'iPhone® 📱 (Edição Limitada™)',
            description: 'Produto com símbolos: !@#$%^&*()_+{}|:"<>?[]\\;\',./'
          }
        ],
        total: 99.99,
        metadata: {
          emoji: '😀🎉🛒💰🚀',
          special: '¡Hola! ñáéíóú ÀÁÂÃÄÅÆÇÈÉÊË',
          math: '∑∞≠≤≥±×÷√∫∆'
        }
      };

      const specialVisit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartData: JSON.stringify(specialCartData),
          lastActivity: new Date()
        }
      });

      const storedSpecialData = JSON.parse(specialVisit.cartData as string);
      expect(storedSpecialData).toEqual(specialCartData);
      expect(storedSpecialData.metadata.emoji).toBe('😀🎉🛒💰🚀');

      console.log('✅ Teste de caracteres especiais concluído!');
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple rapid cart updates', async () => {
      console.log('⚡ Testando atualizações rápidas...');

      // Criar visita inicial
      await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          startTime: new Date(),
          status: 'active',
          hasCart: false,
          lastActivity: new Date()
        }
      });

      // Fazer 10 atualizações rápidas do carrinho
      const updates = [];
      for (let i = 0; i < 10; i++) {
        const cartData = {
          items: Array.from({ length: i + 1 }, (_, j) => ({
            id: `rapid_${j}`,
            productId: `prod_${j}`,
            name: `Produto ${j + 1}`,
            quantity: 1,
            unitPrice: 10.00
          })),
          total: (i + 1) * 10.00
        };

        updates.push(
          prisma.visit.update({
            where: { sessionId: testSessionId },
            data: {
              hasCart: true,
              cartValue: (i + 1) * 10.00,
              cartItems: i + 1,
              cartData: JSON.stringify(cartData),
              lastActivity: new Date()
            }
          })
        );
      }

      const results = await Promise.all(updates);
      
      expect(results).toHaveLength(10);
      const finalResult = results[9];
      expect(finalResult.cartItems).toBe(10);
      expect(finalResult.cartValue).toBe(100.00);

      const finalCartData = JSON.parse(finalResult.cartData as string);
      expect(finalCartData.items).toHaveLength(10);

      console.log('✅ Teste de atualizações rápidas concluído!');
    });
  });
});
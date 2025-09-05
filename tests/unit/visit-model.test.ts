import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Visit Model Tests', () => {
  const testSessionId = 'test_session_' + Date.now();

  afterEach(async () => {
    // Limpar dados de teste
    try {
      await prisma.visit.delete({
        where: { sessionId: testSessionId }
      });
    } catch (error) {
      // Ignorar se não existe
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Basic Visit Operations', () => {
    test('should create Visit without cartData', async () => {
      const visit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: false,
          lastActivity: new Date()
        }
      });

      expect(visit).toBeDefined();
      expect(visit.sessionId).toBe(testSessionId);
      expect(visit.cartData).toBeNull();
      expect(visit.hasCart).toBe(false);
    });

    test('should create Visit with empty cartData', async () => {
      const cartData = {
        items: [],
        total: 0
      };

      const visit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: false,
          cartData: cartData,
          lastActivity: new Date()
        }
      });

      expect(visit).toBeDefined();
      expect(visit.cartData).toEqual(cartData);
    });

    test('should create Visit with complete cartData', async () => {
      const cartData = {
        items: [
          {
            id: 'item_1',
            productId: 'prod_123',
            name: 'Produto Teste',
            quantity: 2,
            unitPrice: 15.90,
            modelName: 'iPhone 14'
          }
        ],
        total: 31.80
      };

      const visit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartValue: 31.80,
          cartItems: 2,
          cartData: cartData,
          lastActivity: new Date()
        }
      });

      expect(visit).toBeDefined();
      expect(visit.hasCart).toBe(true);
      expect(visit.cartValue).toBe(31.80);
      expect(visit.cartItems).toBe(2);
      expect(visit.cartData).toEqual(cartData);
    });

    test('should update cartData for existing Visit', async () => {
      // Criar visit inicial
      const visit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: false,
          lastActivity: new Date()
        }
      });

      // Atualizar com cartData
      const cartData = {
        items: [
          {
            id: 'item_2',
            productId: 'prod_456',
            name: 'Produto Atualizado',
            quantity: 1,
            unitPrice: 25.00
          }
        ],
        total: 25.00
      };

      const updatedVisit = await prisma.visit.update({
        where: { sessionId: testSessionId },
        data: {
          hasCart: true,
          cartValue: 25.00,
          cartItems: 1,
          cartData: cartData
        }
      });

      expect(updatedVisit.hasCart).toBe(true);
      expect(updatedVisit.cartData).toEqual(cartData);
    });
  });

  describe('Visit Queries with cartData', () => {
    test('should query visits with cart', async () => {
      // Criar visit com carrinho
      await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartValue: 50.00,
          cartItems: 3,
          cartData: {
            items: [{ id: 'test', productId: 'test', name: 'Test', quantity: 1, unitPrice: 50.00 }],
            total: 50.00
          },
          lastActivity: new Date()
        }
      });

      const visitsWithCart = await prisma.visit.findMany({
        where: {
          hasCart: true,
          cartValue: {
            gt: 0
          }
        }
      });

      expect(visitsWithCart.length).toBeGreaterThan(0);
      const testVisit = visitsWithCart.find(v => v.sessionId === testSessionId);
      expect(testVisit).toBeDefined();
      expect(testVisit?.cartData).toBeDefined();
    });

    test('should handle null cartData in queries', async () => {
      await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: false,
          lastActivity: new Date()
        }
      });

      const visitsWithoutCart = await prisma.visit.findMany({
        where: {
          sessionId: testSessionId,
          hasCart: false
        }
      });

      expect(visitsWithoutCart.length).toBe(1);
      expect(visitsWithoutCart[0].cartData).toBeNull();
    });
  });

  describe('Visit Upsert Operations', () => {
    test('should upsert visit with cartData (create)', async () => {
      const cartData = {
        items: [
          {
            id: 'upsert_item',
            productId: 'upsert_prod',
            name: 'Upsert Produto',
            quantity: 1,
            unitPrice: 10.00
          }
        ],
        total: 10.00
      };

      const visit = await prisma.visit.upsert({
        where: { sessionId: testSessionId },
        update: {
          cartData: cartData,
          hasCart: true,
          cartValue: 10.00,
          lastActivity: new Date()
        },
        create: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartValue: 10.00,
          cartItems: 1,
          cartData: cartData,
          lastActivity: new Date()
        }
      });

      expect(visit.cartData).toEqual(cartData);
      expect(visit.hasCart).toBe(true);
    });

    test('should upsert visit with cartData (update)', async () => {
      // Criar visit primeiro
      await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: false,
          lastActivity: new Date()
        }
      });

      const newCartData = {
        items: [
          {
            id: 'updated_item',
            productId: 'updated_prod',
            name: 'Produto Atualizado',
            quantity: 2,
            unitPrice: 20.00
          }
        ],
        total: 40.00
      };

      const updatedVisit = await prisma.visit.upsert({
        where: { sessionId: testSessionId },
        update: {
          cartData: newCartData,
          hasCart: true,
          cartValue: 40.00,
          cartItems: 2,
          lastActivity: new Date()
        },
        create: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartValue: 40.00,
          cartItems: 2,
          cartData: newCartData,
          lastActivity: new Date()
        }
      });

      expect(updatedVisit.cartData).toEqual(newCartData);
      expect(updatedVisit.hasCart).toBe(true);
      expect(updatedVisit.cartValue).toBe(40.00);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large cartData', async () => {
      const largeCartData = {
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `item_${i}`,
          productId: `prod_${i}`,
          name: `Produto ${i}`,
          quantity: i + 1,
          unitPrice: (i + 1) * 10.50,
          modelName: `Modelo ${i}`
        })),
        total: 13275.00 // Sum calculated
      };

      const visit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartValue: 13275.00,
          cartItems: 1275, // Sum of quantities
          cartData: largeCartData,
          lastActivity: new Date()
        }
      });

      expect(visit.cartData).toEqual(largeCartData);
      expect((visit.cartData as any).items.length).toBe(50);
    });

    test('should handle cartData with special characters', async () => {
      const specialCartData = {
        items: [
          {
            id: 'special_item',
            productId: 'special_prod',
            name: 'Produto Especial: "Test" & <script>alert("xss")</script>',
            quantity: 1,
            unitPrice: 15.99,
            modelName: 'iPhone 📱 (Test)'
          }
        ],
        total: 15.99,
        metadata: {
          specialChars: '!@#$%^&*()_+{}|:"<>?[]\\;\',./',
          unicode: '😀🎉🔥💯'
        }
      };

      const visit = await prisma.visit.create({
        data: {
          sessionId: testSessionId,
          whatsapp: '+5519999999999',
          startTime: new Date(),
          status: 'active',
          hasCart: true,
          cartData: specialCartData,
          lastActivity: new Date()
        }
      });

      expect(visit.cartData).toEqual(specialCartData);
    });
  });
});
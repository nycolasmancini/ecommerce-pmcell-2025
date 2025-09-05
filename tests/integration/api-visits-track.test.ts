import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/visits/track/route';
import { PrismaClient } from '@prisma/client';

// Mock Prisma para testes isolados
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn()
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn()
  }
}));

const prisma = new PrismaClient();

describe('API /api/visits/track Integration Tests', () => {
  const testSessionId = 'integration_test_' + Date.now();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/visits/track', () => {
    test('should handle POST with sessionId only', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        id: 'test_id',
        sessionId: testSessionId
      });
      
      const mockQueryRaw = jest.fn().mockResolvedValue([{ test: 1 }]);

      (prisma.visit.upsert as jest.Mock) = mockUpsert;
      (prisma.$queryRaw as jest.Mock) = mockQueryRaw;

      const requestBody = {
        sessionId: testSessionId
      };

      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryRaw).toHaveBeenCalled(); // Teste de conexão
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: testSessionId },
          update: expect.objectContaining({
            sessionId: testSessionId,
            status: 'active',
            hasCart: false
          }),
          create: expect.objectContaining({
            sessionId: testSessionId,
            status: 'active',
            hasCart: false
          })
        })
      );
    });

    test('should handle POST with complete data including cartData', async () => {
      const cartData = {
        hasCart: true,
        cartValue: 89.90,
        cartItems: 2,
        items: [
          {
            id: 'cart_item_1',
            productId: 'prod_123',
            name: 'Capinha iPhone',
            quantity: 1,
            unitPrice: 45.90,
            modelName: 'iPhone 14'
          },
          {
            id: 'cart_item_2', 
            productId: 'prod_456',
            name: 'Película Vidro',
            quantity: 1,
            unitPrice: 44.00,
            modelName: 'iPhone 14'
          }
        ],
        total: 89.90
      };

      const requestBody = {
        sessionId: testSessionId,
        whatsapp: '+5519999999999',
        searchTerms: ['capinha', 'película'],
        categoriesVisited: [
          { name: 'Capinhas', visits: 3, lastVisit: Date.now() }
        ],
        productsViewed: [
          { 
            id: 'prod_123', 
            name: 'Capinha iPhone', 
            category: 'Capinhas',
            visits: 2,
            lastView: Date.now()
          }
        ],
        cartData: cartData,
        status: 'active',
        whatsappCollectedAt: Date.now()
      };

      const mockUpsert = jest.fn().mockResolvedValue({
        id: 'test_id',
        sessionId: testSessionId,
        cartData: JSON.stringify({
          items: cartData.items,
          total: cartData.total
        })
      });

      const mockQueryRaw = jest.fn().mockResolvedValue([{ test: 1 }]);

      (prisma.visit.upsert as jest.Mock) = mockUpsert;
      (prisma.$queryRaw as jest.Mock) = mockQueryRaw;

      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: testSessionId },
          update: expect.objectContaining({
            sessionId: testSessionId,
            whatsapp: '+5519999999999',
            status: 'active',
            hasCart: true,
            cartValue: 89.90,
            cartItems: 2,
            cartData: JSON.stringify({
              items: cartData.items,
              total: cartData.total
            })
          }),
          create: expect.objectContaining({
            sessionId: testSessionId,
            whatsapp: '+5519999999999',
            status: 'active',
            hasCart: true,
            cartValue: 89.90,
            cartItems: 2,
            cartData: JSON.stringify({
              items: cartData.items,
              total: cartData.total
            })
          })
        })
      );
    });

    test('should handle POST with invalid cartData', async () => {
      const requestBody = {
        sessionId: testSessionId,
        cartData: {
          hasCart: true,
          items: 'invalid_items' // Should be array
        }
      };

      const mockUpsert = jest.fn().mockResolvedValue({
        id: 'test_id',
        sessionId: testSessionId
      });

      const mockQueryRaw = jest.fn().mockResolvedValue([{ test: 1 }]);

      (prisma.visit.upsert as jest.Mock) = mockUpsert;
      (prisma.$queryRaw as jest.Mock) = mockQueryRaw;

      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Deve ser tratado graciosamente sem quebrar
    });

    test('should return 400 for missing sessionId', async () => {
      const requestBody = {
        whatsapp: '+5519999999999'
        // sessionId missing
      };

      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('SessionId é obrigatório');
    });

    test('should return 500 on database error', async () => {
      const mockUpsert = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      const mockQueryRaw = jest.fn().mockResolvedValue([{ test: 1 }]);

      (prisma.visit.upsert as jest.Mock) = mockUpsert;
      (prisma.$queryRaw as jest.Mock) = mockQueryRaw;

      const requestBody = {
        sessionId: testSessionId
      };

      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });
  });

  describe('GET /api/visits/track', () => {
    test('should return visit data for valid sessionId', async () => {
      const mockVisit = {
        id: 'visit_id',
        sessionId: testSessionId,
        whatsapp: '+5519999999999',
        hasCart: true,
        cartValue: 99.90,
        cartData: {
          items: [
            {
              id: 'item_1',
              productId: 'prod_123',
              name: 'Produto Teste',
              quantity: 1,
              unitPrice: 99.90
            }
          ],
          total: 99.90
        }
      };

      const mockFindUnique = jest.fn().mockResolvedValue(mockVisit);
      (prisma.visit.findUnique as jest.Mock) = mockFindUnique;

      const request = new NextRequest(`http://localhost:3000/api/visits/track?sessionId=${testSessionId}`, {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.visit).toEqual(mockVisit);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { sessionId: testSessionId }
      });
    });

    test('should return 400 for missing sessionId', async () => {
      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('SessionId é obrigatório');
    });

    test('should return 404 for non-existent visit', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      (prisma.visit.findUnique as jest.Mock) = mockFindUnique;

      const request = new NextRequest(`http://localhost:3000/api/visits/track?sessionId=non_existent`, {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Visita não encontrada');
    });

    test('should return 500 on database error', async () => {
      const mockFindUnique = jest.fn().mockRejectedValue(new Error('Database error'));
      (prisma.visit.findUnique as jest.Mock) = mockFindUnique;

      const request = new NextRequest(`http://localhost:3000/api/visits/track?sessionId=${testSessionId}`, {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });

  describe('Data Persistence Tests', () => {
    test('should persist cartData correctly in database format', async () => {
      const cartData = {
        hasCart: true,
        cartValue: 150.00,
        cartItems: 3,
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            name: 'Produto 1',
            quantity: 2,
            unitPrice: 50.00,
            modelName: 'Modelo 1'
          },
          {
            id: 'item_2',
            productId: 'prod_2',
            name: 'Produto 2',
            quantity: 1,
            unitPrice: 50.00
          }
        ],
        total: 150.00
      };

      const expectedStoredData = {
        items: cartData.items,
        total: cartData.total
      };

      const mockUpsert = jest.fn().mockResolvedValue({
        id: 'test_id',
        sessionId: testSessionId,
        cartData: expectedStoredData
      });

      const mockQueryRaw = jest.fn().mockResolvedValue([{ test: 1 }]);

      (prisma.visit.upsert as jest.Mock) = mockUpsert;
      (prisma.$queryRaw as jest.Mock) = mockQueryRaw;

      const requestBody = {
        sessionId: testSessionId,
        cartData: cartData
      };

      const request = new NextRequest('http://localhost:3000/api/visits/track', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verificar que os dados foram armazenados no formato correto
      const upsertCall = mockUpsert.mock.calls[0][0];
      const storedCartData = JSON.parse(upsertCall.create.cartData);
      expect(storedCartData).toEqual(expectedStoredData);
    });
  });
});
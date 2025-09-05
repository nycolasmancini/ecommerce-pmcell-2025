import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Schema Validation', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Visit Table Structure', () => {
    test('should have Visit table in database', async () => {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'Visit'
        ) as exists;
      `;
      
      expect((tableExists as any)[0].exists).toBe(true);
    });

    test('should have cartData column in Visit table', async () => {
      const columnExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = 'Visit'
          AND column_name = 'cartData'
        ) as exists;
      `;
      
      expect((columnExists as any)[0].exists).toBe(true);
    });

    test('cartData column should be JSONB type', async () => {
      const columnInfo = await prisma.$queryRaw`
        SELECT data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'Visit'
        AND column_name = 'cartData';
      `;
      
      const column = (columnInfo as any)[0];
      expect(column).toBeDefined();
      expect(column.data_type).toBe('jsonb');
      expect(column.is_nullable).toBe('YES');
    });

    test('should have all required Visit columns', async () => {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'Visit'
        ORDER BY ordinal_position;
      `;

      const columnNames = (columns as any[]).map(col => col.column_name);
      
      // Verificar colunas essenciais
      const requiredColumns = [
        'id', 'sessionId', 'whatsapp', 'startTime', 'endTime',
        'sessionDuration', 'searchTerms', 'categoriesVisited',
        'productsViewed', 'status', 'hasCart', 'cartValue',
        'cartItems', 'cartData', 'lastActivity', 'whatsappCollectedAt',
        'createdAt', 'updatedAt'
      ];

      requiredColumns.forEach(colName => {
        expect(columnNames).toContain(colName);
      });
    });

    test('should have unique constraint on sessionId', async () => {
      const uniqueConstraints = await prisma.$queryRaw`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'public' 
        AND table_name = 'Visit'
        AND constraint_type = 'UNIQUE';
      `;

      const sessionIdConstraint = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.constraint_column_usage
        WHERE table_schema = 'public' 
        AND table_name = 'Visit'
        AND column_name = 'sessionId';
      `;

      expect((sessionIdConstraint as any).length).toBeGreaterThan(0);
    });
  });

  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
      expect((testQuery as any)[0].test).toBe(1);
    });

    test('should perform Visit table operations', async () => {
      // Tentar uma operação simples de contagem
      const count = await prisma.visit.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
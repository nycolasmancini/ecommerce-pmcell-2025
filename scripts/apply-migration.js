const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = 'postgresql://postgres.cjlylhgovnausyrzauuw:Hexenwith556023@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function applyMigration() {
  console.log('🚀 Aplicando migração: Adicionar coluna cartData na tabela Visit');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });

  try {
    console.log('🔌 Conectando ao banco...');
    
    // Testar conexão
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexão estabelecida');

    // Verificar se a coluna já existe
    console.log('🔍 Verificando se coluna cartData já existe...');
    const columnExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'Visit'
        AND column_name = 'cartData'
      ) as exists;
    `;

    if (columnExists[0].exists) {
      console.log('⚠️  Coluna cartData já existe na tabela Visit. Migração não necessária.');
      return;
    }

    console.log('📊 Coluna cartData não encontrada. Aplicando migração...');

    // Aplicar a migração
    await prisma.$queryRaw`ALTER TABLE "Visit" ADD COLUMN "cartData" JSONB;`;
    
    console.log('✅ Migração aplicada com sucesso!');

    // Verificar se a coluna foi criada
    const verifyColumn = await prisma.$queryRaw`
      SELECT data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'Visit'
      AND column_name = 'cartData';
    `;

    if (verifyColumn.length > 0) {
      console.log('✅ Coluna cartData criada:');
      console.log(`   - Tipo: ${verifyColumn[0].data_type}`);
      console.log(`   - Nullable: ${verifyColumn[0].is_nullable}`);
    }

    // Registrar migração na tabela _prisma_migrations
    console.log('📝 Registrando migração...');
    const migrationId = '20250905180000_add_cart_data_to_visit';
    
    try {
      await prisma.$queryRaw`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (
          ${migrationId},
          '5f4a8d8c2f9b1e3a7c6d9e2f4a8b1c3d5e7f9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9',
          NOW(),
          'add_cart_data_to_visit',
          '',
          NULL,
          NOW(),
          1
        );
      `;
      console.log('✅ Migração registrada no histórico');
    } catch (error) {
      if (error.message.includes('duplicate key')) {
        console.log('⚠️  Migração já estava registrada no histórico');
      } else {
        console.log('⚠️  Erro ao registrar migração:', error.message);
      }
    }

    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Conexão fechada');
  }
}

applyMigration().catch(console.error);
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

// Configuração temporária para verificação
const DATABASE_URL = 'postgresql://postgres.cjlylhgovnausyrzauuw:Hexenwith556023@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function checkDatabase() {
  console.log('🔍 Verificando estrutura do banco de dados Supabase...\n');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });

  try {
    // Verificar se a tabela Visit existe
    console.log('📊 Verificando tabela Visit...');
    const visitTableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Visit'
      ) as exists;
    `;
    console.log('Tabela Visit existe:', visitTableCheck[0].exists);

    // Verificar se a tabela Session existe
    console.log('\n📊 Verificando tabela Session...');
    const sessionTableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Session'
      ) as exists;
    `;
    console.log('Tabela Session existe:', sessionTableCheck[0].exists);

    // Listar todas as tabelas
    console.log('\n📋 Listando todas as tabelas no banco:');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // Se a tabela Session existir, verificar suas colunas
    if (sessionTableCheck[0].exists) {
      console.log('\n📊 Colunas da tabela Session:');
      const sessionColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'Session'
        ORDER BY ordinal_position;
      `;
      
      sessionColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Se a tabela Visit existir, verificar suas colunas
    if (visitTableCheck[0].exists) {
      console.log('\n📊 Colunas da tabela Visit:');
      const visitColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'Visit'
        ORDER BY ordinal_position;
      `;
      
      visitColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase().catch(console.error);
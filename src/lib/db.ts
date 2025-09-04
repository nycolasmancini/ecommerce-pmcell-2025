import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
    
    if (!databaseUrl) {
      throw new Error('Database URL not configured')
    }
    
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : undefined,
      max: 3, // Reduzir máximo de conexões para evitar overload
      idleTimeoutMillis: 30000, // 30 segundos - aumentar tempo de idle
      connectionTimeoutMillis: 10000, // 10 segundos - mais tempo para conectar
      statement_timeout: 20000, // 20 segundos timeout para queries
      query_timeout: 20000,
      application_name: 'pmcell-vendas',
      keepAlive: true,
      keepAliveInitialDelayMillis: 30000, // Iniciar keepalive após 30s
      // Configurações adicionais para estabilidade
      allowExitOnIdle: false // Não permitir que o pool termine quando idle
    })
    
    // Log de eventos do pool para debug
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })
    
    pool.on('connect', () => {
      console.log('New client connected to database')
    })
    
    pool.on('remove', () => {
      console.log('Client removed from pool')
    })
  }
  
  return pool
}

export async function query(text: string, params?: any[], retries = 2) {
  const start = Date.now()
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const currentPool = getPool() // Obter pool a cada tentativa
      const result = await currentPool.query(text, params)
      const duration = Date.now() - start
      console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount })
      return result
    } catch (error: any) {
      const duration = Date.now() - start
      console.error(`Database query error (attempt ${attempt + 1}/${retries + 1}):`, error)
      
      // Se for erro de conexão e ainda temos tentativas, retry
      if ((error.code === 'XX000' || error.message?.includes('shutdown') || error.message?.includes('termination')) && attempt < retries) {
        console.log(`Retrying query in 1 second... (attempt ${attempt + 2}/${retries + 1})`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        // Resetar pool para forçar nova conexão
        if (pool) {
          try { 
            await pool.end() 
            console.log('Pool connection closed for reset')
          } catch (endError) {
            console.log('Error closing pool:', endError)
          }
          pool = null
        }
        continue
      }
      
      // Se não conseguimos após todas as tentativas, lançar erro
      throw error
    }
  }
}

// Função para testar a conexão
export async function testConnection() {
  try {
    const result = await query('SELECT NOW()')
    if (!result || !result.rows) {
      throw new Error('No result returned from database test query')
    }
    console.log('Database connection test successful:', result.rows[0])
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

// Função para criar produto via SQL direto
export async function createProduct(productData: {
  name: string
  subname?: string | null
  description?: string | null
  brand?: string | null
  price: number
  superWholesalePrice?: number | null
  superWholesaleQuantity?: number | null
  cost?: number | null
  categoryId: string
  isModalProduct?: boolean
  quickAddIncrement?: number | null
}) {
  const {
    name,
    subname,
    description,
    brand,
    price,
    superWholesalePrice,
    superWholesaleQuantity,
    cost,
    categoryId,
    isModalProduct = false,
    quickAddIncrement
  } = productData

  // Gerar ID único
  const productId = `cm${Math.random().toString(36).substring(2, 15)}`
  
  const insertQuery = `
    INSERT INTO "Product" (
      "id", "name", "subname", "description", "brand", "price", 
      "superWholesalePrice", "superWholesaleQuantity", "cost", 
      "categoryId", "isModalProduct", "quickAddIncrement",
      "isActive", "featured", "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    ) RETURNING *
  `
  
  const now = new Date()
  const params = [
    productId,
    name,
    subname,
    description,
    brand,
    price,
    superWholesalePrice,
    superWholesaleQuantity,
    cost,
    categoryId,
    isModalProduct,
    quickAddIncrement,
    true, // isActive
    false, // featured
    now, // createdAt
    now // updatedAt
  ]
  
  const result = await query(insertQuery, params)
  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error('Failed to create product - no result returned')
  }
  return result.rows[0]
}

// Função para criar imagem de produto via SQL direto
export async function createProductImage(imageData: {
  productId: string
  url: string
  fileName?: string | null
  order: number
  isMain: boolean
}) {
  const { productId, url, fileName, order, isMain } = imageData
  
  // Gerar ID único
  const imageId = `cm${Math.random().toString(36).substring(2, 15)}`
  
  const insertQuery = `
    INSERT INTO "ProductImage" (
      "id", "productId", "url", "fileName", "order", "isMain", "createdAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7
    ) RETURNING *
  `
  
  const params = [
    imageId,
    productId,
    url,
    fileName,
    order,
    isMain,
    new Date()
  ]
  
  const result = await query(insertQuery, params)
  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error('Failed to create product image - no result returned')
  }
  return result.rows[0]
}

// Função para encontrar ou criar marca via SQL direto
export async function findOrCreateBrand(name: string) {
  // Primeiro tentar encontrar
  const findQuery = 'SELECT * FROM "Brand" WHERE "name" = $1'
  const findResult = await query(findQuery, [name])
  
  if (findResult && findResult.rows && findResult.rows.length > 0) {
    return findResult.rows[0]
  }
  
  // Se não encontrou, criar
  const brandId = `cm${Math.random().toString(36).substring(2, 15)}`
  const insertQuery = `
    INSERT INTO "Brand" ("id", "name", "order", "createdAt") 
    VALUES ($1, $2, $3, $4) 
    RETURNING *
  `
  const params = [brandId, name, 0, new Date()]
  const result = await query(insertQuery, params)
  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error('Failed to create brand - no result returned')
  }
  return result.rows[0]
}

// Função para encontrar ou criar modelo via SQL direto
export async function findOrCreateModel(name: string, brandId: string) {
  // Primeiro tentar encontrar
  const findQuery = 'SELECT * FROM "Model" WHERE "name" = $1 AND "brandId" = $2'
  const findResult = await query(findQuery, [name, brandId])
  
  if (findResult && findResult.rows && findResult.rows.length > 0) {
    return findResult.rows[0]
  }
  
  // Se não encontrou, criar
  const modelId = `cm${Math.random().toString(36).substring(2, 15)}`
  const insertQuery = `
    INSERT INTO "Model" ("id", "name", "brandId", "createdAt") 
    VALUES ($1, $2, $3, $4) 
    RETURNING *
  `
  const params = [modelId, name, brandId, new Date()]
  const result = await query(insertQuery, params)
  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error('Failed to create model - no result returned')
  }
  return result.rows[0]
}

// Função para criar ProductModel via SQL direto
export async function createProductModel(data: {
  productId: string
  modelId: string
  price?: number | null
  superWholesalePrice?: number | null
}) {
  const { productId, modelId, price, superWholesalePrice } = data
  
  const productModelId = `cm${Math.random().toString(36).substring(2, 15)}`
  const insertQuery = `
    INSERT INTO "ProductModel" ("id", "productId", "modelId", "price", "superWholesalePrice", "createdAt") 
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING *
  `
  const params = [productModelId, productId, modelId, price, superWholesalePrice, new Date()]
  const result = await query(insertQuery, params)
  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error('Failed to create product model - no result returned')
  }
  return result.rows[0]
}

// Função para atualizar produto via SQL direto
export async function updateProduct(productId: string, data: {
  price?: number
  superWholesalePrice?: number | null
  superWholesaleQuantity?: number | null
}) {
  const { price, superWholesalePrice, superWholesaleQuantity } = data
  
  let setParts = []
  let params = []
  let paramIndex = 1
  
  if (price !== undefined) {
    setParts.push(`"price" = $${paramIndex}`)
    params.push(price)
    paramIndex++
  }
  
  if (superWholesalePrice !== undefined) {
    setParts.push(`"superWholesalePrice" = $${paramIndex}`)
    params.push(superWholesalePrice)
    paramIndex++
  }
  
  if (superWholesaleQuantity !== undefined) {
    setParts.push(`"superWholesaleQuantity" = $${paramIndex}`)
    params.push(superWholesaleQuantity)
    paramIndex++
  }
  
  setParts.push(`"updatedAt" = $${paramIndex}`)
  params.push(new Date())
  paramIndex++
  
  params.push(productId)
  
  const updateQuery = `
    UPDATE "Product" 
    SET ${setParts.join(', ')} 
    WHERE "id" = $${paramIndex} 
    RETURNING *
  `
  
  const result = await query(updateQuery, params)
  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error('Failed to update product model - no result returned')
  }
  return result.rows[0]
}

// Função para excluir produto e todas suas relações via SQL direto
export async function deleteProductRelations(productId: string) {
  const deleteQueries = [
    // 1. Excluir relações produto-fornecedor
    {
      query: 'DELETE FROM "ProductSupplier" WHERE "productId" = $1',
      name: 'ProductSupplier'
    },
    // 2. Excluir relações produto-modelo (para capas/películas)
    {
      query: 'DELETE FROM "ProductModel" WHERE "productId" = $1',
      name: 'ProductModel'
    },
    // 3. Excluir itens de pedidos relacionados
    {
      query: 'DELETE FROM "OrderItem" WHERE "productId" = $1',
      name: 'OrderItem'
    },
    // 4. Excluir produtos de kits
    {
      query: 'DELETE FROM "KitProduct" WHERE "productId" = $1',
      name: 'KitProduct'
    },
    // 5. Excluir imagens do produto
    {
      query: 'DELETE FROM "ProductImage" WHERE "productId" = $1',
      name: 'ProductImage'
    }
  ]
  
  const results = {}
  
  // Executar todas as exclusões das relações
  for (const deleteOp of deleteQueries) {
    try {
      const result = await query(deleteOp.query, [productId])
      results[deleteOp.name] = result?.rowCount || 0
      console.log(`Deleted ${results[deleteOp.name]} records from ${deleteOp.name}`)
    } catch (error) {
      console.error(`Error deleting from ${deleteOp.name}:`, error)
      throw new Error(`Failed to delete ${deleteOp.name} relations`)
    }
  }
  
  return results
}

// Função para excluir produto via SQL direto
export async function deleteProduct(productId: string) {
  if (!productId || productId.trim() === '') {
    throw new Error('Invalid product ID')
  }

  try {
    // Primeiro, verificar se o produto existe
    const checkResult = await query(
      'SELECT "id" FROM "Product" WHERE "id" = $1', 
      [productId]
    )
    
    if (!checkResult || !checkResult.rows || checkResult.rows.length === 0) {
      throw new Error('Product not found')
    }

    // Excluir todas as relações primeiro
    const deletedRelations = await deleteProductRelations(productId)
    
    // Por último, excluir o produto
    const deleteResult = await query(
      'DELETE FROM "Product" WHERE "id" = $1 RETURNING "id", "name"',
      [productId]
    )
    
    if (!deleteResult || !deleteResult.rows || deleteResult.rows.length === 0) {
      throw new Error('Failed to delete product')
    }
    
    const deletedProduct = deleteResult.rows[0]
    console.log('Product deleted successfully:', {
      id: deletedProduct.id,
      name: deletedProduct.name,
      relationsDeleted: deletedRelations
    })
    
    return {
      success: true,
      product: deletedProduct,
      relationsDeleted: deletedRelations
    }
  } catch (error) {
    console.error('Error in deleteProduct:', error)
    throw error
  }
}
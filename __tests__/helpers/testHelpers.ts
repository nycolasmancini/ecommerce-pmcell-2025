import { prisma } from '@/lib/prisma'

export interface TestProduct {
  id: string
  name: string
  description: string
  categoryId: string
  price: number
}

export interface TestImage {
  id: string
  productId: string
  url: string
  fileName: string
  order: number
  isMain: boolean
}

export async function createProductWithImages(
  productData: Partial<TestProduct> = {},
  images: Partial<TestImage>[] = []
) {
  const defaultProduct = {
    name: 'Test Product',
    description: 'Test Description',
    categoryId: 'test-category-id',
    price: 100,
    ...productData
  }

  const product = await prisma.product.create({
    data: defaultProduct
  })

  const createdImages = []
  for (const [index, imageData] of images.entries()) {
    const defaultImage = {
      productId: product.id,
      url: `data:image/jpeg;base64,test-${index}`,
      fileName: `test-${index}.jpg`,
      order: index,
      isMain: index === 0,
      ...imageData
    }

    const image = await prisma.productImage.create({
      data: defaultImage
    })
    createdImages.push(image)
  }

  return { product, images: createdImages }
}

export async function cleanupTestData() {
  try {
    // Limpar imagens de teste
    await prisma.productImage.deleteMany({
      where: {
        OR: [
          { fileName: { contains: 'test' } },
          { url: { contains: 'test' } }
        ]
      }
    })

    // Limpar produtos de teste
    await prisma.product.deleteMany({
      where: {
        OR: [
          { name: { contains: 'Test' } },
          { description: { contains: 'Test' } }
        ]
      }
    })

    // Limpar categorias de teste
    await prisma.category.deleteMany({
      where: {
        name: { contains: 'Test' }
      }
    })
  } catch (error) {
    console.warn('Erro ao limpar dados de teste:', error)
  }
}

export function createMockFormData(data: Record<string, string | File>): FormData {
  const formData = new FormData()
  
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value)
    } else {
      formData.append(key, value)
    }
  })
  
  return formData
}

export function createMockFile(
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  content: string = 'test-content'
): File {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

export function createBase64Image(
  width: number = 100,
  height: number = 100
): string {
  // Criar uma imagem base64 simples para testes
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
  
  if (!canvas) {
    // Para ambiente Node.js, retornar um base64 mock
    return `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=`
  }
  
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Criar um padrão simples
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, width, height)
  }
  
  return canvas.toDataURL('image/jpeg', 0.8)
}

export const mockImageData = {
  smallImage: createBase64Image(50, 50),
  mediumImage: createBase64Image(200, 200),
  largeImage: createBase64Image(500, 500)
}
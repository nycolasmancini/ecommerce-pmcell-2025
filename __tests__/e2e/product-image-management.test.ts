/**
 * Testes End-to-End para Gerenciamento de Imagens de Produtos
 * 
 * Estes testes simulam o fluxo completo de um usuário gerenciando imagens de produtos
 * através da interface admin, incluindo integração real com APIs e banco de dados.
 */

import { NextRequest } from 'next/server'
import { GET as getProducts } from '@/app/api/products/route'
import { GET as getProduct } from '@/app/api/products/[id]/route'
import { GET as getImages } from '@/app/api/products/[id]/images/route'
import { DELETE as deleteImage } from '@/app/api/products/[id]/images/[imageId]/route'
import { PATCH as favoriteImage } from '@/app/api/products/[id]/images/[imageId]/favorite/route'
import { prisma } from '@/lib/prisma'
import { createProductWithImages, cleanupTestData, mockImageData } from '../helpers/testHelpers'

describe('E2E: Gerenciamento de Imagens de Produtos', () => {
  let testProduct: any
  let testImages: any[]

  beforeEach(async () => {
    await cleanupTestData()
    
    // Criar um produto com múltiplas imagens para teste
    const result = await createProductWithImages(
      {
        name: 'Test Product E2E',
        description: 'Produto para teste end-to-end',
        price: 100
      },
      [
        { url: mockImageData.smallImage, fileName: 'image1.jpg', isMain: true },
        { url: mockImageData.mediumImage, fileName: 'image2.jpg', isMain: false },
        { url: mockImageData.largeImage, fileName: 'image3.jpg', isMain: false }
      ]
    )
    
    testProduct = result.product
    testImages = result.images
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Fluxo de Edição de Produto', () => {
    it('deve permitir editar produto e gerenciar suas imagens', async () => {
      // 1. Buscar produto específico (como faria a página de admin)
      const productRequest = new NextRequest('http://localhost:3000/api/test')
      const productParams = Promise.resolve({ id: testProduct.id })
      
      const productResponse = await getProduct(productRequest, { params: productParams })
      expect(productResponse.status).toBe(200)
      
      const productData = await productResponse.json()
      expect(productData.id).toBe(testProduct.id)
      expect(productData.images).toHaveLength(3)
      expect(productData.images.find((img: any) => img.isMain)).toBeTruthy()

      // 2. Listar imagens do produto
      const imagesRequest = new NextRequest('http://localhost:3000/api/test')
      const imagesParams = Promise.resolve({ id: testProduct.id })
      
      const imagesResponse = await getImages(imagesRequest, { params: imagesParams })
      expect(imagesResponse.status).toBe(200)
      
      const imagesData = await imagesResponse.json()
      expect(imagesData).toHaveLength(3)
      
      // Verificar ordenação: imagem principal primeiro
      expect(imagesData[0].isMain).toBe(true)
      expect(imagesData[0].fileName).toBe('image1.jpg')
    })

    it('deve permitir favoritar uma imagem diferente', async () => {
      const imageToFavorite = testImages[1] // Segunda imagem
      
      // 1. Favoritar nova imagem
      const favoriteRequest = new NextRequest('http://localhost:3000/api/test')
      const favoriteParams = Promise.resolve({ 
        id: testProduct.id, 
        imageId: imageToFavorite.id 
      })
      
      const favoriteResponse = await favoriteImage(favoriteRequest, { params: favoriteParams })
      expect(favoriteResponse.status).toBe(200)
      
      const updatedImage = await favoriteResponse.json()
      expect(updatedImage.isMain).toBe(true)
      expect(updatedImage.id).toBe(imageToFavorite.id)

      // 2. Verificar que outras imagens não são mais principais
      const imagesRequest = new NextRequest('http://localhost:3000/api/test')
      const imagesParams = Promise.resolve({ id: testProduct.id })
      
      const imagesResponse = await getImages(imagesRequest, { params: imagesParams })
      const imagesData = await imagesResponse.json()
      
      const mainImages = imagesData.filter((img: any) => img.isMain)
      expect(mainImages).toHaveLength(1)
      expect(mainImages[0].id).toBe(imageToFavorite.id)
    })

    it('deve permitir deletar uma imagem (mas não a única)', async () => {
      const imageToDelete = testImages[2] // Terceira imagem (não principal)
      
      // 1. Deletar imagem
      const deleteRequest = new NextRequest('http://localhost:3000/api/test')
      const deleteParams = Promise.resolve({ 
        id: testProduct.id, 
        imageId: imageToDelete.id 
      })
      
      const deleteResponse = await deleteImage(deleteRequest, { params: deleteParams })
      expect(deleteResponse.status).toBe(200)
      
      const deleteResult = await deleteResponse.json()
      expect(deleteResult.success).toBe(true)

      // 2. Verificar que imagem foi removida
      const imagesRequest = new NextRequest('http://localhost:3000/api/test')
      const imagesParams = Promise.resolve({ id: testProduct.id })
      
      const imagesResponse = await getImages(imagesRequest, { params: imagesParams })
      const imagesData = await imagesResponse.json()
      
      expect(imagesData).toHaveLength(2)
      expect(imagesData.find((img: any) => img.id === imageToDelete.id)).toBeUndefined()
      
      // 3. Verificar que imagem principal permanece intacta
      const mainImage = imagesData.find((img: any) => img.isMain)
      expect(mainImage).toBeTruthy()
      expect(mainImage.fileName).toBe('image1.jpg')
    })

    it('deve impedir deletar a única imagem do produto', async () => {
      // Deletar duas imagens primeiro, deixando apenas uma
      await deleteImage(
        new NextRequest('http://localhost:3000/api/test'),
        { params: Promise.resolve({ id: testProduct.id, imageId: testImages[1].id }) }
      )
      
      await deleteImage(
        new NextRequest('http://localhost:3000/api/test'),
        { params: Promise.resolve({ id: testProduct.id, imageId: testImages[2].id }) }
      )

      // Tentar deletar a última imagem
      const deleteRequest = new NextRequest('http://localhost:3000/api/test')
      const deleteParams = Promise.resolve({ 
        id: testProduct.id, 
        imageId: testImages[0].id 
      })
      
      const deleteResponse = await deleteImage(deleteRequest, { params: deleteParams })
      expect(deleteResponse.status).toBe(400)
      
      const errorResult = await deleteResponse.json()
      expect(errorResult.error).toBe('Não é possível deletar a única imagem do produto')
    })
  })

  describe('Integração com Lista de Produtos', () => {
    it('deve refletir imagem principal na listagem de produtos', async () => {
      // 1. Favoritar uma imagem diferente
      const newMainImage = testImages[1]
      
      const favoriteRequest = new NextRequest('http://localhost:3000/api/test')
      const favoriteParams = Promise.resolve({ 
        id: testProduct.id, 
        imageId: newMainImage.id 
      })
      
      await favoriteImage(favoriteRequest, { params: favoriteParams })

      // 2. Buscar lista de produtos
      const productsRequest = new NextRequest('http://localhost:3000/api/test')
      const productsResponse = await getProducts(productsRequest)
      
      const productsData = await productsResponse.json()
      const updatedProduct = productsData.find((p: any) => p.id === testProduct.id)
      
      expect(updatedProduct).toBeTruthy()
      expect(updatedProduct.images).toHaveLength(3)
      
      // 3. Verificar que a imagem principal mudou
      const mainImage = updatedProduct.images.find((img: any) => img.isMain)
      expect(mainImage.id).toBe(newMainImage.id)
      expect(mainImage.fileName).toBe('image2.jpg')
    })
  })

  describe('Casos Edge e Validação', () => {
    it('deve retornar erro ao tentar gerenciar imagens de produto inexistente', async () => {
      const fakeProductId = 'fake-product-id'
      
      const imagesRequest = new NextRequest('http://localhost:3000/api/test')
      const imagesParams = Promise.resolve({ id: fakeProductId })
      
      const imagesResponse = await getImages(imagesRequest, { params: imagesParams })
      expect(imagesResponse.status).toBe(404)
      
      const errorData = await imagesResponse.json()
      expect(errorData.error).toBe('Produto não encontrado')
    })

    it('deve retornar erro ao tentar deletar imagem inexistente', async () => {
      const fakeImageId = 'fake-image-id'
      
      const deleteRequest = new NextRequest('http://localhost:3000/api/test')
      const deleteParams = Promise.resolve({ 
        id: testProduct.id, 
        imageId: fakeImageId 
      })
      
      const deleteResponse = await deleteImage(deleteRequest, { params: deleteParams })
      expect(deleteResponse.status).toBe(404)
      
      const errorData = await deleteResponse.json()
      expect(errorData.error).toBe('Imagem não encontrada')
    })

    it('deve retornar erro ao tentar favoritar imagem de outro produto', async () => {
      // Criar outro produto
      const otherProductResult = await createProductWithImages(
        { name: 'Other Product', price: 50 },
        [{ url: mockImageData.smallImage, fileName: 'other.jpg' }]
      )
      
      const otherImage = otherProductResult.images[0]
      
      // Tentar favoritar imagem do outro produto
      const favoriteRequest = new NextRequest('http://localhost:3000/api/test')
      const favoriteParams = Promise.resolve({ 
        id: testProduct.id, 
        imageId: otherImage.id 
      })
      
      const favoriteResponse = await favoriteImage(favoriteRequest, { params: favoriteParams })
      expect(favoriteResponse.status).toBe(400)
      
      const errorData = await favoriteResponse.json()
      expect(errorData.error).toBe('Imagem não pertence a este produto')
    })
  })

  describe('Performance e Ordenação', () => {
    it('deve retornar imagens em ordem correta', async () => {
      const imagesRequest = new NextRequest('http://localhost:3000/api/test')
      const imagesParams = Promise.resolve({ id: testProduct.id })
      
      const imagesResponse = await getImages(imagesRequest, { params: imagesParams })
      const imagesData = await imagesResponse.json()
      
      // Verificar ordenação:
      // 1. Imagem principal primeiro (isMain: desc)
      // 2. Por ordem (order: asc)  
      // 3. Por data de criação (createdAt: asc)
      
      expect(imagesData[0].isMain).toBe(true)
      
      // Verificar que imagens não principais estão ordenadas por order
      const nonMainImages = imagesData.slice(1)
      for (let i = 1; i < nonMainImages.length; i++) {
        expect(nonMainImages[i].order).toBeGreaterThanOrEqual(nonMainImages[i-1].order)
      }
    })

    it('deve lidar com produto sem imagens graciosamente', async () => {
      // Criar produto sem imagens
      const emptyProduct = await prisma.product.create({
        data: {
          name: 'Empty Product',
          description: 'Produto sem imagens',
          categoryId: 'test-category',
          price: 10
        }
      })

      const imagesRequest = new NextRequest('http://localhost:3000/api/test')
      const imagesParams = Promise.resolve({ id: emptyProduct.id })
      
      const imagesResponse = await getImages(imagesRequest, { params: imagesParams })
      expect(imagesResponse.status).toBe(200)
      
      const imagesData = await imagesResponse.json()
      expect(imagesData).toEqual([])
    })
  })
})
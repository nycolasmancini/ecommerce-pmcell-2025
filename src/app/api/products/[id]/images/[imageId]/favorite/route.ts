import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id: productId, imageId } = await params

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se a imagem existe
    const image = await prisma.productImage.findUnique({
      where: { id: imageId }
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a imagem pertence ao produto
    if (image.productId !== productId) {
      return NextResponse.json(
        { error: 'Imagem não pertence a este produto' },
        { status: 400 }
      )
    }

    // Usar transação para garantir consistência:
    // 1. Desmarcar todas as outras imagens como principal
    // 2. Marcar esta imagem como principal
    const updatedImage = await prisma.$transaction(async (tx) => {
      // Desmarcar todas as outras imagens como principal
      await tx.productImage.updateMany({
        where: { 
          productId: productId,
          id: { not: imageId }
        },
        data: { isMain: false }
      })

      // Marcar esta imagem como principal
      return await tx.productImage.update({
        where: { id: imageId },
        data: { isMain: true }
      })
    })

    return NextResponse.json(updatedImage)

  } catch (error) {
    console.error('Erro ao favoritar imagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
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

    // Verificar se não é a única imagem do produto
    const imageCount = await prisma.productImage.count({
      where: { productId: productId }
    })

    if (imageCount <= 1) {
      return NextResponse.json(
        { error: 'Não é possível deletar a única imagem do produto' },
        { status: 400 }
      )
    }

    // Deletar a imagem
    await prisma.productImage.delete({
      where: { id: imageId }
    })

    return NextResponse.json({
      success: true,
      message: 'Imagem deletada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar imagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
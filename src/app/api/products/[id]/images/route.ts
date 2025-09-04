import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params

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

    // Buscar todas as imagens do produto
    const images = await prisma.productImage.findMany({
      where: { productId: productId },
      orderBy: [
        { isMain: 'desc' }, // Imagem principal primeiro
        { order: 'asc' },   // Depois por ordem
        { createdAt: 'asc' } // Por último, por data de criação
      ]
    })

    return NextResponse.json(images)

  } catch (error) {
    console.error('Erro ao buscar imagens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
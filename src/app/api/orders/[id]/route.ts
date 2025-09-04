import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    
    // Verificar se o pedido existe usando query segura (evita erro de campos inexistentes)
    let existingOrder
    try {
      const result = await prisma.$queryRaw`
        SELECT id, "customerId", status, "confirmedAt", "completedAt", subtotal, discount
        FROM "Order" 
        WHERE id = ${id}::text 
        LIMIT 1
      ` as any[]
      
      if (!result || result.length === 0) {
        return NextResponse.json(
          { error: 'Pedido não encontrado' },
          { status: 404 }
        )
      }
      
      existingOrder = result[0]
    } catch (error: any) {
      console.error('Erro ao buscar pedido:', error)
      return NextResponse.json(
        { error: 'Erro interno ao buscar pedido' },
        { status: 500 }
      )
    }

    // Preparar dados para atualização
    const updateData: any = {}

    // Atualizar nome do cliente se fornecido
    if (body.customerName) {
      await prisma.customer.update({
        where: { id: existingOrder.customerId },
        data: { name: body.customerName.trim() }
      })
    }

    // Atualizar finalWhatsapp se fornecido
    if (body.finalWhatsapp) {
      // Validar WhatsApp brasileiro
      const whatsappRegex = /^55\d{10,11}$/
      const cleanWhatsapp = body.finalWhatsapp.replace(/\D/g, '')
      
      if (!whatsappRegex.test(cleanWhatsapp)) {
        return NextResponse.json(
          { error: 'WhatsApp final inválido. Use o formato brasileiro com DDD.' },
          { status: 400 }
        )
      }
      
      updateData.finalWhatsapp = body.finalWhatsapp
    }

    // Atualizar status se fornecido
    if (body.status) {
      updateData.status = body.status
      
      // Definir timestamps baseado no status
      if (body.status === 'CONFIRMED' && !existingOrder.confirmedAt) {
        updateData.confirmedAt = new Date()
      } else if (body.status === 'COMPLETED' && !existingOrder.completedAt) {
        updateData.completedAt = new Date()
      }
    }

    // Atualizar observações internas se fornecidas
    if (body.internalNotes !== undefined) {
      updateData.internalNotes = body.internalNotes
    }

    // Atualizar vendedor atribuído se fornecido
    if (body.assignedSeller !== undefined) {
      updateData.assignedSeller = body.assignedSeller
    }

    // Atualizar desconto se fornecido
    if (body.discount !== undefined) {
      updateData.discount = body.discount
      // Recalcular total
      updateData.total = existingOrder.subtotal - body.discount
    }

    // Realizar a atualização
    let updatedOrder
    try {
      updatedOrder = await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          }
        }
      })
    } catch (error: any) {
      // Se erro relacionado a campos WhatsApp, tentar sem eles
      if (error.message && error.message.includes('finalWhatsapp')) {
        console.log('🔄 finalWhatsapp field not found, updating without it')
        const { finalWhatsapp, ...updateDataWithoutWhatsapp } = updateData
        updatedOrder = await prisma.order.update({
          where: { id },
          data: updateDataWithoutWhatsapp,
          include: {
            customer: true,
            items: {
              include: {
                product: true
              }
            }
          }
        })
      } else {
        throw error
      }
    }

    // Criar log do webhook se o status foi alterado
    if (body.status && body.status !== existingOrder.status) {
      await prisma.webhookLog.create({
        data: {
          eventType: 'ORDER_UPDATED',
          orderId: updatedOrder.id,
          payload: {
            orderId: updatedOrder.id,
            oldStatus: existingOrder.status,
            newStatus: body.status,
            updatedAt: new Date()
          } as any,
          success: false
        }
      })
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams

    // Verificar se o pedido existe
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir exclusão de pedidos confirmados ou finalizados
    if (existingOrder.status === 'CONFIRMED' || existingOrder.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Não é possível excluir pedidos confirmados ou finalizados' },
        { status: 400 }
      )
    }

    // Deletar itens do pedido primeiro (devido à restrição de chave estrangeira)
    await prisma.orderItem.deleteMany({
      where: { orderId: id }
    })

    // Deletar logs de webhook relacionados
    await prisma.webhookLog.deleteMany({
      where: { orderId: id }
    })

    // Deletar o pedido
    await prisma.order.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Pedido excluído com sucesso' })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
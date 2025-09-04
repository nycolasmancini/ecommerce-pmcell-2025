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
    
    console.log('🔄 PATCH /api/orders/[id] - Iniciando atualização:', { 
      orderId: id, 
      requestBody: body 
    })
    
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
      console.log('👤 Atualizando nome do cliente:', { 
        customerId: existingOrder.customerId, 
        newName: body.customerName.trim() 
      })
      try {
        await prisma.customer.update({
          where: { id: existingOrder.customerId },
          data: { name: body.customerName.trim() }
        })
        console.log('✅ Nome do cliente atualizado com sucesso')
      } catch (error: any) {
        console.error('❌ Erro ao atualizar nome do cliente:', { 
          customerId: existingOrder.customerId, 
          error: error.message 
        })
        throw error
      }
    }

    // Atualizar finalWhatsapp se fornecido
    if (body.finalWhatsapp) {
      console.log('📱 Processando finalWhatsapp:', { finalWhatsapp: body.finalWhatsapp })
      
      // Validar WhatsApp brasileiro
      const whatsappRegex = /^55\d{10,11}$/
      const cleanWhatsapp = body.finalWhatsapp.replace(/\D/g, '')
      
      if (!whatsappRegex.test(cleanWhatsapp)) {
        console.error('❌ WhatsApp final inválido:', { 
          originalValue: body.finalWhatsapp, 
          cleanValue: cleanWhatsapp 
        })
        return NextResponse.json(
          { error: 'WhatsApp final inválido. Use o formato brasileiro com DDD.' },
          { status: 400 }
        )
      }
      
      updateData.finalWhatsapp = body.finalWhatsapp
      console.log('✅ finalWhatsapp validado e adicionado aos dados de atualização')
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
    console.log('📝 Dados para atualização:', { id, updateData })
    
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
      console.log('✅ Pedido atualizado com sucesso:', { orderId: id })
    } catch (error: any) {
      console.error('❌ Erro ao atualizar pedido:', { 
        orderId: id, 
        error: error.message, 
        code: error.code,
        updateData 
      })
      
      // Se erro relacionado a campos WhatsApp, tentar sem eles
      if (error.message && (error.message.includes('finalWhatsapp') || error.message.includes('originalWhatsapp'))) {
        console.log('🔄 Campos WhatsApp não encontrados, tentando sem eles')
        const { finalWhatsapp, originalWhatsapp, ...updateDataWithoutWhatsapp } = updateData
        try {
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
          console.log('✅ Pedido atualizado com fallback (sem campos WhatsApp):', { orderId: id })
        } catch (fallbackError: any) {
          console.error('❌ Erro mesmo com fallback:', { 
            orderId: id, 
            error: fallbackError.message, 
            code: fallbackError.code 
          })
          throw fallbackError
        }
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
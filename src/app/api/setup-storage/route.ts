import { NextResponse } from 'next/server'
import { setupStorage } from '@/lib/setup-storage'

export async function POST() {
  try {
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return NextResponse.json({ 
        message: 'Supabase não configurado - usando armazenamento Base64',
        success: true,
        mode: 'base64'
      })
    }

    const result = await setupStorage()
    
    if (result.success) {
      return NextResponse.json({ 
        message: 'Storage configurado com sucesso!',
        success: true 
      })
    } else {
      return NextResponse.json({ 
        message: 'Erro ao configurar storage',
        error: result.error,
        success: false 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Erro no setup:', error)
    return NextResponse.json({ 
      message: 'Erro interno do servidor - usando armazenamento Base64',
      error: error,
      success: true,
      mode: 'base64'
    })
  }
}
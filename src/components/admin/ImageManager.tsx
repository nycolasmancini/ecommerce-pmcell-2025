'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface ProductImage {
  id: string
  productId?: string
  url: string
  fileName?: string
  order?: number
  isMain: boolean
  createdAt?: string
}

interface ImageManagerProps {
  productId: string
  images: ProductImage[]
  onUpdate: () => void
}

export default function ImageManager({ productId, images, onUpdate }: ImageManagerProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (imageId: string, fileName: string) => {
    // Verificar se é a única imagem
    if (images.length === 1) {
      alert('Não é possível deletar a única imagem do produto')
      return
    }

    if (!confirm('Tem certeza que deseja deletar esta imagem?')) {
      return
    }

    setLoading(`delete-${imageId}`)

    try {
      const response = await fetch(`/api/products/${productId}/images/${imageId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        onUpdate() // Recarregar a lista de imagens
      } else {
        alert(data.error || 'Erro ao deletar imagem')
      }
    } catch (error) {
      console.error('Erro ao deletar imagem:', error)
      alert('Erro ao deletar imagem')
    } finally {
      setLoading(null)
    }
  }

  const handleFavorite = async (imageId: string) => {
    setLoading(`favorite-${imageId}`)

    try {
      const response = await fetch(`/api/products/${productId}/images/${imageId}/favorite`, {
        method: 'PATCH'
      })

      const data = await response.json()

      if (response.ok) {
        onUpdate() // Recarregar a lista de imagens
      } else {
        alert(data.error || 'Erro ao favoritar imagem')
      }
    } catch (error) {
      console.error('Erro ao favoritar imagem:', error)
      alert('Erro ao favoritar imagem')
    } finally {
      setLoading(null)
    }
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma imagem encontrada
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Gerenciar Fotos ({images.length})
      </h3>
      
      <div 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        data-testid="images-grid"
      >
        {images.map((image) => (
          <div key={image.id} className="relative group">
            {/* Container da imagem */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={image.url}
                alt={image.fileName || `Imagem ${images.indexOf(image) + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Indicador de imagem principal */}
              {image.isMain && (
                <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Principal
                </div>
              )}

              {/* Overlay com botões de ação */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  {/* Botão Favoritar */}
                  <button
                    onClick={() => handleFavorite(image.id)}
                    disabled={loading === `favorite-${image.id}` || image.isMain}
                    className={`
                      p-2 rounded-full transition-colors
                      ${image.isMain 
                        ? 'bg-orange-500 text-white cursor-default' 
                        : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    aria-label={`Favoritar imagem ${image.fileName || `${images.indexOf(image) + 1}`}`}
                    title={image.isMain ? 'Imagem principal' : 'Definir como principal'}
                  >
                    {loading === `favorite-${image.id}` ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </button>

                  {/* Botão Deletar */}
                  <button
                    onClick={() => handleDelete(image.id, image.fileName || `Imagem ${images.indexOf(image) + 1}`)}
                    disabled={loading === `delete-${image.id}`}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Deletar imagem ${image.fileName || `${images.indexOf(image) + 1}`}`}
                    title="Deletar imagem"
                  >
                    {loading === `delete-${image.id}` ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Nome do arquivo */}
            <div className="mt-2 text-sm text-gray-600 text-center truncate px-1">
              {image.fileName || `Imagem ${images.indexOf(image) + 1}`}
            </div>

            {/* Loading states independentes */}
            {loading === `delete-${image.id}` && (
              <div className="absolute inset-0 bg-red-500 bg-opacity-75 rounded-lg flex items-center justify-center">
                <div className="text-white text-sm font-medium">Deletando...</div>
              </div>
            )}
            
            {loading === `favorite-${image.id}` && (
              <div className="absolute inset-0 bg-orange-500 bg-opacity-75 rounded-lg flex items-center justify-center">
                <div className="text-white text-sm font-medium">Favoritando...</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instruções */}
      <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Como usar:</p>
            <ul className="mt-1 space-y-1">
              <li>• Passe o mouse sobre uma imagem para ver as opções</li>
              <li>• Clique na estrela para definir como imagem principal do produto</li>
              <li>• Clique na lixeira para deletar (mínimo 1 imagem por produto)</li>
              <li>• A imagem principal aparece nos cards do site</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
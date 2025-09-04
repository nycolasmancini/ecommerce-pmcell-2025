'use client'

import React, { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

interface ImageUploaderProps {
  onChange: (files: File[]) => void
  selectedImages: File[]
  maxFiles?: number
  maxFileSize?: number // em bytes
  accept?: string
  className?: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function ImageUploader({
  onChange,
  selectedImages,
  maxFiles = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB por padrão
  accept = 'image/*',
  className = ''
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({})
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Gerar preview das imagens
  const generatePreview = useCallback(async (file: File) => {
    const fileKey = `${file.name}-${file.size}`
    
    if (previewUrls[fileKey]) return previewUrls[fileKey]
    
    setLoadingPreviews(prev => new Set(prev).add(fileKey))
    
    return new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        setPreviewUrls(prev => ({ ...prev, [fileKey]: url }))
        setLoadingPreviews(prev => {
          const newSet = new Set(prev)
          newSet.delete(fileKey)
          return newSet
        })
        resolve(url)
      }
      reader.readAsDataURL(file)
    })
  }, [previewUrls])

  // Gerar previews para todas as imagens selecionadas
  React.useEffect(() => {
    selectedImages.forEach(file => {
      generatePreview(file)
    })
  }, [selectedImages, generatePreview])

  const validateFiles = (files: FileList | File[]): File[] => {
    const fileArray = Array.from(files)
    const validFiles: File[] = []

    for (const file of fileArray) {
      // Validar tipo de arquivo
      if (!file.type.match(accept.replace('*', '.*'))) {
        continue
      }

      // Validar tamanho
      if (file.size > maxFileSize) {
        alert(`Arquivo "${file.name}" é muito grande. Tamanho máximo: ${formatFileSize(maxFileSize)}`)
        continue
      }

      validFiles.push(file)
    }

    // Limitar número de arquivos
    const remainingSlots = maxFiles - selectedImages.length
    if (validFiles.length > remainingSlots) {
      return validFiles.slice(0, remainingSlots)
    }

    return validFiles
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = validateFiles(e.target.files)
      if (validFiles.length > 0) {
        onChange([...selectedImages, ...validFiles])
      }
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(e.dataTransfer.files)
      if (validFiles.length > 0) {
        onChange([...selectedImages, ...validFiles])
      }
    }
  }

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    onChange(newImages)
  }

  const clearSelection = () => {
    onChange([])
    setPreviewUrls({})
    setLoadingPreviews(new Set())
  }

  const getFileKey = (file: File) => `${file.name}-${file.size}`

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Área de upload */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${isDragOver 
            ? 'border-orange-500 bg-orange-50' 
            : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          style={{ display: 'none' }}
        />
        
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400 mb-4" 
            stroke="currentColor" 
            fill="none" 
            viewBox="0 0 48 48"
          >
            <path 
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
              strokeWidth={2} 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">Adicionar Fotos</p>
          <p className="text-sm text-gray-600">
            Clique ou arraste imagens aqui
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Máximo {maxFiles} arquivos • {formatFileSize(maxFileSize)} por arquivo
          </p>
        </div>
      </div>

      {/* Contador de arquivos */}
      {selectedImages.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedImages.length} arquivo(s) selecionado(s)
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            aria-label="Limpar seleção"
          >
            Limpar Seleção
          </button>
        </div>
      )}

      {/* Preview das imagens */}
      {selectedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {selectedImages.map((file, index) => {
            const fileKey = getFileKey(file)
            const isLoading = loadingPreviews.has(fileKey)
            const previewUrl = previewUrls[fileKey]

            return (
              <div key={fileKey} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs text-gray-500">Carregando preview...</div>
                    </div>
                  ) : previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt={file.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Botão remover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(index)
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    aria-label={`Remover imagem ${file.name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Nome do arquivo */}
                <div className="mt-1 text-xs text-gray-600 text-center truncate px-1">
                  {file.name}
                </div>

                {/* Tamanho do arquivo */}
                <div className="text-xs text-gray-500 text-center">
                  {formatFileSize(file.size)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
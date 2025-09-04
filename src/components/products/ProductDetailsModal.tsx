'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductImage {
  id: string
  url: string
  isMain: boolean
}

interface ProductDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    subname?: string
    description?: string
    brand?: string
    category?: string | { id: string; name: string; slug: string }
    image?: string
    images?: ProductImage[]
    isModalProduct?: boolean
  }
}

const ProductDetailsModal = memo(({ isOpen, onClose, product }: ProductDetailsModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [nextImagePreloaded, setNextImagePreloaded] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const preloadRef = useRef<HTMLImageElement | null>(null)

  // Preparar array de imagens - para produtos modais, usar apenas a imagem principal
  const images = product.images || []
  
  // Para produtos modais (capas, películas), mostrar apenas a imagem principal
  // Os modelos são apenas variações do produto, não devem ter imagens separadas
  const filteredImages = product.isModalProduct 
    ? images.filter(img => img.isMain)  // Apenas imagem principal para produtos modais
    : images  // Todas as imagens para produtos normais

  // Ordenar imagens com main primeiro
  const sortedImages = filteredImages.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0))

  // Pré-carregar próxima imagem
  const preloadNextImage = useCallback(() => {
    if (sortedImages.length <= 1 || nextImagePreloaded) return
    
    const nextIndex = (currentImageIndex + 1) % sortedImages.length
    const nextImageUrl = sortedImages[nextIndex]?.url
    
    if (nextImageUrl && !preloadRef.current) {
      preloadRef.current = new window.Image()
      preloadRef.current.src = nextImageUrl
      preloadRef.current.onload = () => setNextImagePreloaded(true)
    }
  }, [currentImageIndex, sortedImages, nextImagePreloaded])

  // Controle de renderização do modal
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setCurrentImageIndex(0)
      setImageLoaded(false)
      setNextImagePreloaded(false)
      // Prevenir scroll do body
      document.body.style.overflow = 'hidden'
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
      document.body.style.overflow = ''
      setTimeout(() => setShouldRender(false), 300)
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Pré-carregar próxima imagem quando imagem atual carregar
  useEffect(() => {
    if (imageLoaded) {
      preloadNextImage()
    }
  }, [imageLoaded, preloadNextImage])

  // Navegação de imagens
  const goToNext = useCallback(() => {
    if (sortedImages.length <= 1) return
    setCurrentImageIndex((prev) => (prev + 1) % sortedImages.length)
    setImageLoaded(false)
    setNextImagePreloaded(false)
  }, [sortedImages.length])

  const goToPrev = useCallback(() => {
    if (sortedImages.length <= 1) return
    setCurrentImageIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length)
    setImageLoaded(false)
    setNextImagePreloaded(false)
  }, [sortedImages.length])

  const goToImage = useCallback((index: number) => {
    setCurrentImageIndex(index)
    setImageLoaded(false)
    setNextImagePreloaded(false)
  }, [])

  // Handlers de eventos
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowRight') {
      goToNext()
    } else if (e.key === 'ArrowLeft') {
      goToPrev()
    }
  }, [isOpen, onClose, goToNext, goToPrev])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  // Touch handlers para mobile
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrev()
    }
  }

  // Event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus()
            e.preventDefault()
          }
        }
      }

      document.addEventListener('keydown', handleTabKey)
      firstElement?.focus()

      return () => document.removeEventListener('keydown', handleTabKey)
    }
  }, [isOpen])

  if (!shouldRender) return null

  const currentImage = sortedImages[currentImageIndex]

  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 z-[70] transition-all duration-300 ease-out ${
          isVisible 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={handleOverlayClick}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        onClick={handleOverlayClick}
      >
        <div 
          className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col transition-all duration-300 ease-out transform ${
            isVisible 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
          style={{ contain: 'layout style paint' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              Detalhes do Produto
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Galeria de Imagens */}
            <div className="flex-1 lg:w-2/3 relative bg-gray-50 flex items-center justify-center">
              {currentImage ? (
                <div 
                  className="relative w-full h-full flex items-center justify-center"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="relative max-w-full max-h-full aspect-square">
                    {currentImage.url.startsWith('data:') ? (
                      // Para data URLs, usar img nativa
                      <img
                        src={currentImage.url}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => {
                          console.error('Failed to load image (data URL):', e)
                        }}
                      />
                    ) : (
                      // Para URLs normais, usar Next.js Image
                      <Image
                        src={currentImage.url}
                        alt={product.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        priority={currentImageIndex === 0}
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => {
                          console.error('Failed to load image:', currentImage.url, e)
                        }}
                        quality={85}
                      />
                    )}
                  </div>

                  {/* Setas de navegação */}
                  {sortedImages.length > 1 && (
                    <>
                      <button
                        onClick={goToPrev}
                        onMouseEnter={preloadNextImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center"
                        aria-label="Imagem anterior"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-700" />
                      </button>
                      <button
                        onClick={goToNext}
                        onMouseEnter={preloadNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center"
                        aria-label="Próxima imagem"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Indicadores */}
                  {sortedImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {sortedImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToImage(index)}
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                            index === currentImageIndex 
                              ? 'bg-white scale-125' 
                              : 'bg-white/60 hover:bg-white/80'
                          }`}
                          aria-label={`Ir para imagem ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Brand badge floating on image */}
                  {product.brand && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100/90 text-blue-800 backdrop-blur-sm shadow-lg border border-white/20">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {product.brand}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-gray-400">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Informações do Produto */}
            <div className="flex-1 lg:w-1/3 p-4 lg:p-6 flex flex-col">
              <div className="space-y-3 flex-shrink-0">
                {/* Nome e Subnome na mesma linha */}
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2">
                    {product.name}
                    {product.subname && (
                      <span className="text-lg text-gray-600 font-normal ml-2">
                        {product.subname}
                      </span>
                    )}
                  </h1>
                </div>

                {/* Categoria */}
                {product.category && (
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {typeof product.category === 'object' ? product.category.name : product.category}
                    </span>
                  </div>
                )}

                {/* Descrição */}
                {product.description && (
                  <div className="flex-1 min-h-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Descrição
                    </h3>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm overflow-y-auto">
                      {product.description}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
})

ProductDetailsModal.displayName = 'ProductDetailsModal'

export default ProductDetailsModal
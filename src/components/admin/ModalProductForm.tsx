'use client'

import { useState, useRef } from 'react'

interface ModelInput {
  id: string
  brand: string
  model: string
  price: string
  superWholesalePrice: string
}

interface Category {
  id: string
  name: string
}

interface ModalProductFormProps {
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

export function ModalProductForm({ categories, onSuccess, onCancel }: ModalProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    quickAddIncrement: '25'
  })
  
  const [models, setModels] = useState<ModelInput[]>([])
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addModel = () => {
    const newModel: ModelInput = {
      id: Date.now().toString(),
      brand: '',
      model: '',
      price: '',
      superWholesalePrice: ''
    }
    setModels([...models, newModel])
  }

  const removeModel = (id: string) => {
    setModels(models.filter(model => model.id !== id))
  }

  const updateModel = (id: string, field: keyof ModelInput, value: string) => {
    setModels(models.map(model => 
      model.id === id ? { ...model, [field]: value } : model
    ))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages(files)
  }

  const validateForm = () => {
    if (!formData.name.trim()) return 'Nome é obrigatório'
    if (!formData.description.trim()) return 'Descrição é obrigatória'
    if (!formData.categoryId) return 'Categoria é obrigatória'
    if (selectedImages.length === 0) return 'Pelo menos uma imagem é obrigatória'
    if (models.length === 0) return 'Pelo menos um modelo é obrigatório'
    
    for (const model of models) {
      if (!model.brand.trim()) return 'Marca é obrigatória para todos os modelos'
      if (!model.model.trim()) return 'Nome do modelo é obrigatório'
      if (!model.price.trim()) return 'Preço atacado é obrigatório'
      
      const price = parseFloat(model.price)
      const superPrice = parseFloat(model.superWholesalePrice)
      
      if (isNaN(price) || price <= 0) return 'Preço atacado deve ser um número positivo'
      
      if (model.superWholesalePrice && !isNaN(superPrice)) {
        if (superPrice >= price) return 'Preço super atacado deve ser menor que o preço atacado'
      }
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const submitFormData = new FormData()
      
      // Dados básicos do produto
      submitFormData.append('name', formData.name)
      submitFormData.append('description', formData.description)
      submitFormData.append('categoryId', formData.categoryId)
      submitFormData.append('quickAddIncrement', formData.quickAddIncrement)
      
      // Modelos
      const modelsData = models.map(model => ({
        brandName: model.brand,
        modelName: model.model,
        price: model.price,
        superWholesalePrice: model.superWholesalePrice || undefined
      }))
      submitFormData.append('models', JSON.stringify(modelsData))
      
      // Imagens
      selectedImages.forEach(file => {
        submitFormData.append('images', file)
      })

      const response = await fetch('/api/products/modal', {
        method: 'POST',
        body: submitFormData
      })

      if (response.ok) {
        onSuccess()
      } else {
        const result = await response.json()
        setError(result.error || 'Erro ao criar produto')
      }
    } catch (error) {
      setError('Erro ao criar produto')
      console.error('Erro:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-6">Adicionar Produto Modal</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nome do Produto *
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Categoria *
            </label>
            <select
              id="category"
              required
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Descrição *
          </label>
          <textarea
            id="description"
            required
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Seção de Modelos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Modelos de Celular</h3>
            <button
              type="button"
              onClick={addModel}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
            >
              Adicionar Modelo
            </button>
          </div>

          {models.map((model, index) => (
            <div key={model.id} className="border rounded-lg p-4 mb-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">Modelo {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeModel(model.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remover Modelo
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Marca *
                  </label>
                  <input
                    type="text"
                    placeholder="Marca do modelo"
                    value={model.brand}
                    onChange={(e) => updateModel(model.id, 'brand', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do modelo"
                    value={model.model}
                    onChange={(e) => updateModel(model.id, 'model', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Valor Atacado *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor atacado"
                    value={model.price}
                    onChange={(e) => updateModel(model.id, 'price', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Valor Super Atacado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor super atacado"
                    value={model.superWholesalePrice}
                    onChange={(e) => updateModel(model.id, 'superWholesalePrice', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Validação visual para preços */}
              {model.price && model.superWholesalePrice && 
               parseFloat(model.superWholesalePrice) >= parseFloat(model.price) && (
                <p className="text-red-600 text-xs mt-1">
                  Preço super atacado deve ser menor que o preço atacado
                </p>
              )}
            </div>
          ))}

          {models.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              Nenhum modelo adicionado. Clique em "Adicionar Modelo" para começar.
            </p>
          )}
        </div>

        {/* Upload de Imagens */}
        <div>
          <label htmlFor="images" className="block text-sm font-medium text-gray-700">
            Imagens do Produto *
          </label>
          <input
            id="images"
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          />
          {selectedImages.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {selectedImages.length} arquivo(s) selecionado(s)
            </p>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Criando...' : 'Adicionar Produto Modal'}
          </button>
        </div>
      </form>
    </div>
  )
}
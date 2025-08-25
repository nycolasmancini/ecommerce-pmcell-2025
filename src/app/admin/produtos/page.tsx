'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  subname?: string
  description: string
  brand?: string
  price: number
  superWholesalePrice?: number
  superWholesaleQuantity?: number
  cost?: number
  categoryId: string
  isActive: boolean
  isModalProduct?: boolean
  quickAddIncrement?: number
  category: {
    name: string
  }
  images: Array<{ id: string; url: string; isMain: boolean }>
  models?: Array<{
    id: string
    price: number
    superWholesalePrice?: number
    model?: {
      id: string
      name: string
      brand: { name: string }
    }
    brandName?: string
    modelName?: string
  }>
  createdAt: string
}

interface Category {
  id: string
  name: string
  icon?: string
  order?: number
}

interface Brand {
  id: string
  name: string
  order: number
  models: Model[]
}

interface Model {
  id: string
  name: string
  brandId: string
  brand?: Brand
}

interface ProductModel {
  id: string
  productId: string
  modelId: string
  price?: number
  superWholesalePrice?: number
  model?: Model
}

export default function AdminProdutos() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showModalForm, setShowModalForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    subname: '',
    description: '',
    brand: '',
    price: '',
    superWholesalePrice: '',
    superWholesaleQuantity: '',
    cost: '',
    categoryId: '',
    isActive: true
  })

  const [newModalProduct, setNewModalProduct] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    superWholesalePrice: '',
    quickAddIncrement: '',
    isActive: true
  })

  const [selectedModels, setSelectedModels] = useState<{[key: string]: {selected: boolean, price?: string, wholesalePrice?: string}}>({})
  const [newBrandName, setNewBrandName] = useState('')
  const [newModelName, setNewModelName] = useState('')
  const [selectedBrandForNewModel, setSelectedBrandForNewModel] = useState('')

  useEffect(() => {
    loadProducts()
    loadCategories()
    loadBrands()
  }, [])

  const loadProducts = async () => {
    try {
      console.log('🔍 Buscando produtos...')
      const response = await fetch('/api/products?admin=true')
      console.log('📡 Response status:', response.status, 'ok:', response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Data received:', {
          hasProducts: !!data.products,
          productsLength: data.products?.length || 0,
          isArray: Array.isArray(data.products),
          dataKeys: Object.keys(data),
          firstProduct: data.products?.[0] ? Object.keys(data.products[0]) : 'none'
        })
        
        // A API sempre retorna {products: [], pagination: {}}
        const productsArray = data.products || []
        setProducts(Array.isArray(productsArray) ? productsArray : [])
        console.log('✅ Produtos definidos no estado:', productsArray.length)
        
        // Debug adicional se não houver produtos
        if (productsArray.length === 0) {
          console.log('⚠️ Nenhum produto encontrado. Data completa:', data)
        }
      } else {
        console.error('❌ Erro na API de produtos:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        setProducts([])
      }
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const loadBrands = async () => {
    try {
      console.log('🔍 Carregando brands...')
      const response = await fetch('/api/brands')
      if (response.ok) {
        const data = await response.json()
        setBrands(Array.isArray(data) ? data : [])
        console.log('✅ Brands carregadas:', data.length)
      } else {
        console.error('Erro na API de brands:', response.status)
        setBrands([])
      }
    } catch (error) {
      console.error('Erro ao carregar brands:', error)
      setBrands([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const formData = new FormData()
      formData.append('name', newProduct.name)
      formData.append('subname', newProduct.subname)
      formData.append('description', newProduct.description)
      formData.append('brand', newProduct.brand)
      formData.append('price', newProduct.price)
      formData.append('superWholesalePrice', newProduct.superWholesalePrice)
      formData.append('superWholesaleQuantity', newProduct.superWholesaleQuantity)
      formData.append('cost', newProduct.cost)
      formData.append('categoryId', newProduct.categoryId)
      formData.append('isActive', newProduct.isActive.toString())

      selectedImages.forEach((file) => {
        formData.append('images', file)
      })

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        body: formData,
      })

      if (response.ok) {
        alert(editingProduct ? 'Produto atualizado com sucesso!' : 'Produto adicionado com sucesso!')
        setShowAddForm(false)
        setEditingProduct(null)
        resetForm()
        loadProducts()
      } else {
        alert('Erro ao salvar produto')
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      alert('Erro ao salvar produto')
    }
  }

  const resetForm = () => {
    setNewProduct({
      name: '',
      subname: '',
      description: '',
      brand: '',
      price: '',
      superWholesalePrice: '',
      superWholesaleQuantity: '',
      cost: '',
      categoryId: '',
      isActive: true
    })
    setSelectedImages([])
  }

  const resetModalForm = () => {
    setNewModalProduct({
      name: '',
      description: '',
      categoryId: '',
      price: '',
      superWholesalePrice: '',
      quickAddIncrement: '',
      isActive: true
    })
    setSelectedModels({})
    setSelectedImages([])
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const formData = new FormData()
      formData.append('name', newModalProduct.name)
      formData.append('description', newModalProduct.description)
      formData.append('categoryId', newModalProduct.categoryId)
      formData.append('price', newModalProduct.price)
      formData.append('superWholesalePrice', newModalProduct.superWholesalePrice)
      formData.append('quickAddIncrement', newModalProduct.quickAddIncrement)
      formData.append('isActive', newModalProduct.isActive.toString())
      formData.append('isModalProduct', 'true')

      // Adicionar modelos selecionados
      const selectedModelData = Object.entries(selectedModels)
        .filter(([_, data]) => data.selected)
        .map(([modelId, data]) => ({
          modelId,
          price: data.price ? parseFloat(data.price) : undefined,
          superWholesalePrice: data.wholesalePrice ? parseFloat(data.wholesalePrice) : undefined
        }))
      
      formData.append('models', JSON.stringify(selectedModelData))

      selectedImages.forEach((file) => {
        formData.append('images', file)
      })

      const response = await fetch('/api/products/modal', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        alert('Produto modal adicionado com sucesso!')
        setShowModalForm(false)
        resetModalForm()
        loadProducts()
      } else {
        alert('Erro ao salvar produto modal')
      }
    } catch (error) {
      console.error('Erro ao salvar produto modal:', error)
      alert('Erro ao salvar produto modal')
    }
  }

  const addBrand = async () => {
    if (!newBrandName.trim()) return
    
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newBrandName }),
      })

      if (response.ok) {
        setNewBrandName('')
        loadBrands()
        alert('Marca adicionada com sucesso!')
      } else {
        alert('Erro ao adicionar marca')
      }
    } catch (error) {
      console.error('Erro ao adicionar marca:', error)
    }
  }

  const addModel = async () => {
    if (!newModelName.trim() || !selectedBrandForNewModel) return
    
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newModelName, brandId: selectedBrandForNewModel }),
      })

      if (response.ok) {
        setNewModelName('')
        setSelectedBrandForNewModel('')
        loadBrands()
        alert('Modelo adicionado com sucesso!')
      } else {
        alert('Erro ao adicionar modelo')
      }
    } catch (error) {
      console.error('Erro ao adicionar modelo:', error)
    }
  }

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        selected: !prev[modelId]?.selected
      }
    }))
  }

  const updateModelPrice = (modelId: string, field: 'price' | 'wholesalePrice', value: string) => {
    setSelectedModels(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [field]: value
      }
    }))
  }

  const toggleProductStatus = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !product.isActive }),
      })

      if (response.ok) {
        loadProducts()
      } else {
        alert('Erro ao atualizar status do produto')
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const deleteProduct = async (productId: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          alert('Produto excluído com sucesso!')
          loadProducts()
        } else {
          alert('Erro ao excluir produto')
        }
      } catch (error) {
        console.error('Erro ao excluir produto:', error)
      }
    }
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setNewProduct({
      name: product.name,
      subname: product.subname || '',
      description: product.description,
      brand: product.brand || '',
      price: product.price.toString(),
      superWholesalePrice: product.superWholesalePrice?.toString() || '',
      superWholesaleQuantity: product.superWholesaleQuantity?.toString() || '',
      cost: product.cost?.toString() || '',
      categoryId: product.categoryId,
      isActive: product.isActive
    })
    setShowAddForm(true)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(Array.from(e.target.files))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando produtos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciar Produtos
            </h1>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  resetForm()
                  setEditingProduct(null)
                  setShowAddForm(!showAddForm)
                  setShowModalForm(false)
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                {showAddForm ? 'Cancelar' : 'Adicionar Produto'}
              </button>
              <button
                onClick={() => {
                  resetModalForm()
                  setShowModalForm(!showModalForm)
                  setShowAddForm(false)
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                {showModalForm ? 'Cancelar' : 'Adicionar Produto Modal'}
              </button>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Formulário de Adicionar/Editar */}
        {showAddForm && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subnome
                  </label>
                  <input
                    type="text"
                    value={newProduct.subname}
                    onChange={(e) => setNewProduct({...newProduct, subname: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria *
                  </label>
                  <select
                    required
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({...newProduct, categoryId: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preço *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preço Atacado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.superWholesalePrice}
                    onChange={(e) => setNewProduct({...newProduct, superWholesalePrice: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantidade Mín. Atacado
                  </label>
                  <input
                    type="number"
                    value={newProduct.superWholesaleQuantity}
                    onChange={(e) => setNewProduct({...newProduct, superWholesaleQuantity: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Custo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({...newProduct, cost: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Descrição *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Imagens do Produto
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
                {selectedImages.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedImages.length} arquivo(s) selecionado(s)
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newProduct.isActive}
                    onChange={(e) => setNewProduct({...newProduct, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-green-600 shadow-sm focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Produto ativo</span>
                </label>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  {editingProduct ? 'Atualizar Produto' : 'Adicionar Produto'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingProduct(null)
                    resetForm()
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulário de Produto Modal */}
        {showModalForm && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Adicionar Produto Modal (Capas/Películas)
              </h2>
            </div>
            <form onSubmit={handleModalSubmit} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={newModalProduct.name}
                    onChange={(e) => setNewModalProduct({...newModalProduct, name: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria *
                  </label>
                  <select
                    required
                    value={newModalProduct.categoryId}
                    onChange={(e) => setNewModalProduct({...newModalProduct, categoryId: e.target.value})}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preço Base *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newModalProduct.price}
                    onChange={(e) => setNewModalProduct({...newModalProduct, price: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preço Atacado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newModalProduct.superWholesalePrice}
                    onChange={(e) => setNewModalProduct({...newModalProduct, superWholesalePrice: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Incremento Adição Rápida
                  </label>
                  <select
                    value={newModalProduct.quickAddIncrement}
                    onChange={(e) => setNewModalProduct({...newModalProduct, quickAddIncrement: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Selecione</option>
                    <option value="10">10 unidades</option>
                    <option value="25">25 unidades</option>
                    <option value="50">50 unidades</option>
                    <option value="100">100 unidades</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Descrição *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newModalProduct.description}
                  onChange={(e) => setNewModalProduct({...newModalProduct, description: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Seção de Modelos */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Modelos de Celular</h3>
                
                {/* Adicionar nova marca */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Adicionar Nova Marca</h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Nome da marca"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={addBrand}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      Adicionar Marca
                    </button>
                  </div>
                </div>

                {/* Adicionar novo modelo */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Adicionar Novo Modelo</h4>
                  <div className="flex space-x-2">
                    <select
                      value={selectedBrandForNewModel}
                      onChange={(e) => setSelectedBrandForNewModel(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Selecione uma marca</option>
                      {Array.isArray(brands) && brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="Nome do modelo"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={addModel}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      Adicionar Modelo
                    </button>
                  </div>
                </div>

                {/* Lista de marcas e modelos */}
                <div className="max-h-96 overflow-y-auto">
                  {Array.isArray(brands) && brands.length > 0 ? (
                    brands.map((brand) => (
                      <div key={brand.id} className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">{brand.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Array.isArray(brand.models) && brand.models.map((model) => (
                            <div key={model.id} className="border rounded-lg p-3">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedModels[model.id]?.selected || false}
                                  onChange={() => toggleModelSelection(model.id)}
                                  className="rounded border-gray-300 text-purple-600 shadow-sm focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium">{model.name}</span>
                              </label>
                              
                              {selectedModels[model.id]?.selected && (
                                <div className="mt-2 space-y-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                      Preço Específico
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={selectedModels[model.id]?.price || ''}
                                      onChange={(e) => updateModelPrice(model.id, 'price', e.target.value)}
                                      className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                                      placeholder="Usar preço base"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700">
                                      Preço Atacado Específico
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={selectedModels[model.id]?.wholesalePrice || ''}
                                      onChange={(e) => updateModelPrice(model.id, 'wholesalePrice', e.target.value)}
                                      className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                                      placeholder="Usar preço atacado base"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Nenhuma marca/modelo disponível. Adicione marcas e modelos primeiro para usar produtos modais.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Imagens do Produto
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
                {selectedImages.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedImages.length} arquivo(s) selecionado(s)
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newModalProduct.isActive}
                    onChange={(e) => setNewModalProduct({...newModalProduct, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-purple-600 shadow-sm focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Produto ativo</span>
                </label>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                >
                  Adicionar Produto Modal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModalForm(false)
                    resetModalForm()
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Produtos */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Produtos Cadastrados ({products.length})
            </h2>
          </div>
          
          {products.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum produto cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(products) && products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.images.length > 0 && (
                            <img
                              src={product.images.find(img => img.isMain)?.url || product.images[0].url}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              {product.isModalProduct && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  📱 Modal
                                </span>
                              )}
                              {product.quickAddIncrement && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  +{product.quickAddIncrement}
                                </span>
                              )}
                            </div>
                            {product.subname && (
                              <div className="text-sm text-gray-500">
                                {product.subname}
                              </div>
                            )}
                            {product.brand && (
                              <div className="text-xs text-gray-400">
                                {product.brand}
                              </div>
                            )}
                            {product.isModalProduct && product.models && product.models.length > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                {product.models.length} modelo{product.models.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.category?.name || 'Sem categoria'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>R$ {product.price.toFixed(2)}</div>
                        {product.superWholesalePrice && (
                          <div className="text-xs text-gray-500">
                            Atacado: R$ {product.superWholesalePrice.toFixed(2)}
                            {product.superWholesaleQuantity && ` (min: ${product.superWholesaleQuantity})`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => startEdit(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className={product.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        >
                          {product.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
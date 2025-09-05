'use client'

import React, { useState, useCallback } from 'react'
import { Phone, Search, X } from 'lucide-react'

interface PhoneSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function PhoneSearchInput({
  value,
  onChange,
  placeholder = "Buscar por telefone...",
  className = ''
}: PhoneSearchInputProps) {
  const [inputValue, setInputValue] = useState(value)
  
  // Função para aplicar máscara de telefone durante digitação
  const formatPhoneInput = (input: string): string => {
    // Se já começa com +55, preservar
    if (input.startsWith('+55')) {
      const numbersOnly = input.substring(3).replace(/\D/g, '')
      
      if (numbersOnly.length <= 2) {
        return `+55 (${numbersOnly}`
      } else if (numbersOnly.length <= 7) {
        return `+55 (${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2)}`
      } else if (numbersOnly.length <= 11) {
        return `+55 (${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 7)}-${numbersOnly.slice(7)}`
      } else {
        // Limitar a 11 dígitos após +55
        return `+55 (${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 7)}-${numbersOnly.slice(7, 11)}`
      }
    }
    
    // Remove todos os caracteres não numéricos
    const cleanInput = input.replace(/\D/g, '')
    
    // Aplica formatação conforme o número de dígitos
    if (cleanInput.length <= 2) {
      return `+55 (${cleanInput}`
    } else if (cleanInput.length <= 7) {
      return `+55 (${cleanInput.slice(0, 2)}) ${cleanInput.slice(2)}`
    } else if (cleanInput.length <= 11) {
      return `+55 (${cleanInput.slice(0, 2)}) ${cleanInput.slice(2, 7)}-${cleanInput.slice(7)}`
    } else {
      // Limitar a 11 dígitos
      return `+55 (${cleanInput.slice(0, 2)}) ${cleanInput.slice(2, 7)}-${cleanInput.slice(7, 11)}`
    }
  }
  
  // Função para validar se é um número de telefone válido
  const isValidPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.length >= 10 && cleanPhone.length <= 11
  }
  
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    
    // Se o usuário está apagando, permitir qualquer valor
    if (newValue.length < inputValue.length) {
      setInputValue(newValue)
      return
    }
    
    // Aplicar formatação apenas se contém números
    if (/\d/.test(newValue) || newValue === '') {
      const formatted = formatPhoneInput(newValue)
      setInputValue(formatted)
    }
  }, [inputValue])
  
  const handleSearch = useCallback(() => {
    // Limpar formatação para busca (manter apenas números)
    const cleanPhone = inputValue.replace(/\D/g, '')
    onChange(cleanPhone)
  }, [inputValue, onChange])
  
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])
  
  const handleClear = useCallback(() => {
    setInputValue('')
    onChange('')
  }, [onChange])
  
  // Detectar se o valor atual é uma busca válida
  const hasValidSearch = inputValue.replace(/\D/g, '').length >= 3
  const isSearching = value !== ''
  
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Phone className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">Busca por Telefone</h3>
      </div>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={15} // (11) 99999-9999
        />
        
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Botão de busca quando há valor válido */}
      {hasValidSearch && (
        <button
          onClick={handleSearch}
          className="w-full mt-3 py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Buscar Telefone
        </button>
      )}
      
      {/* Exemplos de formato */}
      <div className="mt-3 text-xs text-gray-500">
        <p className="font-medium mb-1">Formatos aceitos:</p>
        <ul className="space-y-0.5 text-gray-400">
          <li>• +55 (11) 98765-4321</li>
          <li>• 11987654321</li>
          <li>• (11) 98765-4321</li>
          <li>• 11 98765-4321</li>
          <li>• +55 11 98765-4321</li>
        </ul>
      </div>
      
      {/* Indicador de busca ativa */}
      {isSearching && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800 flex items-center justify-between">
          <div>
            <strong>Buscando:</strong> {formatPhoneInput(value)}
          </div>
          <button
            onClick={handleClear}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpar
          </button>
        </div>
      )}
      
      {/* Validação visual */}
      {inputValue && !hasValidSearch && (
        <div className="mt-2 text-xs text-yellow-600">
          Digite pelo menos 3 números para buscar
        </div>
      )}
    </div>
  )
}
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ImageUploader from '@/components/admin/ImageUploader'

describe('ImageUploader', () => {
  const mockOnChange = jest.fn()
  
  const defaultProps = {
    onChange: mockOnChange,
    selectedImages: [],
    maxFiles: 5,
    accept: 'image/*'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve renderizar botão de upload customizado', () => {
    render(<ImageUploader {...defaultProps} />)
    
    expect(screen.getByRole('button', { name: /adicionar fotos/i })).toBeInTheDocument()
    expect(screen.getByText('Clique ou arraste imagens aqui')).toBeInTheDocument()
  })

  it('deve esconder o input nativo de arquivo', () => {
    render(<ImageUploader {...defaultProps} />)
    
    const fileInput = screen.getByRole('button', { name: /adicionar fotos/i }).querySelector('input')
    expect(fileInput).toHaveStyle('display: none')
  })

  it('deve mostrar contador de arquivos selecionados', () => {
    const selectedImages = [
      new File([''], 'image1.jpg', { type: 'image/jpeg' }),
      new File([''], 'image2.jpg', { type: 'image/jpeg' })
    ]
    
    render(<ImageUploader {...defaultProps} selectedImages={selectedImages} />)
    
    expect(screen.getByText('2 arquivo(s) selecionado(s)')).toBeInTheDocument()
  })

  it('deve chamar onChange ao selecionar arquivos', () => {
    render(<ImageUploader {...defaultProps} />)
    
    const file1 = new File([''], 'image1.jpg', { type: 'image/jpeg' })
    const file2 = new File([''], 'image2.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2],
      writable: false
    })
    
    fireEvent.change(fileInput)
    
    expect(mockOnChange).toHaveBeenCalledWith([file1, file2])
  })

  it('deve mostrar preview das imagens selecionadas', async () => {
    const file1 = new File([''], 'image1.jpg', { type: 'image/jpeg' })
    const selectedImages = [file1]
    
    render(<ImageUploader {...defaultProps} selectedImages={selectedImages} />)
    
    await waitFor(() => {
      expect(screen.getByText('image1.jpg')).toBeInTheDocument()
    })
  })

  it('deve permitir remover imagem do preview', async () => {
    const file1 = new File([''], 'image1.jpg', { type: 'image/jpeg' })
    const file2 = new File([''], 'image2.jpg', { type: 'image/jpeg' })
    const selectedImages = [file1, file2]
    
    render(<ImageUploader {...defaultProps} selectedImages={selectedImages} />)
    
    await waitFor(() => {
      expect(screen.getByText('image1.jpg')).toBeInTheDocument()
    })

    const removeButtons = screen.getAllByLabelText(/remover imagem/i)
    fireEvent.click(removeButtons[0])
    
    expect(mockOnChange).toHaveBeenCalledWith([file2])
  })

  it('deve mostrar botão para limpar todas as seleções', () => {
    const selectedImages = [
      new File([''], 'image1.jpg', { type: 'image/jpeg' })
    ]
    
    render(<ImageUploader {...defaultProps} selectedImages={selectedImages} />)
    
    const clearButton = screen.getByRole('button', { name: /limpar seleção/i })
    expect(clearButton).toBeInTheDocument()
    
    fireEvent.click(clearButton)
    expect(mockOnChange).toHaveBeenCalledWith([])
  })

  it('deve respeitar limite máximo de arquivos', () => {
    render(<ImageUploader {...defaultProps} maxFiles={2} />)
    
    const file1 = new File([''], 'image1.jpg', { type: 'image/jpeg' })
    const file2 = new File([''], 'image2.jpg', { type: 'image/jpeg' })
    const file3 = new File([''], 'image3.jpg', { type: 'image/jpeg' })
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2, file3],
      writable: false
    })
    
    fireEvent.change(fileInput)
    
    // Deve manter apenas os 2 primeiros arquivos
    expect(mockOnChange).toHaveBeenCalledWith([file1, file2])
  })

  it('deve validar tipos de arquivo aceitos', () => {
    render(<ImageUploader {...defaultProps} accept="image/jpeg" />)
    
    const validFile = new File([''], 'image1.jpg', { type: 'image/jpeg' })
    const invalidFile = new File([''], 'document.pdf', { type: 'application/pdf' })
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(fileInput, 'files', {
      value: [validFile, invalidFile],
      writable: false
    })
    
    fireEvent.change(fileInput)
    
    // Deve manter apenas o arquivo válido
    expect(mockOnChange).toHaveBeenCalledWith([validFile])
  })

  it('deve suportar drag and drop', async () => {
    render(<ImageUploader {...defaultProps} />)
    
    const dropZone = screen.getByText(/clique ou arraste imagens aqui/i).closest('div')
    const file = new File([''], 'image1.jpg', { type: 'image/jpeg' })
    
    const dragOverEvent = new Event('dragover', { bubbles: true })
    const dropEvent = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file]
      }
    })
    
    fireEvent(dropZone!, dragOverEvent)
    fireEvent(dropZone!, dropEvent)
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([file])
    })
  })

  it('deve mostrar feedback visual durante drag over', () => {
    render(<ImageUploader {...defaultProps} />)
    
    const dropZone = screen.getByText(/clique ou arraste imagens aqui/i).closest('div')
    
    fireEvent.dragOver(dropZone!)
    expect(dropZone).toHaveClass('border-orange-500')
    
    fireEvent.dragLeave(dropZone!)
    expect(dropZone).not.toHaveClass('border-orange-500')
  })

  it('deve validar tamanho máximo de arquivo', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    
    render(<ImageUploader {...defaultProps} maxFileSize={1024} />)
    
    // Arquivo grande (2KB)
    const largeFile = new File(['a'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' })
    const smallFile = new File(['a'], 'small.jpg', { type: 'image/jpeg' })
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(fileInput, 'files', {
      value: [largeFile, smallFile],
      writable: false
    })
    
    fireEvent.change(fileInput)
    
    expect(alertSpy).toHaveBeenCalledWith('Arquivo "large.jpg" é muito grande. Tamanho máximo: 1.02 KB')
    expect(mockOnChange).toHaveBeenCalledWith([smallFile])
    
    alertSpy.mockRestore()
  })

  it('deve mostrar indicador de loading durante preview', async () => {
    const file = new File([''], 'image1.jpg', { type: 'image/jpeg' })
    
    render(<ImageUploader {...defaultProps} selectedImages={[file]} />)
    
    // Simular delay no carregamento do preview
    expect(screen.getByText('Carregando preview...')).toBeInTheDocument()
  })
})
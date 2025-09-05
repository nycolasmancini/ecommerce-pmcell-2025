import { formatPhoneNumber } from '../useVisitStore'

describe('formatPhoneNumber with +55', () => {
  it('deve adicionar +55 e formatar número de celular (11 dígitos)', () => {
    const result = formatPhoneNumber('11987654321')
    expect(result).toBe('+55 (11) 98765-4321')
  })

  it('deve adicionar +55 e formatar número fixo (10 dígitos)', () => {
    const result = formatPhoneNumber('1133334444')
    expect(result).toBe('+55 (11) 3333-4444')
  })

  it('deve manter +55 se já estiver presente no início', () => {
    const result = formatPhoneNumber('+5511987654321')
    expect(result).toBe('+55 (11) 98765-4321')
  })

  it('deve manter +55 se já estiver formatado', () => {
    const result = formatPhoneNumber('+55 (11) 98765-4321')
    expect(result).toBe('+55 (11) 98765-4321')
  })

  it('deve adicionar +55 mesmo com espaços e caracteres especiais', () => {
    const result = formatPhoneNumber('(11) 98765-4321')
    expect(result).toBe('+55 (11) 98765-4321')
  })

  it('deve adicionar +55 mesmo com pontos e traços', () => {
    const result = formatPhoneNumber('11.98765.4321')
    expect(result).toBe('+55 (11) 98765-4321')
  })

  it('deve retornar "Não informado" quando phone for null', () => {
    const result = formatPhoneNumber(null)
    expect(result).toBe('Não informado')
  })

  it('deve retornar "Não informado" quando phone for string vazia', () => {
    const result = formatPhoneNumber('')
    expect(result).toBe('Não informado')
  })

  it('deve retornar o número original com +55 se não conseguir formatar', () => {
    const result = formatPhoneNumber('123')
    expect(result).toBe('+55 123')
  })

  it('deve remover apenas um +55 se houver múltiplos', () => {
    const result = formatPhoneNumber('+55+5511987654321')
    expect(result).toBe('+55 (11) 98765-4321')
  })

  it('deve formatar número com código de país diferente mantendo o original', () => {
    const result = formatPhoneNumber('+1234567890')
    expect(result).toBe('+1234567890')
  })

  it('deve adicionar +55 para número com 9 dígitos (formato antigo sem DDD)', () => {
    const result = formatPhoneNumber('987654321')
    expect(result).toBe('+55 987654321')
  })

  it('deve formatar corretamente número com 12 dígitos (DDI + DDD + número)', () => {
    const result = formatPhoneNumber('5511987654321')
    expect(result).toBe('+55 (11) 98765-4321')
  })
})
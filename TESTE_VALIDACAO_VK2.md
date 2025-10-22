# Teste de Validação - Virtual Keyboard v2.0

## Testes a Executar

### TESTE 1: Desktop - Clique em Tecla
**Procedimento:**
1. Abrir Terra MIDI no navegador desktop (Chrome, Firefox, Safari)
2. Clicar em qualquer tecla do teclado virtual
3. Abrir console (F12)

**Validação:**
- [ ] Lista de instrumentos (#instrument-catalog-panel) abre
- [ ] Painel vk-config-panel NÃO aparece
- [ ] Console mostra "📂 Lista de instrumentos aberta"
- [ ] Scroll funciona na lista

---

### TESTE 2: Mobile - Toque em Tecla
**Procedimento:**
1. Abrir Terra MIDI em smartphone/tablet (iOS ou Android)
2. Tocar em qualquer tecla do teclado virtual
3. Abrir console de desenvolvedor

**Validação:**
- [ ] Lista abre instantaneamente (sem delay)
- [ ] Sem travamento ou congelamento
- [ ] Scroll na lista funciona suavemente
- [ ] Sem erros no console

---

### TESTE 3: Bloqueio de Instrumentos
**Procedimento:**
1. Configurar 1-2 notas com soundfonts individuais
2. Observar botão toggle-quick-instrument-lock

**Validação:**
- [ ] Botão aparece/desaparece conforme esperado
- [ ] Estado de bloqueio persiste
- [ ] Clique em nota continua abrindo lista
- [ ] Clicar no botão limpa assignments e libera notas

---

### TESTE 4: Seleção de Instrumento
**Procedimento:**
1. Abrir lista de instrumentos
2. Selecionar um instrumento da lista
3. Verificar aplicação do instrumento

**Validação:**
- [ ] Instrumento é carregado
- [ ] Seleção reflete na UI
- [ ] Soundfont global é aplicado corretamente

---

### TESTE 5: Board Bells (se disponível)
**Procedimento:**
1. Conectar Board Bells via USB
2. Pressionar nota no Board Bells
3. Verificar comportamento

**Validação:**
- [ ] Nota toca no Virtual Keyboard
- [ ] Lista NÃO abre (MIDI não deve abrir UI)
- [ ] Feedback visual funciona
- [ ] Assignments sincronizam

---

## Checklist de Regressão

- [ ] Audio playback funciona
- [ ] Favorites funcionam
- [ ] Local storage funciona
- [ ] Sem memory leaks (verificar DevTools)
- [ ] Performance adequada (scroll suave)
- [ ] Sem console errors

---

## Relatório de Bugs

Se encontrar problemas, registre:
1. **O que fazer**: Passos para reproduzir
2. **O que esperava**: Comportamento esperado
3. **O que viu**: Comportamento real
4. **Console errors**: Print do console (F12)
5. **Device**: Desktop/Mobile, SO, navegador


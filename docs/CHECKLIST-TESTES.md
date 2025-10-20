# ✅ Checklist de Teste - Compatibilidade Chrome

## 🎯 Objetivo
Verificar se todas as melhorias implementadas para compatibilidade do Midi-Terra com Chrome estão funcionando corretamente.

---

## 📋 Testes Obrigatórios

### ✅ Teste 1: Servidor HTTPS Local

**Objetivo:** Verificar se o script de servidor HTTPS funciona

**Passos:**
1. Abra PowerShell na pasta do projeto
2. Execute: `.\start-https-server.ps1`
3. Aguarde inicialização
4. Acesse: `https://localhost:8443`

**Resultado Esperado:**
- ✅ Script instala mkcert (se necessário)
- ✅ Certificados são gerados
- ✅ Servidor inicia na porta 8443
- ✅ Página carrega em HTTPS sem avisos de segurança
- ✅ Console mostra: "Contexto seguro: true"

---

### ✅ Teste 2: Detecção de Contexto Inseguro

**Objetivo:** Verificar se guia aparece em HTTP puro

**Passos:**
1. Acesse o site via HTTP (sem HTTPS)
2. Ou acesse com IP remoto não seguro
3. Observe o console e interface

**Resultado Esperado:**
- ✅ Console mostra erro: "Web MIDI requer contexto seguro"
- ✅ Notificação visual aparece
- ✅ Guia de troubleshooting abre automaticamente após 1 segundo
- ✅ Guia mostra seção "Contexto Inseguro"
- ✅ Instruções de HTTPS são exibidas

---

### ✅ Teste 3: Permissão MIDI Negada

**Objetivo:** Verificar comportamento quando usuário nega permissão

**Passos:**
1. Acesse via HTTPS ou localhost
2. Quando prompt MIDI aparecer, clique em "Bloquear/Negar"
3. Observe o comportamento

**Resultado Esperado:**
- ✅ Console mostra: "Permissão MIDI negada"
- ✅ Notificação visual aparece
- ✅ Guia de troubleshooting abre automaticamente
- ✅ Guia mostra seção "Permissão MIDI Negada"
- ✅ Link para chrome://settings/content/midiDevices é exibido

---

### ✅ Teste 4: Dispositivo Não Detectado no Chrome

**Objetivo:** Verificar comportamento quando não há dispositivos

**Passos:**
1. Desconecte o Midi-Terra
2. Abra Chrome em HTTPS/localhost
3. Permita acesso MIDI
4. Aguarde scan de dispositivos

**Resultado Esperado:**
- ✅ Console mostra: "Nenhum dispositivo Terra detectado"
- ✅ Notificação visual aparece
- ✅ Guia de troubleshooting abre automaticamente após 2 segundos
- ✅ Guia mostra seção "Dispositivo não detectado"
- ✅ Checklist de verificação é exibida
- ✅ Aviso sobre fechar Edge é exibido (se Chrome)

---

### ✅ Teste 5: Conflito com Edge

**Objetivo:** Verificar detecção de conflito entre navegadores

**Passos:**
1. Conecte o Midi-Terra
2. Abra Microsoft Edge
3. Conecte o dispositivo no Edge
4. Abra Chrome (sem fechar Edge)
5. Tente conectar no Chrome

**Resultado Esperado:**
- ✅ Chrome não detecta dispositivo
- ✅ Console mostra aviso sobre uso exclusivo
- ✅ Guia aparece com instruções para fechar Edge
- ✅ Após fechar Edge, reconectar funciona

---

### ✅ Teste 6: Conexão Bem-Sucedida no Chrome

**Objetivo:** Verificar fluxo completo de sucesso

**Passos:**
1. Feche todos os navegadores
2. Conecte o Midi-Terra
3. Inicie servidor HTTPS: `.\start-https-server.ps1`
4. Acesse `https://localhost:8443` no Chrome
5. Clique em "Permitir" no prompt MIDI

**Resultado Esperado:**
- ✅ Console mostra: "Midi-Terra detectado"
- ✅ Notificação de sucesso aparece
- ✅ Dispositivo conecta e responde
- ✅ Tocar no dispositivo produz som
- ✅ Nenhum erro no console

---

### ✅ Teste 7: Compatibilidade Edge (Regressão)

**Objetivo:** Garantir que mudanças não quebraram Edge

**Passos:**
1. Abra Microsoft Edge
2. Acesse o site (pode ser HTTP)
3. Conecte dispositivo

**Resultado Esperado:**
- ✅ Edge continua funcionando normalmente
- ✅ Dispositivo é detectado
- ✅ Sem erros ou avisos desnecessários
- ✅ Performance mantida

---

### ✅ Teste 8: Documentação

**Objetivo:** Verificar se documentação está acessível e completa

**Passos:**
1. Abra `README.md`
2. Clique no link para troubleshooting
3. Leia `docs/TROUBLESHOOTING-CHROME.md`

**Resultado Esperado:**
- ✅ Link funciona
- ✅ Documento renderiza corretamente
- ✅ Todos os links internos funcionam
- ✅ Comandos são copiáveis
- ✅ Instruções são claras

---

### ✅ Teste 9: Interface do Guia Visual

**Objetivo:** Verificar usabilidade do guia de troubleshooting

**Passos:**
1. Force abertura do guia (negando permissão)
2. Teste interatividade

**Resultado Esperado:**
- ✅ Modal aparece centralizado
- ✅ Backdrop escuro está presente
- ✅ Botão X fecha o guia
- ✅ Clicar fora fecha o guia
- ✅ Checkboxes são clicáveis
- ✅ Hover nos itens funciona
- ✅ Texto é legível
- ✅ Cores são adequadas

---

### ✅ Teste 10: Console do Navegador

**Objetivo:** Verificar qualidade dos logs

**Passos:**
1. Abra console (F12)
2. Recarregue página
3. Observe logs durante inicialização

**Resultado Esperado:**
- ✅ Logs organizados com emojis
- ✅ Separadores visuais presentes
- ✅ Informações de navegador são exibidas
- ✅ Verificações de compatibilidade são logadas
- ✅ Nenhum erro desnecessário
- ✅ Warnings são justificados

---

## 🐛 Problemas Conhecidos

### Issue 1: mkcert não instala automaticamente
**Workaround:** Instalar manualmente via Chocolatey ou Scoop

### Issue 2: Porta 8443 já em uso
**Workaround:** Modificar script para usar porta diferente

### Issue 3: Certificado não confiável
**Workaround:** Executar `mkcert -install` como administrador

---

## 📊 Matriz de Testes

| Teste | Chrome 115+ | Edge 79+ | HTTP | HTTPS | localhost |
|---|---|---|---|---|---|
| **Contexto Seguro** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Permissão** | ✅ | ✅ | N/A | ✅ | ✅ |
| **Detecção Dispositivo** | ✅ | ✅ | N/A | ✅ | ✅ |
| **Conflito Apps** | ⚠️ | ⚠️ | N/A | ⚠️ | ⚠️ |
| **Guia Visual** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Documentação** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legenda:**
- ✅ Deve funcionar
- ❌ Bloqueado/erro esperado
- ⚠️ Depende de outros fatores
- N/A Não aplicável

---

## 🎯 Critérios de Aceitação

Para considerar a implementação completa, todos os itens devem ser ✅:

- [ ] **Teste 1** - Servidor HTTPS local funciona
- [ ] **Teste 2** - Detecção de contexto inseguro
- [ ] **Teste 3** - Tratamento de permissão negada
- [ ] **Teste 4** - Detecção de dispositivo ausente
- [ ] **Teste 5** - Detecção de conflito com Edge
- [ ] **Teste 6** - Conexão bem-sucedida no Chrome
- [ ] **Teste 7** - Edge continua funcionando
- [ ] **Teste 8** - Documentação completa e acessível
- [ ] **Teste 9** - Interface do guia funcional
- [ ] **Teste 10** - Logs informativos e organizados

---

## 📝 Relatório de Testes

### Testado por: _______________
### Data: _______________
### Navegador: Chrome ___ / Edge ___
### Sistema: Windows ___ / Linux ___ / Mac ___

### Observações:
```
[Escreva aqui quaisquer observações, bugs encontrados ou sugestões]
```

---

**Última atualização:** 17 de outubro de 2025  
**Versão:** 1.0.0

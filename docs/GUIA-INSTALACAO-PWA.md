# 📲 Guia de Instalação do Terra MIDI PWA

## 🎵 O que é o Terra MIDI PWA?

O Terra MIDI é um **Progressive Web App (PWA)** - um aplicativo web moderno que pode ser instalado em seu dispositivo e funciona como um aplicativo nativo, com acesso offline e recursos avançados.

---

## ✨ Vantagens de Instalar o Terra MIDI

### 🚀 Desempenho Superior
- **Acesso instantâneo** - Abra diretamente da tela inicial
- **Funciona offline** - Continue usando mesmo sem internet
- **Carregamento rápido** - Cache inteligente para melhor performance

### 🎹 Recursos Exclusivos
- **Armazenamento persistente** - Seus soundfonts e configurações nunca são apagados
- **Pasta local personalizada** - Escolha onde armazenar os dados do app
- **Atualizações automáticas** - Sempre na versão mais recente
- **Modo standalone** - Interface limpa sem barras do navegador

### 🔒 Segurança e Privacidade
- **Dados locais** - Tudo armazenado em seu dispositivo
- **HTTPS seguro** - Conexão criptografada
- **Sem rastreamento** - Privacidade total garantida

---

## 📱 Como Instalar

### 🖥️ **Windows / Desktop**

#### **Google Chrome**
1. Abra o Terra MIDI no Chrome
2. Clique no botão **"📲 Instalar App"** no painel de log do sistema
3. Ou clique no ícone ⊕ na barra de endereço
4. Ou vá em **Menu (⋮)** → **Instalar Terra MIDI...**
5. Clique em **Instalar**
6. Pronto! O app será aberto em uma janela separada

#### **Microsoft Edge**
1. Abra o Terra MIDI no Edge
2. Clique no botão **"📲 Instalar App"** no painel de log
3. Ou clique em **Menu (⋯)** → **Aplicativos** → **Instalar este site como um aplicativo**
4. Dê um nome (já vem preenchido como "Terra MIDI")
5. Clique em **Instalar**
6. O app será instalado e criará um atalho na área de trabalho

#### **Brave / Opera**
- Mesmo processo do Chrome (ícone ⊕ na barra de endereço)

---

### 📱 **Android**

#### **Chrome Android**
1. Abra o Terra MIDI no Chrome
2. Toque no botão **"📲 Instalar App"** (se disponível)
3. Ou toque em **Menu (⋮)** → **Instalar aplicativo**
4. Toque em **Instalar**
5. O ícone do Terra MIDI aparecerá na tela inicial

#### **Samsung Internet**
1. Abra o Terra MIDI
2. Toque no **Menu** → **Adicionar página a**
3. Selecione **Tela inicial**
4. Pronto!

---

### 🍎 **iOS / iPadOS**

⚠️ **Nota**: No iOS, o PWA é instalado de forma diferente (Safari não suporta `beforeinstallprompt`)

#### **Safari iOS**
1. Abra o Terra MIDI no Safari
2. Toque no botão **Compartilhar** (ícone ⬆️)
3. Role para baixo e toque em **"Adicionar à Tela de Início"**
4. Edite o nome se desejar
5. Toque em **Adicionar**
6. O ícone do Terra MIDI aparecerá na tela inicial

**Recursos no iOS:**
- ✅ Funciona offline
- ✅ Ícone na tela inicial
- ✅ Splash screen personalizada
- ⚠️ Armazenamento local limitado (sem File System Access API)

---

## 🔧 Recursos Avançados Após Instalação

### 📂 **Seleção de Pasta Local** (Desktop)

Após instalar no **Chrome/Edge Desktop**, você pode escolher uma pasta específica para armazenar os dados do Terra MIDI:

1. No painel de log do sistema, clique em **"📲 Instalar App"**
2. Após a instalação, será perguntado: **"Escolher pasta de armazenamento?"**
3. Clique em **"📂 Escolher Pasta"**
4. Navegue até a pasta desejada (ex: `Documents/TerraMIDI`)
5. Clique em **Selecionar pasta**
6. Pronto! Todos os soundfonts e configurações serão salvos lá

**Vantagens:**
- ✅ Controle total sobre onde os dados ficam
- ✅ Backup fácil (basta copiar a pasta)
- ✅ Sincronização com nuvem (OneDrive, Google Drive, etc.)
- ✅ Capacidade de armazenamento ilimitada

---

### 💾 **Armazenamento Persistente**

O Terra MIDI solicita **persistência de armazenamento** automaticamente:

- **Chrome/Edge**: Concedido automaticamente após instalação
- **Outros navegadores**: Pode requerer aprovação manual

**Benefício:** Seus dados **nunca serão apagados** pelo navegador, mesmo com pouco espaço em disco.

---

## 🛠️ Gerenciando o App Instalado

### **Desinstalar no Windows/Desktop**

#### Chrome:
1. Abra o app instalado
2. Menu (⋮) → **Desinstalar Terra MIDI**
3. Ou vá em `chrome://apps` e clique com botão direito → **Remover do Chrome**

#### Edge:
1. **Configurações** → **Aplicativos** → **Aplicativos instalados**
2. Encontre **Terra MIDI** → **Desinstalar**

### **Desinstalar no Android**
1. Mantenha pressionado o ícone do Terra MIDI
2. Toque em **Desinstalar** ou arraste para **Desinstalar**

### **Remover no iOS**
1. Mantenha pressionado o ícone do Terra MIDI
2. Toque em **Remover App** → **Remover da Tela de Início**

---

## ❓ Perguntas Frequentes

### **1. O que acontece com meus dados se eu desinstalar?**
- Dados do **cache** são removidos
- Dados do **IndexedDB** (favoritos, configurações) permanecem
- Se escolheu uma **pasta local**, os arquivos permanecem intactos

### **2. Preciso de internet para usar?**
- **Não!** Após instalado, o Terra MIDI funciona 100% offline
- Soundfonts já baixados ficam em cache
- Apenas novos downloads precisam de conexão

### **3. Como atualizar o app?**
- Atualizações são **automáticas**
- Quando disponível, você verá: *"Nova versão disponível!"*
- O app recarrega automaticamente

### **4. Quanto espaço em disco é necessário?**
- **Mínimo:** 50 MB (app base + soundfonts essenciais)
- **Recomendado:** 500 MB+ (para biblioteca completa de instrumentos)

### **5. Funciona em todos os navegadores?**
| Navegador | Desktop | Mobile | Pasta Local | Offline |
|-----------|---------|--------|-------------|---------|
| Chrome    | ✅      | ✅     | ✅          | ✅      |
| Edge      | ✅      | ✅     | ✅          | ✅      |
| Brave     | ✅      | ✅     | ✅          | ✅      |
| Safari    | ⚠️      | ⚠️     | ❌          | ✅      |
| Firefox   | ⚠️      | ⚠️     | ❌          | ✅      |

⚠️ = Instalação manual (sem botão automático)

### **6. Posso instalar em vários dispositivos?**
- **Sim!** Instale em quantos quiser
- Configurações não sincronizam automaticamente
- Use a **pasta local** para backup manual

---

## 🎯 Dicas Avançadas

### **Maximizar Performance**
1. Instale o app para evitar overhead do navegador
2. Escolha uma **pasta local em SSD** (mais rápido)
3. Baixe soundfonts favoritos com antecedência
4. Use **armazenamento persistente** (concedido automaticamente)

### **Backup e Sincronização**
1. Escolha pasta local em **OneDrive/Google Drive**
2. Seus soundfonts sincronizam automaticamente
3. Instale em outro PC usando a mesma pasta
4. Pronto! Configurações replicadas

### **Uso Profissional**
- Instale no **tablet/iPad** para sessões terapêuticas móveis
- Use **pasta local USB** para portabilidade total
- Configure **instrumentos favoritos** offline antes de sessões

---

## 🆘 Problemas e Soluções

### **Botão "Instalar App" não aparece**
- ✅ Verifique se está em **HTTPS** (https://terramidi.netlify.app)
- ✅ Aguarde 5-10 segundos (Edge demora mais)
- ✅ Use **instalação manual** pelo menu do navegador

### **Erro ao escolher pasta local**
- ✅ Use **Chrome/Edge** (Safari/Firefox não suportam)
- ✅ Escolha pasta com **permissões de escrita**
- ✅ Evite pastas de sistema (Windows, Program Files)

### **Cache não persiste**
- ✅ Conceda **permissão de armazenamento persistente**
- ✅ Verifique em `Configurações → Privacidade → Armazenamento`
- ✅ Reinstale o app se necessário

---

## 📞 Suporte

Problemas? Entre em contato:
- 📧 **Email**: suporte@terraeletronica.com.br
- 📱 **WhatsApp**: (xx) xxxxx-xxxx
- 🌐 **Site**: https://terraeletronica.com.br

---

## 📜 Licença e Segurança

- ✅ **100% Gratuito** para clientes Terra Eletrônica
- ✅ **Código aberto**: [GitHub](https://github.com/AdalbertoBI/TerraMidi)
- ✅ **Sem rastreamento** ou coleta de dados
- ✅ **HTTPS** com certificado válido
- ✅ **Service Worker** auditado para segurança

---

**🎵 Aproveite o Terra MIDI instalado e tenha a melhor experiência de musicoterapia!**

*Última atualização: 20/10/2025*

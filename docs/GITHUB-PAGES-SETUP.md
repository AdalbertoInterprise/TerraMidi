# 🚀 Como Habilitar GitHub Pages para Terra MIDI

## Passo 1: Acesse as Configurações do Repositório

1. Vá para: **https://github.com/AdalbertoBI/TerraMidi**
2. Clique em **Settings** (Engrenagem no menu superior)
3. No menu lateral, clique em **Pages**

## Passo 2: Configure a Origem de Publicação

1. Em "Build and deployment" → "Source", selecione: **Deploy from a branch**
2. Em "Branch", selecione:
   - Branch: **main**
   - Folder: **/ (root)**
3. Clique em **Save**

## Passo 3: Aguarde o Deploy Automático

- GitHub Pages começará a processar automaticamente
- Você verá uma mensagem verde: "Your site is live at https://adalbertobi.github.io/TerraMidi"
- Pode levar até 5 minutos para ficar ativo

## Passo 4: Verifique se Service Worker está Funcionando

1. Acesse: https://adalbertobi.github.io/TerraMidi/
2. Abra o DevTools (F12)
3. Vá para a aba **Application** → **Service Workers**
4. Você deve ver o SW registrado e **ativo**

Se ainda receber erro 404:
- Verifique se o arquivo `sw.js` está no repositório
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Aguarde 5-10 minutos para o GitHub Pages processar

## Passo 5: Verificar Deploy do Workflow

1. Vá para: **Actions** no repositório
2. Você deve ver um workflow "Deploy to GitHub Pages"
3. Se ainda não apareceu, vá para **.github/workflows/pages.yml** e ative manualmente

## Configurações Aplicadas ✅

- ✅ `.nojekyll` - Desabilita processamento Jekyll
- ✅ `_config.yml` - Configuração correta do GitHub Pages
- ✅ `.github/workflows/pages.yml` - Deploy automático
- ✅ `package.json` - Homepage e repository corretos
- ✅ `serviceWorkerBridge.js` - Suporte a caminho dinâmico

## Troubleshooting

### Erro: "Failed to register a ServiceWorker...404"

**Solução:**
1. Confirme que `sw.js` existe no repositório
2. Verifique o arquivo foi commitado: `git log --oneline -- sw.js`
3. Limpe cache do navegador
4. Aguarde 10 minutos e recarregue

### Erro: "bad-mime-type"

**Solução:**
1. O arquivo foi servido com MIME type errado
2. GitHub Pages agora serve corretamente com `.nojekyll`
3. Recarregue a página (Ctrl+F5)

### Terra MIDI não carrega

**Solução:**
1. Verifique console (F12 → Console)
2. Procure por erros 404
3. Certifique-se que todos os recursos estão no repositório
4. Verifique que arquivos estão commitados (não em .gitignore)

## Referências

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Service Workers no GitHub Pages](https://developers.google.com/web/tools/service-worker-libraries)
- [Deploy Actions](https://github.com/actions/deploy-pages)

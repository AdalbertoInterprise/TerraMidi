#!/bin/bash

# 🧪 Script para validar duplicação de classes
# Rodar este script regularmente para garantir que nenhuma duplicação foi introduzida

echo "🧪 Iniciando validação de duplicação de classes..."
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale Node.js para rodar este teste."
    exit 1
fi

# Executar o script de validação
node scripts/validate-no-duplicates.js

# Capturar código de saída
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO"
    echo "Nenhuma duplicação de classes encontrada."
else
    echo ""
    echo "❌ VALIDAÇÃO FALHOU"
    echo "Foram detectadas duplicações. Revise os erros acima."
fi

exit $exit_code

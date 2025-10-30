# Pipeline de importação automática de MIDI

Este documento descreve a **Fase 1** do pipeline de importação de músicas infantis para o TerraMidi. O objetivo é transformar arquivos `.mid` em JSONs compatíveis com o jogo, atualizar os catálogos por dificuldade e emitir alertas quando os arquivos extrapolarem o alcance suportado.

## Visão geral do fluxo

1. **Leitura do MIDI** com [`midi-file`](https://www.npmjs.com/package/midi-file), convertendo eventos de nota em ticks absolutos.
2. **Normalização** das notas para o formato usado pelo game (`{ note, time, duration }` em milissegundos).
3. **Atualização automática** dos arquivos `index.json` por dificuldade.
4. **Validação de alcance** usando [`midi-player-js`](https://www.npmjs.com/package/midi-player-js) para garantir que as notas fiquem entre `C` e `C2` (C4–C5 em MIDI).

## Pré-requisitos

- Node.js 18 ou superior.
- Dependências instaladas:

```cmd
npm install
```

Isso garante a presença das bibliotecas `midi-file` e `midi-player-js` adicionadas ao projeto.

## Arquivo de configuração (`.json`)

O CLI trabalha com um arquivo de configuração que descreve cada música a ser importada. Exemplo completo:

```json
{
  "outputDir": "src/assets/musics",
  "arranger": "Equipe Terra Game",
  "defaultLicense": "Domínio público",
  "defaultCreatedAt": "2025-01-01T00:00:00.000Z",
  "targetRange": { "min": "C4", "max": "C5" },
  "songs": [
    {
      "input": "../raw-mid/ciranda.mid",
      "slug": "ciranda-cirandinha",
      "name": "Ciranda Cirandinha",
      "difficulty": "easy",
      "composer": "Tradicional",
      "key": "C Major",
      "summary": "Ciranda tradicional para coordenação motora.",
      "tags": ["infantil", "cantiga"],
      "complexity": { "melodic": 1, "rhythmic": 1, "syncopation": 0 },
      "transpose": 0,
      "trackIndexes": [0],
      "targetRange": { "min": "C4", "max": "C5" }
    }
  ]
}
```

### Campos suportados

| Campo | Obrigatório? | Descrição |
| --- | --- | --- |
| `input` | ✅ | Caminho para o `.mid` (relativo ao arquivo de config). |
| `slug` | ✅ | Nome do arquivo JSON a ser gerado. |
| `name` | ✅ | Nome de exibição da música. |
| `difficulty` | ✅ | Uma das pastas `easy`, `medium` ou `hard`. |
| `composer` | ⬜️ | Padrão: `Tradicional`. |
| `key` | ⬜️ | Padrão: `C Major`. |
| `summary` | ⬜️ | Texto curto usado nos catálogos. |
| `tags` | ⬜️ | Array de strings. |
| `complexity` | ⬜️ | Objeto `{ melodic, rhythmic, syncopation }`. |
| `transpose` | ⬜️ | Inteiro em semitons para transpor as notas. |
| `trackIndexes` | ⬜️ | Array com índices de trilhas que devem ser lidas (útil para ignorar percussão). |
| `targetRange` | ⬜️ | Sobrepõe o intervalo padrão `C4–C5` para essa música. |
| `timeSignature`, `bpm` | ⬜️ | Se omitidos, são detectados a partir do arquivo MIDI. |
| `license`, `source`, `createdAt` | ⬜️ | Valores herdados de `defaultLicense`, `source` genérico e `defaultCreatedAt`. |

## Execução

### Importação completa

```cmd
npm run import-midi -- --config ./configs/cancoes-infantis.json
```

### Execução seca (`--dry-run`)

Processa os arquivos sem gravar JSONs nem atualizar catálogos. Útil para validar metadados.

```cmd
node scripts\import-midi.js --config ./configs/cancoes-infantis.json --dry-run
```

### Validação isolada (`--validate-only`)

Roda apenas as checagens de alcance com `midi-player-js`, sem gerar arquivos.

```cmd
node scripts\import-midi.js --config ./configs/cancoes-infantis.json --validate-only
```

## Alertas emitidos

- `Nota fora do alcance`: nota convertida para fora de `C4–C5` após considerar `transpose`.
- `Acidental detectado`: presença de sustenidos ou bemóis no arquivo. Recomendado ajustar o MIDI antes de importar.
- `Validação midi-player-js falhou`: o parse secundário não conseguiu ler o arquivo (corrupção ou incompatibilidade).

Todos os alertas são exibidos durante a execução e resumidos ao final. Ajuste o arquivo MIDI ou os campos de configuração até que o pipeline indique sucesso sem alertas críticos.

## Próximos passos sugeridos

1. Criar um diretório `configs/` ou similar com os arquivos `.json` da pipeline.
2. Versionar os arquivos `.mid` de referência (ou mantê-los em storage acessível).
3. Estender a CLI para suportar transposição automática (detectar deslocamento ideal para manter o alcance).
4. Integrar a execução do pipeline em um job de CI para garantir consistência dos catálogos.

Com esta ferramenta instalada, o time pode importar músicas adicionais de forma padronizada, mantendo metadados consistentes e evitando regressões na jogabilidade do TerraMidi.

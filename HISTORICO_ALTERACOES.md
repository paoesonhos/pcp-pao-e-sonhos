# Histórico de Alterações - Sistema PCP Pão e Sonhos

**Período:** 04/01/2026 (Domingo 18:30) até 06/01/2026 (Segunda-feira)  
**Versão:** SemiFinal (checkpoint 9cd2855f)

---

## Resumo Executivo

O Sistema PCP Pão e Sonhos foi desenvolvido do zero seguindo rigorosamente a Especificação Técnica v2.3. O projeto passou por múltiplas iterações de refinamento, especialmente no módulo de importação de dados, até alcançar a versão semifinal com todas as funcionalidades core implementadas e testadas.

---

## Cronologia de Desenvolvimento

### Dia 1 - Domingo 04/01/2026

#### Módulo 1: Cadastro de Produtos e Ficha Técnica

**Backend - Schema e Migrations:**
- Criação da tabela de categorias (id, nome, descricao, ativo)
- Criação da tabela de insumos (id, codigo_insumo, nome, tipo, unidade_medida, ativo)
- Criação da tabela de produtos (id, codigo_produto, nome, unidade, peso_unitario, percentual_perda_liquida, shelf_life, categoria_id, tipo_embalagem, quantidade_por_embalagem, ativo)
- Criação da tabela de ficha_tecnica (id, produto_id, componente_id, tipo_componente, quantidade_base, unidade, receita_minima, ordem, nivel, pai_id)
- Criação da tabela de blocos (id, produto_id, unidades_por_bloco, peso_bloco, ativo)

**Backend - APIs tRPC:**
- CRUD completo de categorias (list, create, update, delete, toggle)
- CRUD completo de insumos (list, create, update, delete, toggle)
- CRUD completo de produtos (list, create, update, delete, toggle)
- API de ficha técnica (get, create, update, delete componentes)
- API de blocos (get, create, update)
- Validações de negócio (código único, peso unitário obrigatório, máximo 2 níveis)

**Frontend - Design System:**
- Paleta de cores elegante (amber/gold para padaria)
- Tipografia e espaçamentos configurados
- Componentes base reutilizáveis

**Frontend - Interfaces:**
- Página de listagem de categorias com filtros
- Página de listagem de insumos com filtros e busca
- Página de listagem de produtos com filtros por categoria e status
- Página de visualização de ficha técnica hierárquica
- Formulário de configuração de blocos da divisora

**Testes Unitários:**
- Validação de código único
- Validação de peso unitário obrigatório
- Validação de máximo 2 níveis de hierarquia
- Imutabilidade de peso unitário
- Cálculo de consistência de blocos

---

### Dia 1-2 - Domingo/Segunda 04-05/01/2026

#### Módulo de Importação de Vendas (Múltiplas Iterações)

**Versão 1 - Importação Bipartida:**
- Upload de 2 arquivos CSV (Seg-Qua e Qui-Sab)
- Validação de datas de referência (segunda-feira)
- Parser de CSV com validação de produtos

**Correção Solicitada:**
- Remoção das validações de segunda-feira do backend e frontend
- Sistema passou a aceitar qualquer data de referência

**Versão 2 (ImportaV2):**
- Nova especificação com dias numéricos (2,3,4,5,6,7)
- Upload bipartido mantido
- Testes unitários (6 testes passando)
- Adição de visualização JSON com botões copiar/baixar

**Versão 3 (ImportaV3):**
- Upload único simplificado
- Interface minimalista

**Versão 4 (ImportaV4):**
- Parser CSV robusto
- Tratamento de vírgulas como separador decimal
- Tratamento de aspas e valores vazios

**Versão 5 (ImportaV5) - VERSÃO FINAL:**
- Ultra-minimalista e funcional
- Detecção automática de separador (vírgula ou ponto-e-vírgula)
- Conversão de vírgula decimal para ponto (85,67 → 85.67)
- Tratamento de quebras de linha CRLF e LF
- Interface HTML pura
- Persistência de dados no banco
- Grid de visualização com totais por coluna
- JSON exportável

---

### Dia 2 - Segunda 05/01/2026

#### Módulo 2.0: Mapa de Produção

**Funcionalidades Implementadas:**
- Endpoint para buscar última importação
- Endpoint para gerar mapa de produção
- Página MapaProducao.tsx
- Grid com colunas: Código, Nome, Unidade, Qtd_Importada, Percentual_Ajuste, Qtd_Planejada, Equipe, Dia_Produzir
- Percentual_Ajuste editável com recálculo automático
- Dia_Produzir editável (dropdown)
- Gestão de feriados (checkbox por dia, zera Qtd_Planejada)

**Ajustes Solicitados:**
1. **Agrupamento por Dia:** Itens agrupados por Dia Produzir com seções separadas
2. **Dropdown de Percentual:** Substituição de input por select com opções de -50% a +50% em incrementos de 10%

---

#### Módulo PCP - Cálculo e Processamento

**1. Explosão de Insumos:**
- Engine de cálculo que multiplica Qtd_Planejada pelas proporções da Ficha Técnica
- Implementação da Regra de Ouro: arredondamento para baixo em múltiplos de 0,005 kg
- Trava de segurança: apenas Fermento editável após processamento
- 17 testes unitários passando

**2. Processamento da Divisora:**
- Cálculo de Blocos Inteiros (grupos de 30 unidades)
- Cálculo de Pedaço de Ajuste (saldo × peso unitário)

**3. Integridade de Unidades:**
- Produtos em "un" nunca exibem decimais
- Arredondamento sempre para baixo

**4. Subprodutos:**
- Processamento de segundo nível de receitas
- Aplicação das mesmas regras de arredondamento

**5. Saídas (Documentação):**
- Ficha de Pré-Pesagem: Ingrediente | Qtd Calculada | Check Manual
- Ficha de Produção: Separar Blocos (Divisora) de Pedaços (Manual)

**6. Integração:**
- Página de Processamento PCP com 3 abas
- Integração com Mapa de Produção

---

### Dia 2-3 - Segunda/Terça 05-06/01/2026

#### Correções e Ajustes Finais

**Correção: Erro 404 em Fichas Técnicas:**
- Criação de página de listagem FichasTecnicas.tsx
- Adição de rota /fichas-tecnicas no App.tsx

**Correção: Configuração de Blocos para todos os produtos:**
- Remoção da condição que limitava exibição apenas para produtos em "un"
- Seção "Configuração de Blocos (Divisora)" agora aparece para todos os produtos (kg e un)
- Remoção de validação do backend que bloqueava blocos para produtos em kg

**Nova Versão: Módulo Ficha Técnica com Cascata:**

1. **Modal "Adicionar Componente" - Novo Design:**
   - Remoção do dropdown de "Tipo" (Ingrediente/Massa Base)
   - Lista unificada de Insumos + Produtos
   - Ao selecionar produto, ele se torna insumo do produto atual

2. **Estrutura de Dados:**
   - Simplificação da tabela ficha_tecnica_componentes
   - Campo para identificar se componente é insumo ou produto

3. **Engine PCP - Explosão Recursiva:**
   - Função que "mergulha" em todas as camadas
   - Consolidação de insumos repetidos (soma de quantidades)
   - Arredondamento 0,005 kg apenas no total final consolidado

**Ajuste: Configuração de Blocos - Valores Flexíveis:**
- Correção de erro de banco (UPDATE em vez de INSERT)
- Permissão para salvar qualquer valor de unidades por bloco
- Mensagem informativa: unidades ≠ 30 = "Pedaço" (produção manual)
- Labels dinâmicos: "Unidades por Pedaço" / "Peso do Pedaço"

**Ajuste: Peso do Bloco Automático:**
- Cálculo automático a partir da soma dos componentes
- Exibição de "Peso Total dos Componentes" na seção Composição
- Campo Peso do Bloco como somente leitura (calculado)

**Ajuste: Layout da Ficha de Pré-Pesagem:**
- Layout alterado para exibir checklist de ingredientes agrupados por produto
- Exibição de Nome e ID do produto como cabeçalho de cada seção
- Manutenção da regra: apenas Fermento é editável

---

## Regras de Negócio Implementadas

### Padronização em KG/UN
- Todos os insumos e produtos seguem unidades padronizadas (kg ou un)
- Conversões automáticas quando necessário

### Regra da Divisora (Blocos de 30)
- Padrão de 30 unidades por bloco
- Valores diferentes são tratados como "Pedaço" (produção manual)
- Peso do bloco calculado automaticamente

### Regra de Ouro (Arredondamento 0,005 kg)
- Todos os insumos em kg são arredondados para baixo
- Múltiplos de 0,005 kg (5 gramas)
- Aplicado apenas no total final consolidado

### Integridade de Unidades
- Produtos em "un" nunca exibem decimais
- Arredondamento sempre para baixo

### Trava de Segurança
- Apenas Fermento é editável após processamento
- Demais ingredientes são bloqueados

---

## Testes Unitários

**Total:** 34 testes passando

- Validações de código único
- Validações de peso unitário
- Validações de hierarquia (máximo 2 níveis)
- Validações de blocos
- Engine PCP (explosão, consolidação, arredondamento)
- Parser CSV (separadores, decimais, quebras de linha)

---

## Checkpoints Salvos

| Versão | Data | Descrição |
|--------|------|-----------|
| 84efde25 | 04/01 | Módulo 1 Completo: Cadastro de Produtos e Ficha Técnica |
| c10d47ac | 04/01 | Módulo 1.2: Importação de Vendas e Mapa de Produção |
| f30cf3ee | 04/01 | Correção: Removidas validações de segunda-feira |
| 46726714 | 05/01 | Módulo ImportaV2 com dias numéricos |
| fd70ce38 | 05/01 | Visualização JSON na importação |
| c49af443 | 05/01 | ImportaV2 com Upload Sequencial |
| 8e5d2d0a | 05/01 | ImportaV3 - Upload único simplificado |
| 76b48e81 | 05/01 | ImportaV4 - Upload único robusto |
| cc2803fe | 05/01 | ImportaV5 - Ultra-minimalista funcional |
| 7db39f76 | 05/01 | Persistência de dados ImportaV5 |
| 204ad3a7 | 05/01 | Grid de visualização ImportaV5 |
| 0d08a10e | 05/01 | Módulo 2.0 Mapa de Produção |
| 1aff8e31 | 05/01 | Mapa agrupado por Dia |
| 6e5ee2b9 | 05/01 | Dropdown de percentual |
| bde95d8f | 05/01 | Módulo PCP - Cálculo e Processamento |
| 2498e6a0 | 05/01 | Correção erro 404 Fichas Técnicas |
| 75348aa5 | 05/01 | Blocos para todos os produtos |
| b25105b8 | 05/01 | Validação backend blocos removida |
| fcb57d57 | 05/01 | Estrutura de cascata (Produto-Insumo) |
| 533e793c | 05/01 | Correção dropdown componentes |
| 70df466e | 05/01 | Nova versão Ficha Técnica com cascata |
| f4f53646 | 06/01 | Configuração de blocos valores flexíveis |
| d1f6188b | 06/01 | Peso do bloco automático |
| ed8c7f10 | 06/01 | Layout Pré-Pesagem agrupada por produto |
| **9cd2855f** | **06/01** | **VERSÃO SEMIFINAL** |

---

## Módulos do Sistema

1. **Categorias** - Gerenciamento de categorias de produtos
2. **Insumos** - Cadastro de ingredientes
3. **Produtos** - Gestão de produtos finais
4. **Fichas Técnicas** - Receitas e composições com estrutura de cascata
5. **Importação V5** - Upload de CSV simplificado
6. **Mapa de Produção** - Planejamento semanal com agrupamento por dia
7. **Processamento PCP** - Cálculo e fichas de produção

---

### Dia 5 - Domingo 12/01/2026

#### Módulo 4.0: Produção de Itens Intermediários (Níveis 1 e 2)

**Backend - pcp-utils.ts:**
- Implementação da função `processarMapaComIntermediarios` para consolidar intermediários globalmente
- Implementação da função `explodirComIntermediarios` para rastrear intermediários durante explosão
- Implementação da função `consolidarIntermediarios` para consolidar quantidades totais
- Interface `IntermediarioConsolidado` com campos: produtoId, nomeProduto, quantidadeTotal, quantidadeArredondada, unidade, nivel, produtosFilhos

**Backend - routers.ts:**
- Atualização do endpoint `processarMapa` para retornar intermediários consolidados
- Retorno inclui: resultados (produtos finais), intermediarios (massas base consolidadas), insumosGlobais

**Frontend - ProcessamentoPCP.tsx:**
- Adição da seção "Massas Base a Produzir (Consolidado)" no topo da Ficha de Produção
- Exibição de intermediários com: nome, quantidade total arredondada, unidade, produtos que usam
- Badges de nível (N1, N2) para identificar hierarquia
- Cores diferenciadas para intermediários (roxo/purple)

**Testes:**
- 42 testes unitários passando
- Validação visual da interface com dados reais

---

## Pendências para Versão Final

- [ ] Documentar regras de negócio implementadas
- [ ] Documentar estrutura de dados e relacionamentos
- [ ] Filtros por categoria de produto no grid de planejamento
- [ ] Busca por código/nome de produto no grid
- [ ] Botão "Salvar Mapa" para persistir ajustes
- [ ] Exportação de fichas para PDF

---

*Documento gerado em 06/01/2026*

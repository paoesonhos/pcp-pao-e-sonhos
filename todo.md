# Sistema PCP Pão e Sonhos - TODO

## Módulo 1: Cadastro de Produtos e Ficha Técnica

### Backend - Schema e Migrations
- [x] Criar tabela de categorias (id, nome, descricao, ativo)
- [x] Criar tabela de insumos (id, codigo_insumo, nome, tipo, unidade_medida, ativo)
- [x] Criar tabela de produtos (id, codigo_produto, nome, unidade, peso_unitario, percentual_perda_liquida, shelf_life, categoria_id, tipo_embalagem, quantidade_por_embalagem, ativo)
- [x] Criar tabela de ficha_tecnica (id, produto_id, componente_id, tipo_componente, quantidade_base, unidade, receita_minima, ordem, nivel, pai_id)
- [x] Criar tabela de blocos (id, produto_id, unidades_por_bloco, peso_bloco, ativo)
- [x] Executar migrations no banco de dados

### Backend - APIs tRPC
- [x] Implementar CRUD de categorias (list, create, update, delete, toggle)
- [x] Implementar CRUD de insumos (list, create, update, delete, toggle)
- [x] Implementar CRUD de produtos (list, create, update, delete, toggle)
- [x] Implementar API de ficha técnica (get, create, update, delete componentes)
- [x] Implementar API de blocos (get, create, update)
- [x] Implementar validações de negócio (código único, peso unitário obrigatório, máximo 2 níveis)

### Frontend - Design System
- [x] Definir paleta de cores elegante
- [x] Configurar tipografia e espaçamentos
- [x] Criar componentes base reutilizáveis

### Frontend - Interface de Categorias
- [x] Página de listagem de categorias com filtros
- [x] Modal/formulário de criação de categoria
- [x] Modal/formulário de edição de categoria
- [x] Funcionalidade de inativação de categoria

### Frontend - Interface de Insumos
- [x] Página de listagem de insumos com filtros e busca
- [x] Modal/formulário de criação de insumo
- [x] Modal/formulário de edição de insumo
- [x] Funcionalidade de inativação de insumo

### Frontend - Interface de Produtos
- [x] Página de listagem de produtos com filtros por categoria e status
- [x] Busca por código/nome de produto
- [x] Formulário de criação de produto com validações
- [x] Formulário de edição de produto (peso unitário bloqueado após criação)
- [x] Funcionalidade de inativação de produto
- [x] Exibição de produtos no formato "codigo_produto – nome_produto"

### Frontend - Interface de Ficha Técnica
- [x] Página de visualização de ficha técnica hierárquica
- [x] Interface de adição de ingredientes (nível 1)
- [x] Interface de adição de sub-receitas/massa base (nível 1)
- [x] Interface de adição de sub-blocos (nível 2)
- [x] Visualização hierárquica dos componentes (árvore ou lista indentada)
- [x] Edição de quantidades base e receita mínima
- [x] Remoção de componentes da ficha técnica
- [x] Validação de máximo 2 níveis de hierarquia

### Frontend - Interface de Configuração de Blocos
- [x] Formulário de configuração de blocos da divisora
- [x] Validação automática: peso_bloco = unidades_por_bloco × peso_unitario
- [x] Exibição de alertas de inconsistência

### Testes e Validações
- [x] Testes unitários para validação de código único
- [x] Testes unitários para validação de peso unitário obrigatório
- [x] Testes unitários para validação de máximo 2 níveis de hierarquia
- [x] Testes unitários para imutabilidade de peso unitário
- [x] Testes unitários para cálculo de consistência de blocos
- [x] Testes de integração para fluxo completo de cadastro

### Documentação
- [ ] Documentar regras de negócio implementadas
- [ ] Documentar estrutura de dados e relacionamentos


## Módulo 1.2: Importação de Vendas e Mapa de Produção

### Backend - Schema e Banco de Dados
- [x] Criar tabela de importacoes_vendas (id, data_referencia_historico, data_referencia_planejamento, usuario_id, created_at)
- [x] Criar tabela de vendas_historico (id, importacao_id, produto_id, data_venda, quantidade, unidade)
- [x] Criar tabela de mapa_producao (id, importacao_id, produto_id, dia_semana, quantidade_planejada, unidade)
- [x] Executar migrations no banco de dados

### Backend - APIs de Importação
- [x] Implementar parser de CSV para arquivo Seg-Qua (id, Produto, unidade de medida, segunda-feira, terça-feira, quarta-feira)
- [x] Implementar parser de CSV para arquivo Qui-Sab (id, Produto, unidade de medida, quinta-feira, sexta-feira, sábado)
- [x] Validar existência de produtos pelo codigo_produto (coluna id do CSV)
- [x] Validar formato de unidade de medida (kg/un)
- [x] Validar valores numéricos das quantidades)
- [x] Criar API de importação bipartida (recebe 2 arquivos + 2 datas de referência)
- [x] Salvar dados históricos na tabela vendas_historico
- [x] Gerar mapa de produção inicial baseado nos dados importados)

### Backend - APIs de Consulta
- [x] API para listar importações realizadas
- [x] API para obter mapa de produção por importacao_id
- [x] API para atualizar quantidades no mapa de produção (grid editável)

### Frontend - Interface de Importação
- [x] Página de importação com upload de 2 arquivos CSV
- [x] Seletor de Data de Referência do Histórico (segunda-feira)
- [x] Seletor de Data de Referência do Mapa de Produção (segunda-feira)
- [x] Validação de arquivos antes do upload
- [x] Feedback de progresso durante importação
- [x] Exibição de erros de validação (produtos não encontrados, formatos inválidos)

### Frontend - Grid de Planejamento
- [x] Grid interativo Produto vs. Dia da Semana (7 colunas: Seg, Ter, Qua, Qui, Sex, Sab, Dom)
- [x] Exibição de produtos no formato "codigo_produto – nome_produto"
- [x] Células editáveis para ajuste de quantidades planejadas
- [x] Indicador visual de unidade (kg/un) por produto
- [x] Salvamento automático ou manual de alterações
- [ ] Filtros por categoria de produto
- [ ] Busca por código/nome de produto

### Validações e Testes
- [x] Teste de parsing de CSV com dados válidos
- [x] Teste de validação de produtos inexistentes
- [x] Teste de validação de unidades inválidas
- [x] Teste de geração de mapa de produção
- [x] Teste de atualização de quantidades no grid


## Correção: Remover Validações de Segunda-feira
- [x] Remover validação de segunda-feira do backend (server/routers.ts)
- [x] Remover validação de segunda-feira do frontend (client/src/pages/ImportacaoVendas.tsx)
- [x] Remover textos de ajuda sobre segunda-feira da interface
- [x] Atualizar testes unitários para não validar segunda-feira
- [x] Executar testes para garantir funcionamento


## Investigação: Erro de Importação - Produtos Não Encontrados
- [x] Consultar produtos cadastrados no banco de dados
- [x] Comparar códigos do CSV com códigos cadastrados
- [ ] Identificar causa do erro na função parseCSV
- [ ] Corrigir lógica de busca/validação de produtos no backend


## Módulo ImportaV2: Nova Especificação
- [x] Remover arquivos do módulo V1 (ImportacaoVendas.tsx, MapaProducao.tsx, db-importacoes.ts, routers de importação)
- [x] Remover tabelas V1 do schema (importacoesVendas, vendasHistorico, mapaProducao)
- [x] Criar nova tabela importacoes_v2 (id, data_referencia, usuario_id, created_at)
- [x] Criar nova tabela vendas_v2 (id, importacao_id, produto_id, dia_semana, quantidade, unidade)
- [x] Implementar backend: parseCSV com dias numéricos (2,3,4,5,6,7)
- [x] Implementar backend: sem validação de datas
- [x] Criar interface ImportaV2.tsx com upload bipartido
- [x] Criar grid de planejamento com colunas: Dia 2, Dia 3, Dia 4, Dia 5, Dia 6, Dia 7
- [x] Testar importação com dados reais
- [x] Criar testes unitários para ImportaV2 (6 testes passando)


## Visualização JSON na Importação
- [x] Adicionar seção de visualização JSON no final da página ImportaV2.tsx
- [x] Exibir dados formatados após importação bem-sucedida
- [x] Adicionar botão para copiar JSON
- [x] Adicionar botão para baixar JSON como arquivo


## Módulo 1.4: ImportaV3 - Upload Único Simplificado
- [x] Remover completamente módulo ImportaV2 (arquivos, routers, tabelas)
- [x] Criar nova tabela importacoes_v3 (id, data_referencia, usuario_id, created_at)
- [x] Criar nova tabela vendas_v3 (id, importacao_id, codigo_produto, nome_produto, unidade, dia2-dia7)
- [x] Implementar helper db-importacoes-v3.ts com parser CSV simples
- [x] Implementar endpoint tRPC: importacoesV3.importar (upload único)
- [x] Implementar endpoint tRPC: importacoesV3.getMapa (visualização grid)
- [x] Criar página ImportaV3.tsx com interface minimalista
- [x] Adicionar rota /importa-v3 no App.tsx
- [x] Adicionar link no Home.tsx
- [x] Testar interface no navegador
- [ ] Testar importação com arquivo modelo
- [ ] Validar grid de visualização
- [ ] Validar exibição JSON


## Módulo 1.5: ImportaV4 - Upload Único Robusto
- [x] Remover completamente módulo ImportaV3 (arquivos, routers, tabelas)
- [x] Criar tabelas V4: importacoes_v4 e vendas_v4 com estrutura simples
- [x] Implementar helper db-importacoes-v4.ts com parser CSV robusto
- [x] Parser trata: vírgulas como separador decimal, aspas, valores vazios
- [x] Implementar endpoint tRPC: importacoesV4.importar (upload único)
- [x] Implementar endpoint tRPC: importacoesV4.getMapa (visualização grid)
- [x] Criar página ImportaV4.tsx com interface minimalista
- [x] Adicionar rota /importa-v4 no App.tsx
- [x] Adicionar link no Home.tsx
- [x] Criar tabelas V4 manualmente no banco de dados
- [ ] Testar importação com arquivo modelo
- [ ] Validar grid de visualização
- [ ] Validar exibição JSON



## Módulo 1.6: ImportaV5 - Ultra-Minimalista FUNCIONAL

- [x] Remover completamente módulo ImportaV4 (arquivos, routers)
- [x] Criar endpoint tRPC: importaV5.parsear (apenas parse, sem banco)
- [x] Parser detecta separador automaticamente (vírgula ou ponto-e-vírgula)
- [x] Parser converte vírgula decimal para ponto (85,67 → 85.67)
- [x] Parser trata quebras de linha CRLF e LF
- [x] Criar página ImportaV5.tsx com HTML puro (sem shadcn)
- [x] Interface: input texto para data, input file para CSV, botão importar
- [x] Exibição de JSON formatado após importação
- [x] Adicionar rota /importa-v5 no App.tsx
- [x] Adicionar link no Home.tsx
- [x] Testar importação com arquivo modelo - SUCESSO!
- [x] Validar 7 produtos importados corretamente


## Módulo 1.7: Persistência de Dados ImportaV5

- [x] Criar tabela importacoes_v5 no schema (id, data_referencia, usuario_id, created_at)
- [x] Criar tabela vendas_v5 no schema (id, importacao_id, codigo_produto, nome_produto, unidade_medida, dia2-dia7)
- [x] Executar migração no banco de dados
- [x] Atualizar endpoint parsear para salvar dados no banco
- [x] Criar endpoint listar para consultar importações anteriores
- [x] Criar endpoint getMapa para obter dados de uma importação
- [x] Testar persistência com arquivo modelo
- [x] Validar consulta de importações


## Módulo 1.8: Grid de Visualização ImportaV5

- [x] Adicionar tabela interativa após importação
- [x] Colunas: Código, Produto, Unidade, Dia 2, Dia 3, Dia 4, Dia 5, Dia 6, Dia 7
- [x] Totais por coluna
- [x] Manter JSON como opção secundária
- [x] Testar visualização


## Módulo 2.0: Mapa de Produção

- [x] Criar endpoint para buscar última importação
- [x] Criar endpoint para gerar mapa de produção
- [x] Criar página MapaProducao.tsx
- [x] Grid com colunas: Código, Nome, Unidade, Qtd_Importada, Percentual_Ajuste, Qtd_Planejada, Equipe, Dia_Produzir
- [x] Percentual_Ajuste editável com recálculo automático
- [x] Dia_Produzir editável (dropdown)
- [x] Gestão de feriados (checkbox por dia, zera Qtd_Planejada)
- [x] Testar funcionalidades


## Ajuste: Agrupar Mapa de Produção por Dia

- [x] Modificar MapaProducao.tsx para agrupar itens por Dia Produzir
- [x] Exibir seções separadas para cada dia (2, 3, 4, 5, 6, 7)
- [x] Manter funcionalidades de edição dentro de cada grupo
- [x] Testar visualização agrupada


## Ajuste: Dropdown de Percentual no Mapa de Produção

- [x] Substituir input de texto por dropdown/select
- [x] Opções com incremento de 10% (-50%, -40%, -30%, -20%, -10%, 0%, +10%, +20%, +30%, +40%, +50%)
- [x] Manter recálculo automático de Qtd_Planejada ao selecionar
- [x] Testar funcionalidade

## Módulo PCP - Cálculo e Processamento


### 1. Explosão de Insumos
- [x] Criar engine de cálculo que multiplica Qtd_Planejada pelas proporções da Ficha Técnica
- [x] Implementar Regra de Ouro: arredondar insumos em kg para baixo em múltiplos de 0,005 kg
- [x] Trava de segurança: apenas Fermento editável após processamento
- [x] Testes unitários (17 testes passando)

### 2. Processamento da Divisora (produtos em kg)
- [x] Calcular Blocos Inteiros (grupos de 30 unidades)
- [x] Calcular Pedaço de Ajuste (saldo × peso unitário)

### 3. Integridade de Unidades
- [x] Produtos em "un" nunca exibem decimais
- [x] Arredondamento sempre para baixo

### 4. Subprodutos
- [x] Processar segundo nível de receitas (ex: Massa Amarelinha)
- [x] Aplicar mesmas regras de arredondamento

### 5. Saídas (Documentação)
- [x] Ficha de Pré-Pesagem: Ingrediente | Qtd Calculada | Check Manual
- [x] Ficha de Produção: Separar Blocos (Divisora) de Pedaços (Manual)

### 6. Integração
- [x] Criar página de Processamento PCP
- [x] Integrar com Mapa de Produção (receber Qtd_Planejada)
- [x] Adicionar link no menu principal

### Observação
- Para testar completamente, é necessário cadastrar Fichas Técnicas para os produtos


## Correção: Erro 404 em Fichas Técnicas

- [x] Criar página de listagem FichasTecnicas.tsx
- [x] Adicionar rota /fichas-tecnicas no App.tsx
- [x] Testar navegação para ficha técnica individual


## Correção: Configuração de Blocos para todos os produtos

- [x] Remover condição que limitava exibição apenas para produtos em "un"
- [x] Seção "Configuração de Blocos (Divisora)" agora aparece para todos os produtos (kg e un)

- [x] Remover validação do backend que bloqueava blocos para produtos em kg


## Nova Versão: Módulo Ficha Técnica com Cascata

### 1. Modal "Adicionar Componente" - Novo Design
- [x] Remover dropdown de "Tipo" (Ingrediente/Massa Base)
- [x] Lista unificada de Insumos + Produtos
- [x] Ao selecionar produto, ele se torna insumo do produto atual
- [x] Campos: Componente (busca), Quantidade Base, Unidade

### 2. Estrutura de Dados
- [x] Simplificar tabela ficha_tecnica_componentes (remover campos de sub-blocos)
- [x] Adicionar campo para identificar se componente é insumo ou produto

### 3. Engine PCP - Explosão Recursiva
- [x] Implementar função que "mergulha" em todas as camadas
- [x] Consolidar insumos repetidos (somar quantidades)
- [x] Aplicar arredondamento 0,005 kg apenas no total final consolidado

### 4. Preservar
- [x] Seção "Configuração de Blocos (Divisora)" - sem alterações
- [x] Integridade da divisora para Ficha de Produção


## Ajuste: Configuração de Blocos (Divisora) - Valores Flexíveis

- [x] Corrigir erro de banco de dados ao salvar blocos com unidades ≠ 30 (usar UPDATE em vez de INSERT)
- [x] Permitir salvar qualquer valor de unidades por bloco
- [x] Adicionar mensagem informativa: unidades ≠ 30 = "Pedaço" (produção manual)
- [x] Labels dinâmicos: "Unidades por Pedaço" / "Peso do Pedaço" quando ≠ 30
- [x] Testar salvamento com valores diferentes de 30 (20 unidades = 0.60000 kg)


## Ajuste: Peso do Bloco Automático

- [x] Calcular Peso do Bloco automaticamente a partir da soma dos componentes
- [x] Exibir "Peso Total dos Componentes" na seção Composição do Produto
- [x] Campo Peso do Bloco passa a ser somente leitura (calculado)
- [x] Testar cálculo automático ao adicionar/remover componentes (7.50000 kg = 5.00 + 2.50)


## Ajuste: Layout da Ficha de Pré-Pesagem

- [x] Alterar layout para exibir checklist de ingredientes agrupados por produto
- [x] Exibir Nome e ID do produto como cabeçalho de cada seção
- [x] Manter regra: apenas Fermento é editável
- [x] Testar novo layout com produtos do Mapa de Produção


---

## VERSÃO SEMIFINAL - 06/01/2026

Checkpoint de referência com todas as funcionalidades core implementadas e testadas.



## Módulo Expedição - 11/01/2026

- [x] Schema: Criar tabela destinos
- [x] Schema: Adicionar campos destinoId, saldoEstoque, estoqueMinimoDias em produtos
- [x] Backend: CRUD destinos
- [x] Backend: APIs expedição (listar, confirmar separação)
- [x] Frontend: Página cadastro de Destinos
- [x] Frontend: Atualizar cadastro de Produtos (campos Destino, Saldo, Estoque Mínimo)
- [x] Frontend: Exibir saldo na listagem de Produtos
- [x] Frontend: Nova aba Expedição no Processamento PCP
- [x] Backend: Inteligência de reposição (validação na importação)
- [x] Backend: Auto-inclusão de produtos em ruptura no Mapa


- [x] Bug: Corrigir validação de código duplicado na edição de produtos

## Gatilho Manual de Processamento - 11/01/2026

- [x] Frontend: Adicionar botão "Processar PCP" no Mapa de Produção
- [x] Backend: Implementar lógica de processamento manual
- [x] Frontend: Processamento PCP em stand-by até clique do botão

## Mapa Base e Fluxo de Edição - 11/01/2026

- [x] Schema: Criar tabela mapa_base
- [x] Schema: Criar tabela mapa_rascunho
- [x] Backend: APIs para salvar/carregar Mapa Base
- [x] Backend: APIs para salvar/carregar Rascunho
- [x] Frontend: Botão "Salvar Alterações"
- [x] Frontend: Botão "Salvar como Mapa Base"
- [x] Frontend: Botão "Carregar Mapa Base"

- [x] Bug: Corrigir erro ao salvar mapa - produtoId não preenchido nos itens importados
- [x] Bug: Erro persiste ao salvar mapa - valores undefined/null
- [x] Bug: Erro ao salvar Mapa Base - mesma correção do rascunho

- [x] Alterar Processamento PCP para buscar qtdPlanejada apenas do rascunho salvo

## Inteligência de Mapa e Validação de Ruptura v2.5 - 11/01/2026

- [x] Backend: Implementar função validarRupturaEstoque
- [x] Backend: Calcular média diária do mapa recém salvo
- [x] Frontend: Executar validação após salvar alterações
- [x] Frontend: Destacar produtos em ruptura em vermelho
- [x] Frontend: Adicionar tag [REPOSIÇÃO] ao nome
- [x] Backend: Auto-incluir na segunda-feira sem duplicar

- [x] Bug: Erro React #321 ao salvar alterações no Mapa de Produção

## Consolidação de Produtos Intermediários - 12/01/2026

- [x] Backend: Atualizar engine PCP para consolidar produtos intermediários
- [x] Backend: Calcular quantidade total de cada intermediário (soma das necessidades)
- [ ] Frontend: Ficha de Produção com seção separada para intermediários no topo
- [ ] Frontend: Ficha de Pré-Pesagem agrupada por intermediário consolidado
- [x] Backend: Aplicar recursividade (Nível 1 → Nível 2 → Produto Final)


## Módulo 4.0: Produção de Itens Intermediários (Níveis 1 e 2)

- [x] Implementar função processarMapaComIntermediarios em pcp-utils.ts
- [x] Implementar função explodirComIntermediarios para rastrear intermediários durante explosão
- [x] Implementar função consolidarIntermediarios para consolidar quantidades totais
- [x] Atualizar routers.ts para retornar intermediários no processamento PCP
- [x] Adicionar seção "Massas Base a Produzir (Consolidado)" no topo da Ficha de Produção
- [x] Exibir intermediários com: nome, quantidade total, unidade, produtos que usam
- [x] Testar com dados reais - 42 testes passando
- [x] Validar exibição de intermediários na interface


## Módulo 4.1: Ficha Técnica dos Intermediários

- [x] Atualizar backend para retornar ingredientes de cada intermediário
- [x] Atualizar frontend para exibir ficha técnica detalhada na seção de intermediários
- [x] Testar exibição com dados reais


## Módulo 4.2: Correção Ficha Técnica Intermediários - Incluir Produtos

- [x] Atualizar consolidarIntermediarios para incluir produtos (tipo_componente='massa_base') além de ingredientes
- [x] Exibir produtos base (ex: MASSA BASE DOCE) na ficha técnica dos intermediários com ⭐
- [x] Testar exibição com Massa base amarelinha


## Módulo 4.3: Correção Cálculo Ingredientes Intermediários

- [x] Corrigir cálculo para usar quantidade total consolidada
- [x] Ingrediente = (ingrediente/total_receita_base) × Quantidade Total Consolidada
- [x] Testar com MASSA BASE DOCE (87.495 kg) - Total ingredientes: 87.485 kg ✅


## Módulo 4.4: Massas Base na Ficha de Pré-Pesagem

- [x] Adicionar seção "Massas Base a Produzir" no topo da Ficha de Pré-Pesagem
- [x] Exibir intermediários N1 e N2 com ficha técnica detalhada
- [x] Usar cálculo proporcional: (ingrediente/total_receita_base) × Quantidade Total
- [x] Testar exibição

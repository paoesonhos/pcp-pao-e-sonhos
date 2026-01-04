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

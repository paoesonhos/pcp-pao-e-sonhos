# Modelagem de Dados - Sistema PCP Pão e Sonhos

**Versão:** SemiFinal  
**Data:** 06/01/2026  
**Banco de Dados:** MySQL/TiDB

---

## Visão Geral

O Sistema PCP Pão e Sonhos utiliza um modelo de dados relacional organizado em módulos funcionais. A estrutura foi projetada para suportar o fluxo completo de planejamento e controle de produção de uma padaria, desde o cadastro de produtos até a geração de fichas de produção.

---

## Diagrama de Relacionamentos

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │ categorias  │       │   insumos   │
│─────────────│       │─────────────│       │─────────────│
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ openId      │       │ nome        │       │ codigoInsumo│
│ name        │       │ descricao   │       │ nome        │
│ email       │       │ ativo       │       │ tipo        │
│ role        │       └──────┬──────┘       │ unidadeMedida│
└──────┬──────┘              │              │ ativo       │
       │                     │              └─────────────┘
       │                     │ 1:N
       │              ┌──────┴──────┐
       │              │  produtos   │
       │              │─────────────│
       │              │ id (PK)     │
       │              │ codigoProduto│
       │              │ nome        │
       │              │ unidade     │
       │              │ pesoUnitario│
       │              │ categoriaId (FK)│
       │              └──────┬──────┘
       │                     │
       │         ┌───────────┼───────────┐
       │         │ 1:N       │ 1:N       │ 1:N
       │  ┌──────┴──────┐ ┌──┴───┐ ┌─────┴─────┐
       │  │fichaTecnica │ │blocos│ │ vendasV5  │
       │  │─────────────│ │──────│ │───────────│
       │  │ id (PK)     │ │id(PK)│ │ id (PK)   │
       │  │ produtoId(FK)│ │...   │ │codigoProduto│
       │  │ componenteId│ └──────┘ │ dia2-dia7 │
       │  │ tipoComponente│        └───────────┘
       │  │ quantidadeBase│               │
       │  │ nivel        │                │
       │  │ paiId (FK self)│              │
       │  └──────────────┘                │
       │                                  │
       │         ┌────────────────────────┘
       │         │ N:1
       │  ┌──────┴──────┐
       │  │importacoesV5│
       │  │─────────────│
       └──│ usuarioId(FK)│
          │ dataReferencia│
          └─────────────┘
```

---

## Entidades do Sistema

### 1. Users (Usuários)

Tabela de autenticação e controle de acesso do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária auto-incremento |
| `openId` | VARCHAR(64) | Identificador único do OAuth (único) |
| `name` | TEXT | Nome do usuário |
| `email` | VARCHAR(320) | E-mail do usuário |
| `loginMethod` | VARCHAR(64) | Método de login utilizado |
| `role` | ENUM('user','admin') | Papel do usuário no sistema |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |
| `lastSignedIn` | TIMESTAMP | Último acesso |

**Índices:** `openId` (único)

---

### 2. Categorias

Agrupamento de produtos por tipo (Pães, Bolos, Salgados, etc.).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária auto-incremento |
| `nome` | VARCHAR(100) | Nome da categoria (único) |
| `descricao` | TEXT | Descrição opcional |
| `ativo` | BOOLEAN | Status ativo/inativo |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

**Índices:** `nome` (único)

**Relacionamentos:**
- 1:N com `produtos`

---

### 3. Insumos

Ingredientes utilizados nas receitas (matérias-primas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária auto-incremento |
| `codigoInsumo` | VARCHAR(50) | Código único do insumo |
| `nome` | VARCHAR(200) | Nome do insumo |
| `tipo` | ENUM('seco','molhado') | Classificação do insumo |
| `unidadeMedida` | ENUM('kg','un') | Unidade de medida padrão |
| `ativo` | BOOLEAN | Status ativo/inativo |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

**Índices:** 
- `codigoInsumo` (único)
- `codigo_insumo_idx` (índice de busca)

---

### 4. Produtos

Produtos finais fabricados pela padaria.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária auto-incremento |
| `codigoProduto` | VARCHAR(50) | Código único do produto (ERP) |
| `nome` | VARCHAR(200) | Nome do produto |
| `unidade` | ENUM('kg','un') | Unidade de venda |
| `pesoUnitario` | DECIMAL(10,5) | Peso por unidade (imutável após criação) |
| `percentualPerdaLiquida` | DECIMAL(5,2) | Percentual de perda na produção |
| `shelfLife` | INT | Validade em dias |
| `categoriaId` | INT | FK para categorias |
| `tipoEmbalagem` | VARCHAR(100) | Tipo de embalagem |
| `quantidadePorEmbalagem` | INT | Unidades por embalagem |
| `ativo` | BOOLEAN | Status ativo/inativo |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

**Índices:**
- `codigoProduto` (único)
- `codigo_produto_idx` (índice de busca)
- `categoria_idx` (índice FK)

**Relacionamentos:**
- N:1 com `categorias`
- 1:N com `fichaTecnica`
- 1:N com `blocos`

**Regras de Negócio:**
- `pesoUnitario` é obrigatório para produtos em "un"
- `pesoUnitario` não pode ser alterado após criação

---

### 5. Ficha Técnica

Composição das receitas com estrutura hierárquica (cascata).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária auto-incremento |
| `produtoId` | INT | FK para produto pai |
| `componenteId` | INT | ID do componente (insumo ou produto) |
| `tipoComponente` | ENUM | Tipo: 'ingrediente', 'massa_base', 'sub_bloco' |
| `quantidadeBase` | DECIMAL(10,5) | Quantidade na receita base |
| `unidade` | ENUM('kg','un') | Unidade de medida |
| `receitaMinima` | DECIMAL(10,5) | Quantidade mínima de produção |
| `ordem` | INT | Ordem de exibição |
| `nivel` | INT | Nível na hierarquia (1 ou 2) |
| `paiId` | INT | FK auto-referência para sub-blocos |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

**Índices:**
- `ficha_produto_idx` (índice FK)

**Relacionamentos:**
- N:1 com `produtos`
- Auto-referência (pai/filhos) para hierarquia

**Regras de Negócio:**
- Máximo 2 níveis de hierarquia
- Componente pode ser insumo OU produto (estrutura de cascata)

---

### 6. Blocos

Configuração da divisora para cada produto.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária auto-incremento |
| `produtoId` | INT | FK para produto |
| `unidadesPorBloco` | INT | Unidades por bloco (padrão: 30) |
| `pesoBloco` | DECIMAL(10,5) | Peso total do bloco |
| `ativo` | BOOLEAN | Status ativo/inativo |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

**Relacionamentos:**
- N:1 com `produtos`

**Regras de Negócio:**
- Padrão: 30 unidades por bloco (divisora)
- Valores ≠ 30: tratados como "Pedaço" (produção manual)
- `pesoBloco` calculado automaticamente pela soma dos componentes

---

### 7. Importações V5

Registro de importações de dados de vendas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária auto-incremento |
| `dataReferencia` | VARCHAR(50) | Data de referência da importação |
| `usuarioId` | INT | FK para usuário que importou |
| `createdAt` | TIMESTAMP | Data da importação |

**Relacionamentos:**
- N:1 com `users`
- 1:N com `vendasV5`

---

### 8. Vendas V5

Dados de vendas importados com quantidades por dia da semana.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Chave primária auto-incremento |
| `importacaoId` | INT | FK para importação |
| `codigoProduto` | VARCHAR(50) | Código do produto |
| `nomeProduto` | VARCHAR(200) | Nome do produto |
| `unidadeMedida` | VARCHAR(20) | Unidade (kg/un) |
| `dia2` | DECIMAL(10,2) | Quantidade segunda-feira |
| `dia3` | DECIMAL(10,2) | Quantidade terça-feira |
| `dia4` | DECIMAL(10,2) | Quantidade quarta-feira |
| `dia5` | DECIMAL(10,2) | Quantidade quinta-feira |
| `dia6` | DECIMAL(10,2) | Quantidade sexta-feira |
| `dia7` | DECIMAL(10,2) | Quantidade sábado |
| `createdAt` | TIMESTAMP | Data de criação |

**Índices:**
- `venda_v5_importacao_idx` (índice FK)
- `venda_v5_codigo_idx` (índice de busca)

**Relacionamentos:**
- N:1 com `importacoesV5`

---

## Fluxo de Dados

```
1. CADASTRO
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ Categorias  │───▶│  Produtos   │◀───│   Insumos   │
   └─────────────┘    └──────┬──────┘    └─────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │Ficha Técnica│ (receitas)
                      └──────┬──────┘
                             │
                             ▼
                      ┌─────────────┐
                      │   Blocos    │ (divisora)
                      └─────────────┘

2. IMPORTAÇÃO
   ┌─────────────┐    ┌─────────────┐
   │ Arquivo CSV │───▶│ImportaçõesV5│
   └─────────────┘    └──────┬──────┘
                             │
                             ▼
                      ┌─────────────┐
                      │  VendasV5   │ (dados por dia)
                      └─────────────┘

3. PROCESSAMENTO (em memória)
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  VendasV5   │───▶│Mapa Produção│───▶│  Engine PCP │
   └─────────────┘    └─────────────┘    └──────┬──────┘
                                                │
                      ┌─────────────────────────┼─────────────────────────┐
                      │                         │                         │
                      ▼                         ▼                         ▼
               ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
               │Pré-Pesagem  │          │Ficha Produção│         │  Detalhes   │
               └─────────────┘          └─────────────┘          └─────────────┘
```

---

## Tipos de Dados Customizados

### ENUMs Utilizados

| Enum | Valores | Uso |
|------|---------|-----|
| `role` | 'user', 'admin' | Papel do usuário |
| `tipo` | 'seco', 'molhado' | Classificação de insumos |
| `unidade` | 'kg', 'un' | Unidade de medida |
| `tipoComponente` | 'ingrediente', 'massa_base', 'sub_bloco' | Tipo na ficha técnica |

### Precisão Decimal

| Campo | Precisão | Uso |
|-------|----------|-----|
| `pesoUnitario` | DECIMAL(10,5) | 5 casas decimais para peso |
| `quantidadeBase` | DECIMAL(10,5) | 5 casas decimais para receitas |
| `pesoBloco` | DECIMAL(10,5) | 5 casas decimais para blocos |
| `dia2-dia7` | DECIMAL(10,2) | 2 casas decimais para vendas |

---

## Regras de Integridade

### Chaves Estrangeiras com CASCADE

| Tabela Pai | Tabela Filha | Ação |
|------------|--------------|------|
| `produtos` | `fichaTecnica` | ON DELETE CASCADE |
| `produtos` | `blocos` | ON DELETE CASCADE |
| `importacoesV5` | `vendasV5` | ON DELETE CASCADE |

### Constraints de Unicidade

| Tabela | Campo | Descrição |
|--------|-------|-----------|
| `users` | `openId` | Identificador OAuth único |
| `categorias` | `nome` | Nome de categoria único |
| `insumos` | `codigoInsumo` | Código de insumo único |
| `produtos` | `codigoProduto` | Código de produto único |

---

## Considerações de Performance

### Índices Recomendados

Os seguintes índices foram criados para otimizar consultas frequentes:

1. **Busca por código:** `codigo_insumo_idx`, `codigo_produto_idx`, `venda_v5_codigo_idx`
2. **Filtro por categoria:** `categoria_idx`
3. **Junção com importação:** `venda_v5_importacao_idx`, `ficha_produto_idx`

### Consultas Otimizadas

O sistema utiliza Drizzle ORM com relations pré-definidas, permitindo eager loading eficiente nas consultas de ficha técnica e vendas.

---

*Documento gerado em 06/01/2026 - Versão SemiFinal*

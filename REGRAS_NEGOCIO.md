# Regras de Negócio Implementadas - Sistema PCP Pão e Sonhos

**Versão:** SemiFinal  
**Data:** 06/01/2026

---

## 1. Padronização em KG/UN

Todos os insumos e produtos do sistema utilizam unidades padronizadas: **kg** (quilogramas) para itens pesáveis ou **un** (unidades) para itens contáveis. O sistema mantém consistência em todas as operações de cálculo, importação e exibição.

---

## 2. Regra da Divisora (Blocos de 30)

A máquina divisora da padaria trabalha com blocos padrão de **30 unidades**. O sistema implementa:

| Configuração | Comportamento |
|--------------|---------------|
| 30 unidades | Bloco padrão (divisora) |
| ≠ 30 unidades | "Pedaço" (produção manual) |

O **peso do bloco** é calculado automaticamente pela soma dos componentes cadastrados na ficha técnica do produto. Este campo é somente leitura quando há componentes cadastrados.

---

## 3. Regra de Ouro (Arredondamento 0,005 kg)

Esta é a regra crítica de arredondamento para insumos:

- **Direção:** Sempre para baixo (floor)
- **Múltiplo:** 0,005 kg (5 gramas)
- **Aplicação:** Apenas no total final consolidado

**Exemplo prático:**
- Cálculo bruto: 2,347 kg
- Arredondado: 2,345 kg (múltiplo de 0,005 mais próximo para baixo)

O arredondamento é aplicado **após** a consolidação de insumos repetidos, garantindo precisão no total final.

---

## 4. Integridade de Unidades

O sistema garante que produtos cadastrados em **"un"** (unidades) nunca exibam valores decimais:

- Arredondamento sempre para baixo (floor)
- Valores fracionários são truncados
- Exemplo: 15,7 un → 15 un

---

## 5. Estrutura de Cascata (Ficha Técnica)

O sistema permite que produtos sejam ingredientes de outros produtos, criando uma estrutura hierárquica:

```
Nível 1: Produto Final (ex: Pão Doce)
    └── Nível 2: Produto Intermediário (ex: Massa Base)
            └── Nível 3: Insumos Brutos (ex: Farinha, Açúcar, Água)
```

O engine de explosão "mergulha" recursivamente em todas as camadas até alcançar os insumos brutos, calculando as quantidades proporcionais em cada nível.

---

## 6. Consolidação de Insumos

Quando um mesmo insumo aparece em diferentes níveis da estrutura de cascata, o sistema **consolida** (soma) as quantidades antes de aplicar o arredondamento:

| Origem | Insumo | Quantidade |
|--------|--------|------------|
| Massa Base | Farinha | 3,500 kg |
| Produto Final | Farinha | 1,200 kg |
| **Total Consolidado** | **Farinha** | **4,700 kg** |

O arredondamento 0,005 kg é aplicado apenas no total consolidado.

---

## 7. Trava de Segurança (Fermento Editável)

Após o processamento do PCP, apenas o campo **Fermento** permanece editável nas fichas de produção. Esta regra existe porque:

- O fermento pode variar conforme condições ambientais (temperatura, umidade)
- Demais ingredientes seguem proporções fixas da ficha técnica
- Evita alterações acidentais em ingredientes críticos

---

## 8. Percentual de Ajuste

O Mapa de Produção permite ajustes percentuais na quantidade planejada:

| Opções Disponíveis |
|--------------------|
| -50%, -40%, -30%, -20%, -10% |
| 0% (sem ajuste) |
| +10%, +20%, +30%, +40%, +50% |

O recálculo da **Qtd_Planejada** é automático ao selecionar uma opção:

```
Qtd_Planejada = Qtd_Importada × (1 + Percentual/100)
```

---

## 9. Agrupamento por Dia de Produção

O Mapa de Produção agrupa os itens por **Dia Produzir** (dias 2 a 7), permitindo visualização organizada do planejamento semanal. Cada dia exibe:

- Quantidade de itens programados
- Total planejado em kg/un
- Funcionalidades de edição (percentual, equipe, mover para outro dia)

---

## 10. Ficha de Pré-Pesagem por Produto

A Ficha de Pré-Pesagem exibe os ingredientes **agrupados por produto**, com:

- Cabeçalho: ID – Nome do Produto (Qtd Planejada)
- Tabela de ingredientes com checkboxes
- Campo editável apenas para Fermento

---

## Validações Implementadas

| Regra | Descrição |
|-------|-----------|
| Código único | Código do produto deve ser único no sistema |
| Peso unitário obrigatório | Produtos em "un" devem ter peso unitário definido |
| Peso unitário imutável | Não pode ser alterado após criação do produto |
| Máximo 2 níveis | Ficha técnica permite até 2 níveis de hierarquia |
| Consistência de blocos | peso_bloco = unidades_por_bloco × peso_unitário |

---

*Documento gerado em 06/01/2026 - Versão SemiFinal*

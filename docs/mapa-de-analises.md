# Mapa de análises

Decisões sobre o dado e sobre a modelagem. Documento vivo: fecha em **20/09**, quando a
atividade *"Identificar variáveis relevantes para o problema de pesquisa"* vence, e vira a
seção de metodologia do Relatório Parcial.

## 1. O conjunto de dados

**Fonte:** [Brasil.IO — `caso_full`](https://brasil.io/dataset/covid19/caso_full/), compilado
a partir dos boletins das secretarias estaduais de saúde.

| | |
|---|---|
| Período | 25/02/2020 a 27/03/2022 (762 dias, sem lacunas) |
| Registros | 3.853.648 |
| Granularidade | uma linha por local e por dia |
| Municípios | 5.570 |
| Unidades federativas | 27 |
| Linhas municipais | 3.833.529 |
| Linhas estaduais | 20.119 |

### Colunas

| Coluna | O que é | Uso previsto |
|---|---|---|
| `city` | Nome do município (vazio nas linhas estaduais) | Identificação |
| `city_ibge_code` | Código IBGE | Chave do município |
| `date` | Data do boletim | Eixo temporal |
| `epidemiological_week` | Semana epidemiológica (`AAAASS`) | Atributo de sazonalidade |
| `estimated_population` | População estimada (IBGE) | **Normalização por 100 mil** |
| `estimated_population_2019` | População estimada em 2019 | Não usada — redundante |
| `is_last` | Última linha **com informação nova** de cada local | **Detecção do congelamento da série** |
| `is_repeated` | Boletim repetido do dia anterior | **Controle de qualidade** |
| `last_available_confirmed` | Casos acumulados | Séries acumuladas |
| `last_available_confirmed_per_100k_inhabitants` | Casos acumulados por 100 mil | Comparação entre locais |
| `last_available_date` | Data do último boletim válido | Diagnóstico de atraso |
| `last_available_death_rate` | Óbitos / casos acumulados | Letalidade aparente |
| `last_available_deaths` | Óbitos acumulados | Séries acumuladas |
| `order_for_place` | Ordem da linha dentro do local | Diagnóstico de continuidade |
| `place_type` | `city` ou `state` | **Separa os dois níveis** |
| `state` | Sigla da UF | Agregação e recorte |
| `new_confirmed` | Novos casos no dia | **Série principal** |
| `new_deaths` | Novos óbitos no dia | **Série principal** |

> `place_type` é a coluna mais perigosa do conjunto: as linhas `state` **já contêm** a soma
> dos municípios. Analisar os dois níveis juntos conta tudo duas vezes. Todo recorte precisa
> filtrar um nível ou outro, explicitamente.

## 2. Qualidade — o que foi medido

Levantado sobre o arquivo completo, antes de qualquer tratamento:

| Achado | Volume | Interpretação |
|---|---|---|
| `is_repeated = True` | 1.015.645 (26,4%) | Dias sem boletim novo. **Verificado:** nessas linhas `new_confirmed` e `new_deaths` já vêm exatamente zero, então não exigem tratamento |
| `new_confirmed` negativo | 38.638 | Correções retroativas das secretarias, quando um caso é reclassificado ou desduplicado |
| `new_deaths` negativo | 6.261 | Mesma origem |
| Sem `city_ibge_code` | 13.646 | Todas do pseudo-município `"Importados/Indefinidos"`, presente em 19 UFs e somando 121.059 casos |
| Sem `estimated_population` | 13.646 | As mesmas linhas acima |
| Duplicidades reais | 0 | A chave local + data é única |
| Linhas malformadas | 0 | Estrutura íntegra |
| **Lacuna entre níveis** | **6.298.850 casos (21,1%)** | **Casos contados pela UF que não aparecem em município nenhum** |
| **Cobertura municipal ≥ 90%** | **até 16/09/2021** | **Depois disso as séries municipais congelam progressivamente** |

### O achado decisivo: as séries municipais congelam

`is_last` marca a última linha **com informação nova**. Depois dela a série continua até
27/03/2022, mas preenchida com repetições em que o incremento diário é zero. Um município
congelado em setembro de 2021 continua na tabela somando zero caso por dia.

| Trimestre da última atualização real | Municípios |
|---|---|
| 3º tri/2021 | 1.608 |
| 4º tri/2021 | 2.316 |
| 1º tri/2022 | 1.646 |

Mediana: **01/12/2021**. Nenhum município recebe atualização real em 27/03/2022.
A consequência aparece na participação municipal no total das UFs:

| Trimestre | % dos casos capturado pelo nível municipal |
|---|---|
| 2020 Q2 – 2021 Q2 | 98% a 102% |
| 2021 Q3 | 95,6% |
| 2021 Q4 | 73,4% |
| **2022 Q1** | **22,3%** |

Levar a análise municipal até março de 2022 faria a onda Ômicron parecer quase inexistente
no interior do país — uma conclusão falsa produzida por falha de cobertura, não pela
epidemia. Medido em `notebooks/01_ingestao_qualidade.ipynb`; ver
`resultados/figuras/cobertura_municipal.png`.

### Decisões de tratamento

| Situação | Decisão | Por quê |
|---|---|---|
| Valores negativos | Manter e suavizar com média móvel de 7 dias | Zerar apagaria a correção e deixaria o acumulado inflado. A média móvel absorve o ajuste sem perder o total |
| `is_repeated` | Nenhum tratamento nos incrementos | Verificado: já vêm zerados. Mas a coluna é essencial para detectar o congelamento das séries |
| `"Importados/Indefinidos"` | Fora das análises municipais, dentro dos totais estaduais | Sem município não entra em análise municipal; excluir do total sumiria com casos reais |
| Dois níveis em `place_type` | Filtrar sempre um dos dois | Evita contagem em dobro |
| Comparação entre locais | Sempre por 100 mil habitantes | Absoluto só mede tamanho da população |
| Sazonalidade semanal | Média móvel de 7 dias em toda série diária | Boletins represam no fim de semana |
| Congelamento das séries municipais | **Análise municipal recortada em 16/09/2021** | Última data com pelo menos 90% dos municípios ainda atualizados |
| Série para previsão | **Nível estadual, série completa** | As UFs publicam até o fim; os municípios não |

## 3. Perguntas da análise exploratória

1. Como foi a evolução de casos e óbitos no Brasil, e quais foram as ondas?
2. Quais UFs tiveram maior incidência e maior mortalidade **por 100 mil habitantes**?
3. A letalidade aparente mudou ao longo do tempo?
4. A distribuição da incidência entre os 5.570 municípios é homogênea?
5. Municípios de portes diferentes tiveram curvas de formatos diferentes?
6. Existe padrão semanal na notificação?

## 4. Modelagem

### O que o dado permite

O conjunto é **agregado por local e dia**. Não há uma única variável individual: nem idade,
nem sexo, nem comorbidade, nem desfecho de paciente. Isso elimina de saída o modelo mais
comum em trabalhos de COVID-19 — prever o óbito de um paciente. Qualquer tentativa nesse
sentido seria inventar um alvo que o dado não sustenta.

O que o dado sustenta são duas coisas: **descrever o formato das curvas** e **prever a
continuação de uma série**.

### Frente 1 — Agrupamento de municípios (não supervisionado)

Responde diretamente ao objetivo aprovado: *"identificação de padrões nos dados"*.

**Recorte:** série municipal de 25/02/2020 a **16/09/2021**, pelo motivo da seção 2.
**Unidade:** um município. **Atributos:**

| Atributo | Descrição |
|---|---|
| `incidencia_100k` | Casos acumulados por 100 mil habitantes |
| `mortalidade_100k` | Óbitos acumulados por 100 mil habitantes |
| `pico_100k` | Máximo da média móvel de 7 dias, por 100 mil |
| `dia_do_pico` | Dias entre o primeiro caso e o pico |
| `n_ondas` | Número de picos relevantes na média móvel |
| `letalidade` | Óbitos / casos acumulados |
| `duracao_serie` | Dias entre o primeiro e o último registro |
| `populacao` | População estimada |

**Método:** padronização com `StandardScaler`, escolha de *k* pelo método do cotovelo
combinado ao coeficiente de silhueta, K-Means, e PCA em duas componentes para visualizar.
Cada grupo é caracterizado pela média dos atributos e recebe um nome descritivo.

**Avaliação:** silhueta e, principalmente, interpretabilidade — um agrupamento que não pode
ser descrito em uma frase não serve para o relatório.

### Frente 2 — Previsão de casos (supervisionado, regressão)

Dá ao trabalho uma métrica numérica clara e permite a comparação de modelos que a
Quinzena 6 cobra.

**Recorte:** série estadual completa, 25/02/2020 a 27/03/2022 — inclui a onda Ômicron,
que o nível municipal perde. **Unidade:** uma UF em um dia. **Alvo:** média móvel de 7 dias de `new_confirmed`
*h* dias à frente. **Atributos:** defasagens da média móvel (1, 7 e 14 dias), variação
relativa recente, semana epidemiológica, dia da semana e a UF.

**Método:** baseline ingênuo (amanhã igual a hoje), depois Ridge e RandomForest.

**Avaliação:** MAE e RMSE em recorte **temporal** — treino até uma data, teste depois.
Divisão aleatória em série temporal deixa o modelo ver o futuro e produz métrica falsa.

### Por que não classificação

Seria preciso inventar o alvo — por exemplo, faixa de letalidade do município — derivando-o
das próprias variáveis de entrada. O resultado seria alto por construção e não responderia
a nenhuma pergunta real. Fica registrado como alternativa avaliada e descartada.

## 5. Título

**Provisório (Plano de Ação):** Análise de dados da COVID-19 com aplicação de técnicas de
aprendizado de máquina.

**Proposto:** Análise de dados públicos da COVID-19 no Brasil: padrões municipais de
propagação e previsão de casos com aprendizado de máquina.

Nomeia as duas frentes, delimita o recorte geográfico e mantém o problema aprovado.

## 6. Limitações a declarar

- Dado agregado, sem variáveis individuais — nada se conclui sobre risco de pacientes.
- Subnotificação: a série mede casos **notificados**, e a testagem variou entre municípios
  e ao longo do tempo.
- Série encerrada em 27/03/2022 — nada se conclui sobre o período posterior.
- **A análise municipal cobre até 16/09/2021**, porque depois disso as séries municipais
  congelam. Conclusões sobre a onda Ômicron valem apenas no nível estadual.
- Correções retroativas e dias sem boletim afetam a série diária mesmo após tratamento.
- O agrupamento é descritivo: identifica grupos, não causas.

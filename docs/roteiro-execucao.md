# Roteiro de execução — PI IV

Passo a passo da Quinzena 3 até a entrega final, amarrado às atividades do Plano de Ação
e às duas entregas de documentação (Relatório Parcial em 30/09 e Relatório Final + Vídeo em 06/11).

Cada quinzena tem três blocos: **o que o plano cobra** (as atividades tal como foram
prometidas à faculdade), **como fazer** (os passos concretos) e **o que fica pronto**
(os artefatos, separando produto de documentação).

> As datas do Plano de Ação não trazem o ano; todo este roteiro assume **2026**.
> Hoje é 10/09/2026 — vocês estão no meio da Quinzena 3.

---

## Situação hoje

| | |
|---|---|
| Quinzena corrente | **3** (07/09 – 20/09) |
| Concluído | Quinzenas 1 e 2 — Plano de Ação entregue em 01/09 |
| Próxima entrega | **Relatório Parcial, 30/09** — faltam 20 dias |
| Entrega final | Relatório Final e Vídeo, 06/11 |

O dataset já está em `dados/`. O que falta na Quinzena 3 é transformá-lo em conhecimento
documentado: qualidade, exploração e escolha das variáveis.

---

## Quinzena 3 — 07/09 a 20/09

**Objetivo do plano:** definir o título do trabalho e dar continuidade ao desenvolvimento.

**O que o plano cobra**

| Atividade | Prazo |
|---|---|
| Importar e estruturar o conjunto de dados em ambiente Python | 07/09 – 09/09 |
| Avaliar dimensões, tipos de dados, valores ausentes e duplicidades | 08/09 – 12/09 |
| Realizar análise exploratória inicial das variáveis | 10/09 – 17/09 |
| Identificar variáveis relevantes para o problema de pesquisa | 14/09 – 20/09 |
| Refinar título e problema caso necessário | 18/09 – 20/09 |

### Como fazer

**1. Ambiente (meia hora, uma vez só)**

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

**2. Ingestão — CSV para Parquet**

```bash
python -m pi4.ingestao
```

O CSV tem 437 MB e 3,85 milhões de linhas: cada `read_csv` custa perto de um minuto e
consome memória à toa, porque toda coluna vira `object`. A ingestão converte uma vez para
Parquet com os tipos certos (`state` e `place_type` como categoria, datas como data,
contadores como inteiro de 32 bits). Depois disso, carregar leva poucos segundos.
Isso resolve a atividade *"Importar e estruturar o conjunto de dados em ambiente Python"*.

**3. Notebook `01_ingestao_qualidade.ipynb` — o diagnóstico**

Responde à atividade *"Avaliar dimensões, tipos de dados, valores ausentes e duplicidades"*.
Cada item vira uma célula com número e uma frase de interpretação:

- dimensões, tipos e memória (`df.info()`, `df.describe()`);
- ausentes por coluna — e a constatação de que as 13.646 linhas sem `city_ibge_code`
  são todas do pseudo-município `"Importados/Indefinidos"`, não erro de digitação;
- duplicidades reais (mesma cidade e mesma data) versus **`is_repeated`**, que marca
  1.015.645 linhas (26%) em que a secretaria não publicou boletim e o valor do dia anterior
  foi repetido — a distinção entre as duas coisas é o achado mais importante desta etapa;
- **valores negativos**: 38.638 em `new_confirmed` e 6.261 em `new_deaths`, que são correções
  retroativas das secretarias, não sujeira;
- **o congelamento das séries municipais** — o achado que mais afeta o projeto: `is_last`
  marca a última linha com informação nova, e a partir do 3º trimestre de 2021 os municípios
  param de ser atualizados um a um. Em 2022, o nível municipal captura só 22% dos casos que
  as UFs registram, e a lacuna acumulada chega a 6,3 milhões de casos (21% do total);
- cobertura temporal por UF (quando cada estado começou a publicar) e verificação de que
  `place_type` separa corretamente os totais estaduais das linhas municipais — somar
  os dois níveis contaria tudo em dobro.

**Produto:** uma tabela de diagnóstico salva em `resultados/qualidade_dados.csv`. Ela vai
inteira para a seção de tratamento de dados do Relatório Parcial.

**4. Notebook `02_eda.ipynb` — a exploração**

Responde à atividade *"Realizar análise exploratória inicial das variáveis"*. As perguntas,
nesta ordem:

1. **Como foi a epidemia no Brasil?** Casos e óbitos diários com média móvel de 7 dias.
   A média móvel não é enfeite: os boletins represam no fim de semana, e a série crua
   tem um dente de serra semanal que esconde a tendência.
2. **Quais foram as ondas?** Marcar os picos na curva nacional e datá-los.
3. **Os estados foram iguais?** Ranking de UFs por incidência e por mortalidade
   **por 100 mil habitantes** — comparar números absolutos entre São Paulo e Acre não diz nada.
4. **A letalidade mudou?** `last_available_death_rate` ao longo do tempo, e a razão
   óbitos/casos por mês. A queda ao longo de 2021 é esperada (vacinação e mais testagem)
   e é uma das interpretações mais fortes que o trabalho pode oferecer.
5. **Municípios grandes e pequenos sofreram igual?** Distribuição da incidência acumulada
   por 100 mil entre os 5.570 municípios — é muito assimétrica, então use escala logarítmica
   ou trabalhe com a mediana, nunca só com a média.
6. **Existe padrão semanal?** Casos médios por dia da semana, confirmando o represamento.

**Produto:** figuras em `resultados/figuras/` e as conclusões escritas no próprio notebook.

**5. Escolher as variáveis relevantes (até 20/09)**

Fechar `docs/mapa-de-analises.md` com a lista das variáveis que entram na modelagem
e **por que** cada uma entra. Essa justificativa é o que a atividade
*"Identificar variáveis relevantes"* pede — e é o que separa um trabalho de ciência de dados
de um amontoado de gráficos.

**6. Refinar o título (até 20/09)**

O título provisório — *"Análise de dados da COVID-19 com aplicação de técnicas de
aprendizado de máquina"* — não diz o que será feito. Proposta:

> **Análise de dados públicos da COVID-19 no Brasil: padrões municipais de propagação e
> previsão de casos com aprendizado de máquina**

Ele nomeia as duas frentes de ML (agrupamento e previsão), delimita o recorte geográfico
e continua fiel ao problema aprovado no Plano de Ação.

### O que fica pronto

| Produto | Documentação |
|---|---|
| `dados/caso_full.parquet` | Tabela de qualidade dos dados |
| `notebooks/01_ingestao_qualidade.ipynb` | Achados da EDA redigidos |
| `notebooks/02_eda.ipynb` | `docs/mapa-de-analises.md` fechado |
| `resultados/qualidade_dados.csv` e figuras | Título refinado |

---

## Quinzena 4 — 21/09 a 30/09 · **Relatório Parcial**

**Objetivo do plano:** construir e apresentar a solução inicial e entregar o Relatório Parcial.

**O que o plano cobra**

| Atividade | Prazo |
|---|---|
| Realizar limpeza e tratamento dos dados | 21/09 – 24/09 |
| Elaborar análises estatísticas e visualizações exploratórias | 22/09 – 27/09 |
| Definir as variáveis de entrada e variável-alvo para ML | 24/09 – 27/09 |
| Preparar versão inicial do conjunto de dados para modelagem | 25/09 – 29/09 |
| Elaborar e revisar o Relatório Parcial | 27/09 – 30/09 |

### Como fazer

**1. Aplicar o tratamento (`src/pi4/tratamento.py`)**

O diagnóstico da Quinzena 3 vira código, cada decisão com uma linha de justificativa:

| Situação | Decisão |
|---|---|
| `new_confirmed` / `new_deaths` negativos | Manter na série e suavizar com média móvel de 7 dias. Zerar apagaria a correção e inflaria o acumulado |
| `is_repeated = True` | Nada a tratar — verificado que os incrementos já vêm zerados |
| `"Importados/Indefinidos"` | Fora das análises municipais, dentro dos totais estaduais |
| Escalas entre localidades | Tudo normalizado por 100 mil habitantes com `estimated_population` |
| Congelamento das séries municipais | Recortar a análise municipal em **16/09/2021**, última data com 90% dos municípios ainda atualizados |
| Previsão | Rodar sobre a **série estadual**, que vai completa até 27/03/2022 |

**2. Construir as duas tabelas de modelagem (`03_features_modelagem.ipynb`)**

*Para o agrupamento* — uma linha por município, **com a série recortada em 16/09/2021**,
e atributos que descrevem o **formato** da curva epidêmica: incidência acumulada por 100 mil, pico da média móvel por 100 mil,
dia do pico contado desde o primeiro caso, número de ondas, letalidade acumulada,
duração da série e população. Isso é `resultados/features_municipios.csv`.

*Para a previsão* — uma linha por UF e por dia, com defasagens da média móvel de casos
(1, 7 e 14 dias), a semana epidemiológica e o dia da semana. O alvo é a média móvel
de casos alguns dias à frente. Isso é `resultados/serie_uf.csv`.

**3. Refazer os gráficos com qualidade de relatório**

Os gráficos da Quinzena 3 são de trabalho. Os do relatório precisam de título, eixos
nomeados com unidade, fonte dos dados e legenda que explique o que se vê.

**4. Escrever o Relatório Parcial**

> Confira a estrutura contra o modelo disponível no AVA — ele manda. A sequência abaixo é
> a ordem lógica do conteúdo que vocês já terão em mãos.

- Introdução, tema e justificativa — do Plano de Ação, com o título refinado
- Problema e objetivo — inalterados
- Fundamentação teórica — a bibliografia levantada na Quinzena 1
- Materiais e métodos — origem do dado (Brasil.IO), recorte, ferramentas (Python, pandas, scikit-learn)
- **Tratamento dos dados** — a tabela de qualidade e as decisões acima. É a seção mais
  fácil de defender, porque cada número foi medido
- **Análise exploratória** — as seis perguntas da Quinzena 3, com os gráficos
- **Definição da modelagem** — variáveis de entrada, variável-alvo, e por que agrupamento
  e previsão em vez de classificação (ver `docs/mapa-de-analises.md`)
- Cronograma restante e próximos passos

### O que fica pronto

| Produto | Documentação |
|---|---|
| `src/pi4/tratamento.py` | **Relatório Parcial entregue em 30/09** |
| `03_features_modelagem.ipynb` | Seção de tratamento de dados |
| `resultados/features_municipios.csv` | Seção de análise exploratória |
| `resultados/serie_uf.csv` | Definição de X e y registrada |
| Figuras finalizadas | |

---

## Quinzena 5 — 05/10 a 18/10

**Objetivo do plano:** construir a solução final com base nas sugestões do Relatório Parcial.

**O que o plano cobra**

| Atividade | Prazo |
|---|---|
| Preparar os dados para treinamento e teste | 05/10 – 08/10 |
| Selecionar algoritmo(s) de aprendizado de máquina | 07/10 – 10/10 |
| Treinar modelo inicial | 09/10 – 13/10 |
| Avaliar métricas iniciais | 12/10 – 15/10 |
| Realizar ajustes e nova execução | 14/10 – 18/10 |

### Como fazer

**1. Separar treino e teste — com cuidado**

Para a previsão, o corte é **temporal**: treina até uma data, testa depois dela.
Embaralhar aleatoriamente uma série temporal deixa o modelo ver o futuro e produz uma
métrica excelente e falsa. É o erro mais comum em trabalhos de série temporal e o primeiro
que uma banca procura. Use `TimeSeriesSplit` do scikit-learn.

Para o agrupamento não há treino e teste — é aprendizado não supervisionado. O que existe
é a **escolha do número de grupos**, e ela precisa ser justificada.

**2. Agrupamento (`04_clusterizacao.ipynb`)**

Padronizar os atributos (`StandardScaler` — sem isso, população domina tudo por ordem de
grandeza), escolher *k* combinando o método do cotovelo com o coeficiente de silhueta,
rodar K-Means e projetar em duas componentes principais (PCA) para conseguir visualizar.
Depois, o passo que dá sentido ao resultado: **caracterizar cada grupo** pela média dos
seus atributos e dar um nome descritivo a ele.

**3. Previsão (`05_previsao.ipynb`)**

Comece pelo **baseline ingênuo**: prever que amanhã será igual a hoje. Um modelo que não
supera esse baseline não aprendeu nada, e ter o número na mão evita conclusão otimista.
Depois Ridge e RandomForest sobre as defasagens, avaliados por MAE e RMSE no período de teste.

**4. Registrar tudo**

Cada rodada vira uma linha em `resultados/experimentos.csv`: data, modelo, parâmetros,
métrica de treino, métrica de teste. A atividade *"Registrar parâmetros e resultados"* está
no plano, e é isso que torna a comparação da Quinzena 6 possível.

### O que fica pronto

| Produto | Documentação |
|---|---|
| `04_clusterizacao.ipynb` | Justificativa do *k* escolhido |
| `05_previsao.ipynb` | Tabela de métricas contra o baseline |
| `resultados/experimentos.csv` | Descrição de cada grupo encontrado |
| Modelos treinados | |

---

## Quinzena 6 — 19/10 a 01/11

**Objetivo do plano:** analisar os resultados, finalizar o protótipo e preparar o vídeo.

**O que o plano cobra**

| Atividade | Prazo |
|---|---|
| Analisar e interpretar os resultados do modelo | 19/10 – 23/10 |
| Comparar desempenho dos modelos | 20/10 – 24/10 |
| Desenvolver interface para visualização dos resultados | 22/10 – 28/10 |
| Integrar análises e resultados à interface | 25/10 – 30/10 |
| Iniciar roteiro e organização do vídeo | 29/10 – 01/11 |

### Como fazer

**1. Interpretar, não só reportar**

Para o agrupamento: o que cada grupo significa? Municípios pequenos com onda única e tardia
provavelmente refletem interiorização da epidemia; grandes centros com múltiplas ondas
precoces refletem entrada pelo aeroporto e densidade. Cruzar os grupos com região e porte
populacional é o que transforma cluster em achado.

Para a previsão: **onde o modelo erra**. Ele quase certamente acerta em platô e erra nas
viradas de onda — que é justamente quando a previsão importaria. Dizer isso com clareza vale
mais do que esconder atrás de um MAE baixo.

**2. Comparar os modelos**

Uma tabela: baseline, Ridge e RandomForest, com MAE e RMSE, e a escolha do modelo final
com o motivo. Se o ganho sobre o baseline for pequeno, diga — é resultado, não fracasso.

**3. Interface de visualização — o entregável da disciplina**

Segunda página no mesmo `site/`, publicada junto com o painel. pandas e scikit-learn não
rodam no navegador, então os notebooks **exportam JSONs prontos** para `site/dados/`:
série por UF, atributos e grupo de cada município, e previsto contra realizado.
A página só desenha.

Telas: a curva nacional com as ondas marcadas; comparação entre UFs por 100 mil;
o resultado do agrupamento (dispersão PCA e a caracterização de cada grupo);
e previsto contra realizado no período de teste.

**4. Roteiro do vídeo**

Contexto e problema, dados e tratamento, o que a exploração mostrou, os dois modelos e
seus resultados, demonstração da interface, conclusões e limitações. Escreva o roteiro
por escrito antes de gravar e cronometre — o tempo limite está no AVA.

### O que fica pronto

| Produto | Documentação |
|---|---|
| `site/resultados.html` publicado | Interpretação dos grupos redigida |
| JSONs exportados em `site/dados/` | Tabela comparativa dos modelos |
| | Roteiro do vídeo escrito |

---

## Quinzena 7 — 02/11 a 06/11 · **Relatório Final e Vídeo**

**Objetivo do plano:** concluir e entregar o Relatório Final e o Vídeo.

**O que o plano cobra**

| Atividade | Prazo |
|---|---|
| Consolidar os resultados finais das análises | 02/11 – 04/11 |
| Elaborar conclusões e limitações | 02/11 – 05/11 |
| Revisar e finalizar a interface | 02/11 – 05/11 |
| Finalizar e revisar o Relatório Final | 03/11 – 06/11 |
| Gravar e finalizar o vídeo | 03/11 – 06/11 |
| Avaliação colaborativa e entrega dos materiais | 06/11 |

### Como fazer

**1. Conclusões amarradas ao objetivo**

O objetivo aprovado fala em *"identificação de padrões nos dados"* e *"apresentação dos
resultados por meio de uma interface de visualização"*. A conclusão precisa responder
exatamente isso: quais padrões foram identificados, e onde eles estão visíveis na interface.

**2. Limitações — escreva, não esconda**

Esta seção pesa na avaliação e é onde o trabalho demonstra maturidade:

- o dado é **agregado por município e dia**, sem nenhuma variável individual (idade, sexo,
  comorbidade). Nenhuma conclusão sobre risco de pacientes pode ser tirada daqui;
- **subnotificação**: casos confirmados dependem de testagem, que variou muito entre
  municípios e ao longo do tempo. A curva mede casos *notificados*, não infecções;
- a série termina em **27/03/2022**, então nada se conclui sobre o período posterior;
- correções retroativas e dias sem boletim afetam a série diária, mesmo tratados;
- o agrupamento é descritivo: define grupos, não causas.

**3. Fechamento**

Revisar a interface publicada (testar o link em outro computador e no celular),
finalizar o relatório, gravar o vídeo, e entregar tudo em 06/11.

### O que fica pronto

| Produto | Documentação |
|---|---|
| Interface publicada e testada | **Relatório Final entregue em 06/11** |
| Repositório organizado | **Vídeo entregue em 06/11** |
| | Conclusões e limitações redigidas |
| | Avaliação colaborativa |

---

## Calendário das entregas

| Data | Entrega | Situação |
|---|---|---|
| 01/09 | Plano de Ação | Entregue |
| **30/09** | **Relatório Parcial** | Quinzena 4 |
| **06/11** | **Relatório Final** | Quinzena 7 |
| **06/11** | **Vídeo de apresentação** | Quinzena 7 |

## Divisão sugerida do trabalho

O plano registra "Grupo" como responsável de todas as atividades, o que é aceitável no
documento oficial mas não organiza ninguém. Uma divisão que funciona com sete pessoas é
formar três frentes — **dados** (ingestão, qualidade, tratamento), **modelagem**
(agrupamento e previsão) e **comunicação** (interface, relatório, vídeo) — com duas ou três
pessoas em cada e rodízio entre as quinzenas, para que todos toquem em todas as partes.
Registrem a divisão real no painel, atividade por atividade.

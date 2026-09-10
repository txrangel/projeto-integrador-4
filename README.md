# Projeto Integrador IV — Análise de dados públicos da COVID-19

Univesp · Polo São Paulo · Orientador: Alexandre Roberto Soares

Repositório do PI IV: painel de acompanhamento do cronograma e a trilha de análise
de dados (tratamento, EDA, aprendizado de máquina e interface de visualização).

## Integrantes

| Integrante | RA |
|---|---|
| Arthur da Silva Pereira | 2222596 |
| Danilo dos Anjos Santos | 23226080 |
| Enzo Martins Cesario da Silva | 23223105 |
| Guilherme Vinicius Busato | 23228114 |
| João Vitor Rangel Teixeira Domingues | 2215796 |
| João Eduardo Damasceno Santos | 23222065 |
| Larissa Silva de Souza | 23213868 |

## Estrutura

```
site/         painel de acompanhamento (HTML estático, publicável)
docs/         roteiro de execução, mapa de análises e especificação
notebooks/    a análise em si, um notebook por etapa
src/pi4/      funções reutilizadas pelos notebooks
dados/        dataset bruto e derivados (fora do git)
resultados/   tabelas, figuras e JSONs exportados pelos notebooks
```

## Painel de acompanhamento

Página estática, sem build e sem dependências.

- `site/plano.json` — as 35 atividades e os 3 marcos do Plano de Ação entregue. **Não edite:** é o espelho do documento oficial.
- `site/progresso.json` — o estado do grupo: situação, responsáveis, anotações e demandas extras.

**Como marcar progresso:** abra o painel, clique numa barra, altere o que precisar.
As mudanças ficam guardadas no seu navegador e aparece um aviso no topo.
Clique em **Exportar progresso.json**, e substitua `site/progresso.json` no repositório
(pelo site do GitHub mesmo, em *Add file → Upload files*). No próximo carregamento,
todo o grupo vê o estado novo.

### Rodar localmente

```bash
cd site && python3 -m http.server 8000
```

Depois abra <http://localhost:8000>. Abrir o `index.html` direto do disco **não funciona** —
o navegador bloqueia a leitura dos JSONs por segurança.

### Publicar

**GitHub Pages** — em *Settings → Pages*, escolha a branch `main` e a pasta `/site`.
O painel fica em `https://<usuario>.github.io/<repositorio>/`.

**Vercel** — *Add New → Project*, importe o repositório, defina *Root Directory* como `site`
e *Framework Preset* como **Other**. Sem comando de build.

## Trilha de análise

Roteiro completo por quinzena: [`docs/roteiro-execucao.md`](docs/roteiro-execucao.md).
Decisões sobre os dados e os modelos: [`docs/mapa-de-analises.md`](docs/mapa-de-analises.md).

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m pi4.ingestao          # converte o CSV para Parquet (uma vez só)
jupyter lab
```

## Dados

[Brasil.IO — Boletins epidemiológicos da COVID-19 por município](https://brasil.io/dataset/covid19/caso_full/),
arquivo `caso_full.csv.gz`. Série diária por município e por unidade federativa,
de 25/02/2020 a 27/03/2022 — 3.853.648 registros, 5.570 municípios, 27 UFs.

O arquivo não está versionado (88 MB). Baixe e coloque em `dados/caso_full.csv.gz`.

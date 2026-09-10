"""Caminhos do projeto e carga do conjunto de dados já convertido."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[2]


class CAMINHOS:
    """Locais fixos do projeto, resolvidos a partir da raiz do repositório."""

    raiz = RAIZ
    dados = RAIZ / "dados"
    csv_gz = dados / "caso_full.csv.gz"
    csv = dados / "caso_full.csv"
    parquet = dados / "caso_full.parquet"
    resultados = RAIZ / "resultados"
    figuras = RAIZ / "resultados" / "figuras"
    site_dados = RAIZ / "site" / "dados"


def carregar(nivel: str | None = None, colunas: list[str] | None = None) -> pd.DataFrame:
    """Carrega o Parquet gerado por ``pi4.ingestao``.

    O conjunto traz dois níveis sobrepostos na mesma tabela: as linhas ``state``
    já contêm a soma dos seus municípios. Somar os dois níveis conta tudo em
    dobro, então ``nivel`` deve ser informado em praticamente toda análise.

    Args:
        nivel: ``"city"``, ``"state"`` ou ``None`` para trazer os dois.
        colunas: subconjunto de colunas a ler; ``None`` lê todas.
    """
    if not CAMINHOS.parquet.exists():
        raise FileNotFoundError(
            f"{CAMINHOS.parquet} não existe. Rode primeiro: python -m pi4.ingestao"
        )

    filtros = [("place_type", "==", nivel)] if nivel else None
    df = pd.read_parquet(CAMINHOS.parquet, columns=colunas, filters=filtros)

    # Ordena pelas chaves que de fato vieram — `colunas` pode ter pedido um subconjunto.
    ordem = [c for c in ("state", "city_ibge_code", "date") if c in df.columns]
    return df.sort_values(ordem, ignore_index=True) if ordem else df


def carregar_municipios(colunas: list[str] | None = None) -> pd.DataFrame:
    """Só as linhas municipais (5.571 municípios)."""
    return carregar("city", colunas)


def carregar_ufs(colunas: list[str] | None = None) -> pd.DataFrame:
    """Só os totais por unidade federativa (27 UFs)."""
    return carregar("state", colunas)

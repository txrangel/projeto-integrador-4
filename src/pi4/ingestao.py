"""Converte o CSV do Brasil.IO para Parquet com os tipos corretos.

O arquivo bruto tem 437 MB e 3,85 milhões de linhas. Lido direto com
``read_csv``, cada carga leva perto de um minuto e toda coluna vira ``object``,
o que gasta memória à toa e faz qualquer agrupamento rastejar. A conversão
roda uma vez e deixa o Parquet tipado, que carrega em poucos segundos.

Uso:
    python -m pi4.ingestao
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from pi4.dados import CAMINHOS

# Tipos definidos na leitura. Colunas com ausentes usam os tipos anuláveis do
# pandas (Int32), porque o int do numpy não representa nulo.
TIPOS = {
    "city": "string",
    "city_ibge_code": "Int32",
    "epidemiological_week": "Int32",
    "estimated_population": "Int32",
    "estimated_population_2019": "Int32",
    "is_last": "boolean",
    "is_repeated": "boolean",
    "last_available_confirmed": "Int32",
    "last_available_confirmed_per_100k_inhabitants": "Float32",
    "last_available_death_rate": "Float32",
    "last_available_deaths": "Int32",
    "order_for_place": "Int32",
    "place_type": "category",
    "state": "category",
    "new_confirmed": "Int32",
    "new_deaths": "Int32",
}

DATAS = ["date", "last_available_date"]

# Categorias fixadas para que todo pedaço do arquivo use o mesmo dicionário —
# sem isso o Parquet ganha um esquema diferente por bloco e a escrita falha.
UFS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
    "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
    "SE", "SP", "TO",
]
NIVEIS = ["city", "state"]

LINHAS_POR_BLOCO = 500_000


def _origem() -> Path:
    """Prefere o CSV solto; o .gz custa 20 segundos só para descomprimir."""
    if CAMINHOS.csv.exists():
        return CAMINHOS.csv
    if CAMINHOS.csv_gz.exists():
        return CAMINHOS.csv_gz
    raise FileNotFoundError(
        f"Nenhum dos arquivos encontrado:\n  {CAMINHOS.csv}\n  {CAMINHOS.csv_gz}\n"
        "Baixe o caso_full.csv.gz em https://brasil.io/dataset/covid19/caso_full/"
    )


def _esquema(df: pd.DataFrame) -> pa.Schema:
    tabela = pa.Table.from_pandas(df, preserve_index=False)
    return tabela.schema


def converter(destino: Path | None = None, forcar: bool = False) -> Path:
    """Lê o CSV em blocos e grava um único Parquet comprimido."""
    destino = destino or CAMINHOS.parquet
    origem = _origem()

    if destino.exists() and not forcar:
        print(f"{destino.name} já existe. Use --forcar para refazer.")
        return destino

    destino.parent.mkdir(parents=True, exist_ok=True)
    inicio = time.perf_counter()
    print(f"Lendo {origem.name} ({origem.stat().st_size / 1e6:.0f} MB) em blocos…")

    escritor: pq.ParquetWriter | None = None
    total = 0
    try:
        blocos = pd.read_csv(
            origem,
            dtype=TIPOS,
            parse_dates=DATAS,
            chunksize=LINHAS_POR_BLOCO,
        )
        for i, bloco in enumerate(blocos, 1):
            bloco["state"] = bloco["state"].cat.set_categories(UFS)
            bloco["place_type"] = bloco["place_type"].cat.set_categories(NIVEIS)

            tabela = pa.Table.from_pandas(bloco, preserve_index=False)
            if escritor is None:
                escritor = pq.ParquetWriter(destino, tabela.schema, compression="zstd")
            escritor.write_table(tabela)

            total += len(bloco)
            print(f"  bloco {i:>2}  {total:>9,} linhas".replace(",", "."), end="\r")
    finally:
        if escritor is not None:
            escritor.close()

    segundos = time.perf_counter() - inicio
    tamanho = destino.stat().st_size / 1e6
    print(f"\n{total:,} linhas → {destino.name} ({tamanho:.0f} MB) em {segundos:.0f}s"
          .replace(",", "."))
    return destino


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--forcar", action="store_true", help="refaz mesmo se já existir")
    args = ap.parse_args(argv)

    caminho = converter(forcar=args.forcar)

    # Confere o resultado lendo de volta, para o aviso aparecer agora e não no notebook.
    df = pd.read_parquet(caminho, columns=["date", "place_type", "state", "new_confirmed"])
    print(
        f"Conferência: {len(df):,} linhas · "
        f"{df['date'].min():%d/%m/%Y} a {df['date'].max():%d/%m/%Y} · "
        f"{df['state'].nunique()} UFs".replace(",", ".")
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

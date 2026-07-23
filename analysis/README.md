# Analysis workspace

Run a fully reproducible synthetic smoke test:

```bash
python -m venv .venv
python -m pip install -r requirements.txt
python analysis/train.py
python analysis/diagnostics.py
```

Supply a normalized CSV or parquet table:

```bash
python analysis/train.py --input data/daily.parquet --output analysis/artifacts
```

Expected daily columns:

`date`, `wti`, `gas_median`, `gas_low`, `gas_high`, `tanker_flow`, `congestion`, `dark_activity`, `generic_ballot_margin`, `house_control_prob`, `inventory_change`, `dxy`.

Generated artifacts are ignored by Git because they depend on the analyst's data license and model run. Commit only explicitly approved, reproducible summaries.

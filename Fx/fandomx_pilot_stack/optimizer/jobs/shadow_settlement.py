import os
from datetime import datetime, timezone, timedelta
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "service"))

from db import run_shadow_settlement, settlement_summary


def main():
    run_date = os.getenv("SETTLEMENT_DATE")
    if not run_date:
        # default: previous UTC day for stable nightly closure
        run_date = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()

    run_shadow_settlement(run_date)
    rows = settlement_summary(run_date)
    gross = sum(r["gross_spend"] for r in rows)
    print(f"shadow_settlement_complete date={run_date} rows={len(rows)} gross_spend={gross:.2f}")


if __name__ == "__main__":
    main()

# Data files

| File | What it is |
|---|---|
| `product-copy.json` | Every product description written so far (139 entries), in the [bulk publish format](../docs/product-sourcing.md#bulk-publish-format). Entries with `"reject"` record why a CJ product was turned down. Use it as house-style examples and as a record of what's been reviewed |
| `pending-publish.json` | The queue still to publish to the live shop (as of 18 Nov 2026). Run `ADMIN_PASSWORD=… npm run live:publish -- data/pending-publish.json`. It skips anything already published or rejected, so it's safe to re-run |
| `candidates.json` | (Created by `npm run live:export`.) Supplier data for NEW candidates, used to write copy. It's raw supplier text, so **don't publish it as is** |

Every description here is original copy written for Brightpan. Supplier descriptions are
used only as reference and are never copied.

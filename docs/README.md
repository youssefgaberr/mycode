# Brightpan: project handbook

Everything you need to run and grow the store, and to pick up work in a new session.

**Start here tomorrow → [STATUS.md](STATUS.md)**. It covers what's live, what's half-done
and the next steps, in order.

| Document | What's in it |
|---|---|
| [STATUS.md](STATUS.md) | Current state, open tasks, what to do next |
| [business-model.md](business-model.md) | How the store makes money: markets, pricing, unit economics, costs, growth plan |
| [operations.md](operations.md) | Daily, weekly and monthly runbook, and how to handle every kind of order problem |
| [automation.md](automation.md) | What updates on its own, the CJ points budget, and how to let Claude operate the store on a schedule |
| [product-sourcing.md](product-sourcing.md) | Finding trending products, what we never sell, writing copy, bulk publishing |
| [content-and-video.md](content-and-video.md) | Social content and ads, and where videos can legally come from |
| [compliance.md](compliance.md) | UK / US / EU legal checklist |
| [architecture.md](architecture.md) | Technical map: stack, data model, every file, deploys, migrations, tests |
| [../README.md](../README.md) | Setup, environment variables, payments, deploy, going live |
| [../data/README.md](../data/README.md) | The JSON data files (our product copy, publish queue) |

## Links

- Shop: https://brightpan.vercel.app
- Admin: https://brightpan.vercel.app/admin. The password is the `ADMIN_PASSWORD` env var in Vercel.
- Vercel project: **brightpan**. The database is Neon Postgres (London), connected through the Vercel integration.
- GitHub: `youssefgaberr/mycode`. Work branch: `claude/brightpan-dropshipping-store-qhdne8`; PRs go to `main`.
- Supplier: CJdropshipping, using the official API only.

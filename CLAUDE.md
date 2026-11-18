@AGENTS.md

# Brightpan (dropshipping store)

UK + US online shop for trending gadgets, using Next.js 16, Prisma, Stripe and the CJdropshipping API.
Live at https://brightpan.vercel.app.

**Start every session by reading `docs/STATUS.md`** for current state and next steps. The
full handbook is in `docs/` (business model, operations, automation, sourcing, content,
compliance, architecture).

## Ground rules from the owner

- Ask before anything that spends money or places a real order: going live, paid plans, ads, buying samples, auto-paying CJ.
- Keep Stripe in test mode and CJ in sandbox (`STORE_MODE=test`) until the owner says "go live".
- Use the official CJ API only; no scraping. Never reuse other people's videos or images (see `docs/content-and-video.md`).
- Product copy is always original UK English, with no health or safety claims; follow `docs/product-sourcing.md` and its exclusion list.
- Never commit secrets. The admin password comes from the `ADMIN_PASSWORD` env var.

## Working on the code

- Business settings live in `src/config/store.ts`. Edit `prisma/schema.prisma`, then run `npm run db:postgres` and add a Postgres migration (see `docs/architecture.md`).
- Before deploying, run `npm run typecheck && npm run lint && npm test && npm run build`.
- Live admin tools: `npm run live:count | live:collect | live:export | live:publish | live:log` (Playwright, `ADMIN_PASSWORD` env var).
- CJ has a daily API points allowance (resets at 00:00 UTC). Keep collect runs to a few per day (`docs/automation.md`).

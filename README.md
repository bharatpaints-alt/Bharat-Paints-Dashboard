# Bharat Paints Employee Stock App

Mobile-first employee application for live stock search, items requiring order, and product picture management.

## Local setup

1. Copy `.env.example` to `.env.local` and fill the server-only values.
2. Run `npm install`.
3. Run `npm run dev` for the Vite UI or `vercel dev` to include `/api/inventory`.
4. Run `npm run check` and `npm run build` before deployment.

The browser calls only `/api/inventory`. Google Sheet and Apps Script identifiers and the shared write token remain server-side.

## Environment

- `STOCK_CSV_URL`: private server-side Google Sheets CSV export URL for the existing Input sheet.
- `GAS_API_URL`: deployed Apps Script JSON API URL.
- `GAS_API_TOKEN`: shared internal token matching Apps Script property `BHARAT_PAINTS_API_TOKEN`.

Never prefix these values with `VITE_` and never commit `.env.local`.

## Production safety

Deploy and validate a Vercel preview before promoting. The previous production deployment remains the rollback target documented in `RECOVERY_REPORT.md`.

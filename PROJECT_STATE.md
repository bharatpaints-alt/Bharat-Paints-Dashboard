# Bharat Paints Employee Stock App — Project State

## Current objective

Deliver a small mobile-first employee application for live stock search, existing order requirements, and three-slot product picture management. The existing Google Sheet workflow and calculations remain unchanged.

## Safety baseline

- Static-dashboard rollback tag: `baseline-static-dashboard-2026-08-04`
- Previous Vercel production deployment remains untouched and is documented in `RECOVERY_REPORT.md`.
- Apps Script production version 12 remains the Apps Script rollback target.

## Implemented

- React + Vite + TypeScript application shell
- Home, Search, Order, Pictures, and More screens
- Server-side stock CSV proxy; Sheet URL does not enter browser source
- Local fast search after one stock load
- Existing `Required Quantity > 0` order rule
- Three product picture slots with camera/gallery, compression, replace, delete and viewer
- Serverless Apps Script proxy with private server-side URL/token
- Responsive bottom navigation and phone-safe styling

## Pending operational validation

- Apps Script JSON API wrapper must be pushed and deployed as a new deployment.
- Apps Script property `BHARAT_PAINTS_API_TOKEN` and matching Vercel variables must be configured.
- A designated product must be used to test upload, replace, and delete with cleanup.
- Preview must be visually checked on a real iPhone/Android before production promotion.

## Explicitly out of scope

Stock inward/outward/transfer, sales/purchase entry, barcode scanning, reports, employee management, and AI are Coming Soon only.

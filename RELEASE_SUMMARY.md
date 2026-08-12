# PRESCOT MOBILES ERP — System Upgrade & Release Documentation

**Date**: 9th August 2026  
**System Version**: 2.4.0 (Store Operations ERP)  
**Status**: Production Ready — Passed Pre-Push Quality Gate

---

## 📋 Executive Overview

This release delivers major performance optimizations, global user experience humanization, structured page-level training popovers, complete single-page A4 invoice/receipt refactorings for both Repairs and POS Sales, Google Review QR code integration, and a comprehensive pre-push repository cleanup.

All backend RPC database functions, accounting formulas, warranty snapshot architectures, stock calculations, and Supabase RLS security policies remain **100% preserved and intact**.

---

## 🚀 Key Improvements & Modules Delivered

### 1. System Speed & Query Performance Optimization

- **React Query Default Stale Time**: Configured `staleTime: 2m` default cache in `src/router.tsx` with route-tailored caching across all 12 main dashboard pages.
- **Debounced Text Inputs**: Built custom `useDebounce` hook (~250ms) for search inputs across Repairs, Inventory, Customers, Suppliers, and Sales Log to eliminate input lag.
- **Immediate Barcode Scanning**: POS barcode scanner input maintained at **100% immediate execution** (0ms debounce delay).
- **Skeleton & Empty States**: Created `TableSkeleton.tsx` for smooth loading feedback and `EmptyState.tsx` for actionable empty table placeholders.
- **Modal Lazy Loading**: Heavy workspace modals lazily loaded to keep initial route bundle sizes minimal.

### 2. Global Error Humanizer & Toast System

- **Global Toaster**: Mounted global `<Toaster />` in `src/routes/__root.tsx`.
- **Humanized Errors**: Created `humanizeError()` utility (`src/lib/humanize-error.ts`) translating Postgres/Supabase RPC codes, network drops, and stock validation errors into friendly human text.
- **Standardized Toast Helper**: Built `src/lib/toast.ts` with `toastSuccess`, `toastError`, `toastWarning`, and `toastInfo`.
- **Alert Popup Replacement**: Replaced raw browser `alert()` popups across workspace modals with clean human error toasts.

### 3. Page Training & Help System

- **Contextual Help Popovers**: Built `PageHelpButton.tsx` rendering subtle `[? Help]` popovers near titles on all 12 dashboard pages.
- **Context Tips**: Added inline `<ContextTip />` popups for complex ERP terms (_Warranty Days_, _Deposit_, _Opening Cash_, _Opening Stock_).
- **First-Time Page Visit Tips**: Auto-displays a friendly tip toast on first page visits with `localStorage` memory.
- **Training Mode Toggle**: Added master Training Mode toggle switch in `dashboard.settings.tsx`.

### 4. Traditional Single-Page A4 Repair Invoice & Receipt

- **UK Repair Shop Design**: Refactored `RepairA4InvoiceModal.tsx` to match traditional UK phone repair shop pad design (Boxed Customer Details, Boxed Device Details, Repair Items Table, Subtotal, Deposit Paid, Total Paid, Balance Due, Customer Signature Line, and 7-Point Short Terms & Conditions).
- **Official Transparent Logo**: Integrated transparent logo (`/site-assets/prescot-logo.png`) header rendering.
- **Google Review QR Code**: Integrated static scannable QR code (`/site-assets/google-review-qr.png`) with white quiet zone padding and two-column footer (`SHARE YOUR EXPERIENCE`).
- **Strict 1-Page A4 Engine**: Single-page A4 print engine with 0 second page, 0 blank page, and fail-safe print visibility CSS (`@page { size: A4 portrait; margin: 6mm 8mm; }`).

### 5. Professional A4 Sales Invoice & Dual Format Upgrade

- **Dual Format Switcher**: Upgraded `Invoice.tsx` with a format toggle: **`[ 📄 A4 Sales Invoice ]`** (default) vs **`[ 🧾 Thermal Receipt ]`** (80mm).
- **A4 Sales Invoice Layout**: Created single-page A4 Sales Invoice with store header, line items summary table, financial totals breakdown, item-specific warranty coverage notes, customer proof of purchase disclaimer, and Google Review QR code.
- **Thermal Receipt Preservation**: Retained 100% of existing 80mm thermal receipt printing for POS, PDF downloading, and WhatsApp sharing.

### 6. Payment Accounting Reconciliation

- Reconciled payment breakdown calculations across Repair and Sales A4 Invoices:
  - **TOTAL COST**: Authoritative total quote amount (`total_price_pence`)
  - **DEPOSIT PAID**: Deposit recorded at intake (`deposit_pence`)
  - **PAID**: Cumulative total paid (`amount_paid_pence`)
  - **BALANCE DUE**: Outstanding balance (`due_pence`)
  - **PAID IN FULL**: Prominent green badge when balance = 0.

### 7. Final Pre-Push Codebase Audit & Cleanup

- Safely purged temporary developer scratch scripts (`scratch/`) and temporary root test screenshots.
- Verified 100% of Supabase database migrations (`supabase/migrations/*`) remain intact and untouched.
- Verified `npx tsc --noEmit` (**0 errors**).
- Verified `npm run build` (**Build Successful**).

---

## 🛠️ Modified & Created Files Summary

### Key New Components & Utilities

- `src/lib/humanize-error.ts` — Database & RPC error translator
- `src/lib/toast.ts` — Standardized toast notification wrappers
- `src/hooks/use-debounce.ts` — 250ms input debouncer
- `src/components/dashboard/PageHelpButton.tsx` — Help popover & context tip helpers
- `src/components/dashboard/TableSkeleton.tsx` — Skeleton loaders
- `src/components/dashboard/EmptyState.tsx` — Actionable empty state placeholders
- `src/components/dashboard/RepairA4InvoiceModal.tsx` — Single-page A4 Repair Invoice & Receipt
- `public/site-assets/prescot-logo.png` — Official shop logo
- `public/site-assets/google-review-qr.png` — Official Google Review QR code

### Updated Core Files

- `src/router.tsx` — Query Client cache defaults (`staleTime: 2m`)
- `src/routes/__root.tsx` — Global `<Toaster />` mounting
- `src/components/dashboard/Invoice.tsx` — Dual format A4 Sales Invoice & Thermal Receipt
- `src/components/dashboard/RepairWorkspaceModal.tsx` — Direct modal imports & humanized error toasts
- `src/routes/_authenticated/*.tsx` — Enhanced all 12 dashboard route pages

---

## 🧪 Verification & Release Quality Gate

| Audit Check                      | Status | Result                                                     |
| :------------------------------- | :----- | :--------------------------------------------------------- |
| **TypeScript Type Checking**     | PASSED | `npx tsc --noEmit` completed with **0 errors**.            |
| **Production Build**             | PASSED | `npm run build` completed in **4.05s**.                    |
| **Database Migration Integrity** | PASSED | All 11 Supabase migrations preserved intact.               |
| **Print System Parity**          | PASSED | Screen preview & Print preview match 1:1 (Single A4 Page). |
| **Secrets & Security Audit**     | PASSED | `.env` protected; zero credentials exposed to console.     |
| **Git Safety Gate**              | PASSED | No untracked commits or pushes executed.                   |

---

**Release Status**: **PRE-PUSH CLEANUP PASSED — READY TO PUSH TO REPOSITORY**

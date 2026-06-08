---
name: TypeScript debt & masked runtime bugs
description: Why this repo had ~858 tsc errors with a working app, and which real bugs are hidden behind `as any` casts after the type-only cleanup.
---

# TypeScript type-safety debt in PromptAtrium

The dev/runtime path uses `tsx`/esbuild (transpile-only) + Vite, with NO type-check
gate. So `tsc --noEmit` errors are type-safety debt, not runtime breakage — the app
runs fine despite them. A clean `tsc` is therefore not proof the runtime is correct.

## Real pre-existing bugs MASKED by `as any` during the type-error cleanup
These were genuine bugs that the type errors were correctly flagging. The cleanup was
constrained to type-only changes (no runtime edits), so they were cast away, not fixed.
They live in **marketplace/admin features that are currently gated behind
`MARKETPLACE_ENABLED`** (see `client/src/config/features.ts` + redirects in `App.tsx`),
so they are not user-facing right now.

- **`apiRequest` called with wrong argument order.** Signature is
  `apiRequest(method, url, data?)` (`client/src/lib/queryClient.ts`), but many
  admin/marketplace components call it as `apiRequest(url, { method })`. This sends a
  malformed request at runtime. Affected: admin `CommissionSettings`,
  `PayPalConfiguration`, `TransactionDashboard`, seller `SellerTransactionDashboard`,
  quickprompt `PromptRefinementChat`.
- **Storage methods called but never defined** on `DatabaseStorage`/`IStorage`, invoked
  via `(storage as any).X(...)` in `server/routes.ts`: `getUserTransactions`,
  `getSellerStats`, `getPendingPayouts`, `getSellerProfiles`, `getUsers`, `getOrder`,
  `getMarketplaceListing`. These throw `TypeError` if the route is reached.
- **`transactionLedger` / `payoutBatches` column-name mismatches.** Code references
  `transactionLedger.userId/.amount/.payoutBatchId` and `payoutBatches.totalAmount/
  .payoutCount`, but the schema defines `fromUserId/toUserId`, `amountCents`, no
  `payoutBatchId`, and `totalAmountCents/totalPayouts`. Cast with `(table as any)`.
- Minor: `users.lastActive` vs `lastActiveAt`, `prompts.is_featured` vs `isFeatured`,
  `PaymentService.createStripeTransfer` is called but not defined.

**Why:** the cleanup's hard constraint was type-only / never alter runtime.
**How to apply:** before re-enabling the marketplace, fix these for real — do not trust
the green `tsc` for these code paths.

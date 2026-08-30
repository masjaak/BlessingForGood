# Customer Mobile UX V3.1 Decision Record

Date: 2026-08-12

## Decision

Keep the current Phase 01–06.4 customer shell and correct the mobile entry
states in place:

- the header uses a smaller visible official logo;
- top-right `Masuk` navigates to the dedicated `/sign-in` BFG page;
- bottom navigation never auto-redirects signed-out users to Clerk;
- `Buku Saya` and `Tagihan` render branded locked states;
- `Akun` renders the account gate and starts auth only from its `Masuk` CTA;
- `Katalog` is a public Secret Catalog gateway redeemed by an
  admin-generated code, without Clerk login;
- successful redemption creates a scoped opaque catalog session, while
  Convex validates that session on every private catalog query;
- the story logo card gives the official logo a readable focal size and the
  Blessy card uses left text, a top-right mascot, and description below;
- detail and redirected screens retain a 44px BFG Back control.

## Superseded decision

The previous V3 presentation required:

```text
authenticated invited member + catalog code
```

That is superseded for the customer Secret Catalog entry flow. Existing
member-bound `catalogAccessGrants` remain for backward compatibility and for
owned preorder authorization, but they are not required to redeem a valid
catalog code or read the authorized catalog projection.

## Security boundary

Current Catalog codes remain server-generated, global across eligible
open/unexpired Catalogs, pepper-hashed, and revocable/expiring. The plaintext
code is returned only from the immediate admin generation mutation. Redemption
returns one opaque session credential;
the original code is not retained as browser authorization state. The
catalog query returns no private products until the server validates that
session or an existing member grant.

Token-only catalog browsing does not create a customer identity or an owned
order. `orders.submit` continues to require the existing active customer and
ownership rules.

## Scope boundary

Admin visual redesign, financial rules, Join persistence, and Phase 01–06.4
business domains are unchanged. Join continues to write the canonical
`joinRequests` record and may return the configured WhatsApp continuation only
after persistence succeeds.

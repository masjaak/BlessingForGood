# Known Limitations

- The canonical GitHub repository does not contain the product context files listed in its own manifest.
- Official logo, mascot, and mockup assets are committed and mapped; book-cover source assets are still not approved.
- The local adapter is intentionally browser-local, starts empty, and remains an explicit local-development fallback;
  Vercel Preview uses Convex when its injected URL is valid and otherwise fails closed.
- Convex Preview sessions are anonymous, expiring prototype sessions, not Clerk identity or Production authorization.
- Catalog access-code attempts have safe keyed verification and bounded admin-code attempts; distributed catalog
  rate limiting remains a later security phase.
- Existing browser-local records are not migrated into Convex automatically.
- Preview Demo Mode is QA-only, is not authentication, and must remain absent/disabled in Production.
- Admin and customer identity are not production authentication.
- Invoice/deposit behavior is a foundation and does not process money.
- WhatsApp is represented by a generated handoff link only.
- `BookCover` uses a neutral typographic fallback until approved cover image persistence is designed.
- Catalog creation is intentionally one-title-per-form; richer publisher/book management is deferred.
- Tracking/cargo, invoice, deposit, payment, upload, email, and WhatsApp API persistence remain deferred to later phases.
- Books, Customers, Tracking, Content, and Settings remain clearly marked unavailable in the admin navigation.
- Full manual keyboard and contrast review remains a follow-up; automated accessible-name, heading, form, focus,
  and browser-error checks pass.
- Next.js reports the unrelated `/Users/masjak/package-lock.json` as an ignored parent lockfile; the repository build still succeeds with the canonical local lockfile, so the parent file remains untouched.

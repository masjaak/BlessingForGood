# Known Limitations

- The canonical GitHub repository does not contain the product context files listed in its own manifest.
- No physical logo, mascot, or mockup assets are available in the canonical clone. The UI uses text and neutral CSS primitives; no replacement art is generated.
- The local adapter is intentionally development-only and starts empty.
- Admin and customer identity are not production authentication.
- Invoice/deposit behavior is a foundation and does not process money.
- WhatsApp is represented by a generated handoff link only.
- The visible wordmark is text-only because no official logo asset is present; it is not an asset replacement.
- Catalog creation is intentionally one-title-per-form; richer publisher/book management is deferred.
- Next.js reports the unrelated `/Users/masjak/package-lock.json` as an ignored parent lockfile; the repository build still succeeds with the canonical local lockfile, so the parent file remains untouched.

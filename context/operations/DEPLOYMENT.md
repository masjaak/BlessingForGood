# BFG Production Deployment

## Release path

```text
feature implementation
→ deterministic local QA
→ authenticated Production-environment QA
→ rendered/mockup acceptance
→ functional release gates
→ merge to main
→ push main
→ Vercel Production
```

Preview and staging are not V1 release gates. Never promote an old Preview or
deploy a feature branch as Production.

## Canonical targets

```text
Git Production branch: main
Convex team/project: palevvi/blessingforgood
Convex Development: content-snake-214
Convex Production: clean-eel-522
```

`vercel.json` runs the Convex deploy command followed by the Next.js build. A
Production release therefore requires a Production-specific
`CONVEX_DEPLOY_KEY`, Production Clerk keys, a valid Clerk JWT issuer in Convex,
and all required server-only names. Never reveal values.

## Release gate

- `npm run check`
- `npm run convex:test`
- `git diff --check`
- customer routes inspected at 375/390/430/768 widths
- admin routes inspected at 1024/1280/1440+ widths
- no prohibited prototype presentation or browser-local product storage
- official logo and intentional mascot states present
- Phase 01–06.4 authorization, ownership, and financial invariants preserved
- Production Clerk instance/domain/key names verified
- canonical Convex Production target and required names verified
- prior main SHA and prior Vercel Production deployment recorded

Only after every release gate is green may the approved candidate be merged
into and pushed from `main`. A Preview or staging result is not completion.

## Rollback

If a critical Production regression appears, revert the release through Git to
the recorded previous main SHA and allow Vercel to deploy that source. Do not
hotfix Production outside Git.

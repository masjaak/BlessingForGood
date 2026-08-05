# Deployment

## Current deployment boundary

- Repository: `https://github.com/masjaak/BlessingForGood.git`
- Implementation branch: `feat/convex-core-persistence-v0.1` (branched from `qa/ux-refinement-v0.1`)
- Vercel project: `blessing-for-good`
- This repair is Preview-only. Do not merge to `main`, use `--prod`, promote a deployment, or change the production domain.

## Vercel settings

- Framework preset: `Next.js`
- Root directory: repository root (`.`)
- Install command: automatic npm detection using `package-lock.json`
- Build command: `npm run build`
- Output directory: Next.js default / automatic detection
- Node.js: `24.x`, satisfying the package engine requirement `>=20.9.0`

## Diagnosis and repair

The failed deployment at commit `cf1c5b7` on `prototype/v0.1` successfully compiled and prerendered all routes. It failed afterward because the project setting requested `dist`, which the Next.js build does not create. The project preset and output-directory setting were corrected in Vercel; no source `vercel.json` override was added.

The current prototype build does not require Clerk or Convex environment variables. Vercel environment-variable
names were audited without reading values. `NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE` is configured for Preview only;
Production must not contain an enabled value for that flag.

## Preview Demo Mode

- `NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE` is the dedicated Preview-only flag for browser QA; its value is never
  committed or printed in operational reports.
- The application also requires the server-side Vercel Preview boundary. Production rejects the flag.
- The UI visibly labels the workspace `Prototype Preview` and states that data is stored only in that browser.
- Do not configure this flag as `true` for Production. Do not use it as authentication or as a production admin
  bypass.

## Validation

Run from the repository root on the visual branch:

```bash
npm ci
npm run check
npx vercel@latest pull --yes --environment=preview --git-branch=qa/ux-refinement-v0.1
npx vercel@latest build
npx vercel@latest deploy --target preview --logs
```

Keep `.env*` and `.vercel/` local and ignored. Never commit environment values, Vercel tokens, Clerk secrets, or Convex secrets.

## Final Phase 02.2 Preview verification

- Deployment: `dpl_GrBVzaVHbcFLuKpxCCzWscutaDz2`
- URL: `https://blessing-for-good-6h90y7tgw-masjaaks-projects.vercel.app`
- Target: Preview; status: Ready; build region: `iad1`
- Remote build: Next.js 16.3.0, Node.js 24.x, all 14 App Router routes generated.
- Browser QA: `56/56` Playwright tests passed across 375×812, 768×1024, 1024×768, and 1440×900.
- Runtime error logs: no entries returned for the final 30-minute query.
- Production and `main`: unchanged.

## Phase 03.1 Convex Preview boundary

- Convex project: `blessing-for-good` in the authenticated personal team.
- Local development uses a personal cloud dev deployment selected through `.env.local` (ignored).
- Vercel Preview uses a Preview-only `CONVEX_DEPLOY_KEY`; its value is sensitive and is not stored in Git or
  included in reports.
- Preview build command: `npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "npm run build"`.
- No `--preview-run` function is configured, so Convex Preview starts with zero business records.
- Production remains intentionally blocked: no Production Convex deployment key, no Clerk identity, and no
  Production Vercel deployment.

## Historical Preview verification

- Deployment: `dpl_HwuopThbRTvjF2YrNZs3K8i3mRGr`
- URL: `https://blessing-for-good-bxlsx6rog-masjaaks-projects.vercel.app`
- Target: Preview
- Status: Ready
- Route smoke check: all 12 implemented App Router routes returned HTTP 200 through authenticated Vercel CLI requests.
- Runtime error logs: no logs returned for the 30-minute query.
- Browser viewport/console check: superseded by the final Phase 02.2 matrix above.
- Production and `main`: unchanged.

## Phase 02.1 Preview verification

- Deployment: `dpl_F1aiDK2SSsFL4NNV931uQqaXHmCj`
- URL: `https://blessing-for-good-akpj94htk-masjaaks-projects.vercel.app`
- Status: Ready
- Target: Preview only; no `--prod` or promotion was used.
- Build: remote Vercel build passed on Node 24.x with Next.js 16.3.0 and generated all 14 static App Router routes.
- Route smoke check: all 12 implemented routes returned HTTP 200 through authenticated Vercel CLI HEAD requests.
- Asset smoke check: runtime primary/symbol logos and Mascott-1/3/4 returned HTTP 200 with `image/png`.
- Runtime logs: no error logs returned for the 30-minute Preview query.
- Browser viewport/console check: Phase 02.2 uses Playwright with the Vercel automation bypass in memory; no
  Deployment Protection setting was disabled.
- Production and `main`: must remain unchanged.

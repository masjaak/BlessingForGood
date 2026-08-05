# Deployment

## Current deployment boundary

- Repository: `https://github.com/masjaak/BlessingForGood.git`
- Implementation branch: `prototype/v0.1`
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

The current prototype build does not require Clerk or Convex environment variables. Vercel environment-variable names were audited without reading values; no project environment variables are configured.

## Validation

Run from the repository root:

```bash
npm ci
npm run check
npx vercel@latest pull --yes --environment=preview --git-branch=prototype/v0.1
npx vercel@latest build
npx vercel@latest deploy --logs
```

Keep `.env*` and `.vercel/` local and ignored. Never commit environment values, Vercel tokens, Clerk secrets, or Convex secrets.

## Latest Preview verification

- Deployment: `dpl_HwuopThbRTvjF2YrNZs3K8i3mRGr`
- URL: `https://blessing-for-good-bxlsx6rog-masjaaks-projects.vercel.app`
- Target: Preview
- Status: Ready
- Route smoke check: all 12 implemented App Router routes returned HTTP 200 through authenticated Vercel CLI requests.
- Runtime error logs: no logs returned for the 30-minute query.
- Browser viewport/console check: unavailable because `agent-browser` was not installed in the session.
- Production and `main`: unchanged.

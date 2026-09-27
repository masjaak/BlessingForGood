# Security Audit

## Audit Target

- Project:
- Commit SHA:
- Approved host:
- Audit owner/date:

## Environment

- Environment label:
- Vercel:
- Preview variable metadata scope verified (name/ID/target/gitBranch/type only):
- Preview Development variables apply without branch scope:
- Authentication provider/environment:
- Backend/environment:
- Storage:
- Test identities:
- External side effects:

## Scope

- Included routes, APIs, roles, and data:

## Exclusions

- Production active scans/mutations:
- Other exclusions and reason:

## Architecture

- Production path:
- Test path:
- Environment isolation evidence:
- Preview credential gate and Convex deploy-command classification:
- Production side-effect credentials excluded from Preview:

## Tools

| Tool | Version | Ready/result |
|---|---|---|
| Playwright | | |
| Nuclei | | |
| OWASP ZAP | | |
| npm audit | | |
| Vercel CLI | | |
| Convex CLI | | |

## Public Coverage

- Routes/assets:
- HTTP/TLS/headers:
- Browser console/network:
- Nuclei:
- ZAP Baseline:

## Authenticated Coverage

| Identity/role | Routes and actions | Result | Evidence |
|---|---|---|---|
| Anonymous | | | |
| Customer A | | | |
| Customer B | | | |
| Admin | | | |
| Owner | | | |

## Authorization Matrix

| Action/resource | Anonymous | Customer | Admin | Owner | Evidence |
|---|---|---|---|---|---|
| Own private data | | | | | |
| Another user's private data | | | | | |
| Admin operation | | | | | |
| Owner-only operation | | | | | |
| Role change | | | | | |

## Scanner Results

- Critical:
- High:
- Medium:
- Low:
- Informational/noise dispositions:

## Findings

| ID | Severity | Root cause | State | Evidence |
|---|---|---|---|---|

## Remediation

- Fix and regression:
- Preview redeploy/retest:

## Regression

- Format:
- Lint:
- Typecheck:
- Tests:
- Build:
- npm audit:
- Security regression:
- Secret sweep:
- Release diff:

## Accepted Risks

- Finding, rationale, owner, review trigger:

## Release Gate

- Result:
- Reviewed branch/base:
- PR:
- Merge SHA:
- Vercel Preview build and responsive smoke:

## Production Smoke

- Deployment ID/time/URL:
- Public routes/assets:
- Auth boundary:
- Responsive widths:
- Console/network/5xx:
- TLS/headers/CSP:
- Result:

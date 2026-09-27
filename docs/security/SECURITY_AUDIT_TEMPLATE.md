# Security Audit

## Audit Target

- Project:
- Commit SHA:
- Approved host:
- Audit owner/date:

## Environment

- Environment label:
- Vercel:
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

## Production Smoke

- Deployment ID/time/URL:
- Public routes/assets:
- Auth boundary:
- Responsive widths:
- Console/network/5xx:
- TLS/headers/CSP:
- Result:

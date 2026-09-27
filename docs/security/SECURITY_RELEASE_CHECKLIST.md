# Security Release Checklist

## Before Audit

- [ ] Required Preview Development variables apply to Preview without branch scope
- [ ] Preview metadata checked without reading or recording variable values
- [ ] Preview Clerk and Convex build target classify as Development
- [ ] Preview exists
- [ ] Preview protection automation access ready
- [ ] Clerk Development ready
- [ ] Convex Development ready
- [ ] Nuclei installed
- [ ] ZAP installed or Docker ready
- [ ] Playwright installed
- [ ] Test identity strategy ready
- [ ] `scripts/security/preflight.sh` passes
- [ ] Architecture/environment map recorded

## Before Active Testing

- [ ] Target confirmed non-Production and approved by `target-guard.sh`
- [ ] Preview Clerk and Convex environments verified as Development
- [ ] No real payment side effects
- [ ] No real email side effects
- [ ] No real webhook side effects
- [ ] Test data isolated
- [ ] Credentials supplied through protected environment only

## Before Release

- [ ] Clean release branch can receive the branch-independent Preview configuration
- [ ] Preview credential gate PASS; Convex deploy command disabled
- [ ] Critical = 0
- [ ] Unacceptable High = 0
- [ ] Release-blocking Medium = 0
- [ ] Auth PASS
- [ ] Authorization PASS
- [ ] Admin PASS
- [ ] API PASS
- [ ] Forms/uploads PASS
- [ ] Dependency audit PASS
- [ ] Build PASS
- [ ] Full tests PASS
- [ ] Security regression PASS
- [ ] Secret scan PASS
- [ ] Release diff review PASS
- [ ] Preview routes, auth boundary, and four viewport widths PASS
- [ ] Blessy does not overlap homepage CTA or important copy
- [ ] Preview console, first-party network, and 5xx checks PASS

## After Production Deploy

- [ ] Homepage PASS
- [ ] Ready Stock PASS
- [ ] Primary navigation PASS
- [ ] Main CTA PASS
- [ ] Images/assets PASS
- [ ] Anonymous protected-route denial PASS
- [ ] Login entry PASS
- [ ] Admin protection PASS
- [ ] Mobile widths 1440, 768, 390, and 320 PASS
- [ ] Blessy does not obstruct CTA
- [ ] Console PASS
- [ ] Critical first-party network PASS
- [ ] No unexpected 5xx
- [ ] TLS and security headers PASS
- [ ] CSP loads without application violations

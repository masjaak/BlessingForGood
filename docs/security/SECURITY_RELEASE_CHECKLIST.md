# Security Release Checklist

## Before Audit

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

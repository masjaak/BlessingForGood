# BFG Admin Step-Up Security Backlog

Status: `RECOMMENDED`

Classification: `NOT_REQUIRED_FOR_PHASE_07_1_CLOSURE`

This is a future staff-security backlog. It does not change current Clerk
authentication, BFG `appUsers` authorization, customer onboarding, or Phase
07.1 acceptance.

## Policy boundary

- Keep Clerk as the single identity provider.
- Do not require MFA globally for customer/Blessfriend accounts.
- Do not use Clerk Organizations as an Admin authorization source.
- Continue to authorize every operation with active `appUsers` role and
  server-side Convex permission before any future step-up check.
- Reverification is an additional freshness check, never a replacement for
  RBAC, ownership, state-machine, validation, or audit guards.

## Recommended future step-up operations

| Operation | Current authority | Future step-up | Reason |
| --- | --- | --- | --- |
| Payment approval or reversal where supported | Admin/Owner + invoice permission | Reverification | Direct financial consequence |
| Refund payout create/start/record | Admin/Owner + refund permission | Reverification; staff MFA policy candidate | External money movement |
| Deposit refund or financial adjustment | Admin/Owner + deposit permission | Reverification | Customer balance consequence |
| Grant or remove Admin | Owner only | Reverification + staff MFA policy | Privilege escalation/reduction |
| Suspend or reactivate user | Admin/Owner for eligible non-owner targets | Reverification; staff MFA policy candidate | Account availability change |
| Other high-risk access/configuration changes if added later | Owner policy to be defined | Reverification + staff MFA | Security control change |

## Deferred design questions

1. Which Clerk-supported reverification primitive is available in the owning
   Production application?
2. What authentication age is acceptable per operation?
3. Should staff MFA be enforced through an operational policy limited to
   Admin/Owner accounts?
4. What recovery process applies when a staff member loses the second factor?
5. Which audit fields record step-up success without recording credentials,
   OTPs, session tokens, or JWTs?

Do not implement this backlog until the Production Clerk owner confirms the
available feature/configuration and a staff-specific policy is approved.

## Admin sign-in presentation

`/admin/sign-in` may be considered later for clearer staff UX. Its security
benefit is low when RBAC is correct. If added, it must use the same Clerk
Production instance and the same active `appUsers` Admin/Owner authorization.

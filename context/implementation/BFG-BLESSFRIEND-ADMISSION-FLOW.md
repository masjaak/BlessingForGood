# BFG Blessfriend Admission Flow

Status: `BFG_PHASE_07_1_FINAL_CLOSURE_LOCAL_PRODUCTION_ACCEPTANCE_PENDING`

This is the Phase 07.1 admission contract. Clerk authenticates an identity;
Convex `appUsers` admission and status authorize BFG customer access. A Clerk
login alone never creates membership or unlocks private customer routes.

## State machine

The UI exposes these semantic states while the persisted request reuses the
existing join status vocabulary:

| Semantic state | Persisted representation | Meaning |
| --- | --- | --- |
| `NOT_REQUESTED` | no unresolved request | Applicant may submit the Join form |
| `SUBMITTING` | mutation in flight | Form is validating/creating one request |
| `PENDING_REVIEW` | `submitted` or `under_review` | Admin review is required |
| `APPROVED_PENDING_ADMISSION` | `approved` plus `invitation_pending` or retryable error | Approval is recorded; identity handoff is not active yet |
| `ADMITTED` | `approved` plus active `appUser` | Private customer workspace may unlock |
| `REJECTED` | `rejected` | Request history is retained and visibly resolved |
| `ERROR` | submit/admission error | Recoverable error; no silent state advance |

### Transitions

```text
NOT_REQUESTED
  --SUBMIT_REQUEST / REQUEST_CREATED--> PENDING_REVIEW
  --SUBMIT_REQUEST / REQUEST_FAILED--> ERROR

PENDING_REVIEW
  --ADMIN_OPEN_REVIEW--> PENDING_REVIEW
  --ADMIN_APPROVE / ADMISSION_STARTED--> APPROVED_PENDING_ADMISSION
  --ADMIN_REJECT--> REJECTED

APPROVED_PENDING_ADMISSION
  --ADMISSION_SUCCEEDED--> ADMITTED
  --ADMISSION_FAILED--> APPROVED_PENDING_ADMISSION + retryable error
```

Invalid transitions include admitting without Admin approval, approving or
rejecting a resolved request, creating a second unresolved request for the
same applicant, and treating Clerk authentication as admission.

## Events and guards

| Event | Required guard |
| --- | --- |
| `SUBMIT_REQUEST` | Valid name, WhatsApp phone, area, and one exact interest: `Children Books`, `Collector Books`, or `Novel`; no unresolved duplicate |
| `REQUEST_CREATED` | Server persists the request and, for a signed-in identity, the verified Clerk subject/email snapshot—not client-supplied identity |
| `REQUEST_FAILED` | No partial success is presented as membership |
| `ADMIN_OPEN_REVIEW` | Active Admin or Owner with `customers.read` |
| `ADMIN_APPROVE` | Active Admin or Owner with `customers.manage`; request is still `submitted` or `under_review` |
| `ADMIN_REJECT` | Active Admin or Owner with `customers.manage`; request is still reviewable |
| `ADMISSION_STARTED` | Request is already `approved` |
| `ADMISSION_SUCCEEDED` | Exact captured Clerk subject maps to one existing/new active `appUser` |
| `ADMISSION_FAILED` | Approval remains recorded with a recoverable `admissionError`; retry does not erase history |

Admin review and admission mutations remain server-authorized and audited by
the existing BFG audit path. Repeated approval is an explicit invalid
transition; retry is a separate approved-only operation.

## Existing Clerk identity

For a signed-in non-member, submission records the exact authenticated Clerk
subject server-side. Admin approval then reuses an existing `appUser` for that
subject or inserts one active customer row if none exists. The exact-subject
lookup is the duplicate-prevention boundary. `ensureCurrentUser` is
idempotent and records the admitted request; it does not admit an unapproved
login.

## New Clerk identity

A signed-out applicant can submit a durable request. Approval records BFG
approval and leaves the request in `invitation_pending` until the existing
manual Clerk invitation/provisioning process is completed. No Clerk user is
created by the Join mutation, and no second identity system is introduced.
When the invited user later signs in, the existing supported email-based
invitation path provisions the one active `appUser` and links the request.

## Customer states

- No request: real Join form and `Gabung Blessfriends` CTA.
- Pending: `Permintaanmu sedang ditinjau.` with no second primary submit CTA.
- Approved pending admission: explicit invitation/activation or retry state.
- Rejected: clear rejected result; no resubmission policy is invented.
- Active: customer links and private `Buku Saya`, `Tagihan`, `Akun`, Profile,
  and Addresses are available.

## Admin operations

`pendingCount` counts only `submitted` and `under_review` requests. The
sidebar hides the badge at zero and shows the live count otherwise. The
dashboard reuses the same queue as a Join Requests attention item. The queue
shows applicant, WhatsApp, area, interest, requested time, status, and a
Review action. Review exposes context plus Approve/Reject; only Admin/Owner
may perform those actions.

## Failure recovery and schema scope

If approval succeeds but an existing-identity admission handoff fails, the
request remains `approved`, stores a concise `admissionError`, and exposes
`retryAdmission`. There is no global retry service.

The schema change is additive and Join-only: optional captured subject/email,
admission error, admitted appUser reference, and an applicant-subject index.
Join history is retained. Ready Stock, Orders, Batch PO, Invoices, Payments,
Deposits, Refunds, Exceptions, Secret Catalog, and all financial transitions
are unchanged.

## Verification

Deterministic Convex coverage proves public/signed-in Join access, persistence,
duplicate prevention, pending count, review, approval, rejection, existing
identity reuse, idempotent appUser creation, and no auto-admission from login.
Customer guard/auth-state coverage proves active admission clears the stale
admission-required state while customer `/admin` denial remains intact.

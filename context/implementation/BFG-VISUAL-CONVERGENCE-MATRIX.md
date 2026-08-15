# BFG Phase 07.1 Visual Convergence Matrix

Status: local systemic pass complete; authenticated populated acceptance remains
blocked until designated real QA identities and safe real records are available.
Approved mockups are the visual authority.

| Surface | Viewport | Mockup | Current screenshot | Issue type | Shared primitive / fix | Post-fix verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Admin shell | 1024/1280/1440 | A-01–10 | authenticated capture blocked | logo, sidebar, buttons, frames | `BrandLogo`, `AdminNav`, tokens | LOCAL_READY / AUTH_BLOCKED |
| Admin Dashboard | 1024/1280/1440 | A-01 | authenticated capture blocked | skeleton anatomy | page-aware dashboard + 4/3/5 regions | LOCAL_READY / AUTH_BLOCKED |
| Join Requests | 1024/1280/1440 | A-01 | authenticated capture blocked | list skeleton | card-list route variant | LOCAL_READY / AUTH_BLOCKED |
| Customers | 1024/1280/1440 | A-06 | authenticated capture blocked | table/detail spacing | Admin shell/frame tokens | LOCAL_READY / AUTH_BLOCKED |
| Books | 1024/1280/1440 | A-02/A-03 | authenticated capture blocked | form/list skeleton | form-list archetype | LOCAL_READY / AUTH_BLOCKED |
| Catalogs | 1024/1280/1440 | A-02/A-03 | authenticated capture blocked | detail/frame inconsistency | catalog-list + detail grammar | LOCAL_READY / AUTH_BLOCKED |
| Ready Stock | 1024/1280/1440 | A-02 | authenticated capture blocked | summary/table skeleton | 3-part summary + table variant | LOCAL_READY / AUTH_BLOCKED |
| Orders | 1024/1280/1440 | A-05 | authenticated capture blocked | form/table/detail skeleton | order route variant | LOCAL_READY / AUTH_BLOCKED |
| Batch PO | 1024/1280/1440 | A-04 | authenticated capture blocked | form/list skeleton | batch route variant | LOCAL_READY / AUTH_BLOCKED |
| Exceptions | 1024/1280/1440 | A-01/A-05 | authenticated capture blocked | card-list skeleton | card-list route variant | LOCAL_READY / AUTH_BLOCKED |
| Invoices / Deposit | 1024/1280/1440 | A-07 | authenticated capture blocked | finance/list skeleton | financial-list variant | LOCAL_READY / AUTH_BLOCKED |
| Payments / Refunds | 1024/1280/1440 | A-08 | authenticated capture blocked | queue card sizing | shared list/frame/button tokens | LOCAL_READY / AUTH_BLOCKED |
| Reports | 1024/1280/1440 | A-09 | authenticated capture blocked | metrics/chart skeleton | report variant | LOCAL_READY / AUTH_BLOCKED |
| Content / Settings | 1024/1280/1440 | A-10 | authenticated capture blocked | form frame spacing | settings/form frame tokens | LOCAL_READY / AUTH_BLOCKED |
| Customer shell | 375/390/430/1440 | C-01–08 | `artifacts/visual-convergence/after/` | logo/header rhythm | `BrandLogo` optical frame | PASS_LOCAL_PUBLIC |
| Customer Dashboard | 375/390/430/1440 | C-08 | local auth/data transition | generic loading cards | 4 metrics + 6 ready-state panels | PASS_LOCAL_SKELETON / AUTH_BLOCKED |
| Buku Saya / Batch | 375/390/430/1440 | C-05/C-06 | signed-out/public gates | list/detail skeleton | customer card-list/detail variants | PASS_LOCAL_SKELETON / AUTH_BLOCKED |
| Tagihan / Deposit | 375/390/430/1440 | C-07 | signed-out/public gates | finance/form skeleton | customer card-list/deposit variants | PASS_LOCAL_SKELETON / AUTH_BLOCKED |
| Notifications / Inbox | all required | latest action matrix | signed-out/public gates | control integration | existing `WorkspaceActions` geometry | PASS_LOCAL_PUBLIC / AUTH_BLOCKED |

## Local rendered evidence

- Customer public/locked screenshots are under `artifacts/visual-convergence/`.
- `catalog-390.png` and `account-390.png` show the shared centered logo frame,
  fixed bottom navigation, and the new account skeleton/ready transition.
- Admin screenshots intentionally stop at Clerk's signed-out gate. No auth
  bypass or dummy data was introduced to manufacture a populated comparison.
- The focused skeleton tests assert the Dashboard, Ready Stock, Batch, and
  Customer list anatomies; the full local browser matrix is 155/155.
- The direct logo evidence includes `after/home-1440.png`,
  `after/sign-in-390.png`, and `after/sign-in-1440.png`; the auth capture also
  verifies that the optical wrapper does not crop the mark.

## Acceptance interpretation

The implementation can be locally green only for surfaces that are actually
renderable with the available public/signed-out state. Production closure still
requires the explicit authenticated screenshot matrix from the source QA
contract.

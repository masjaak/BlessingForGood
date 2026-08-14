# BFG Action Coverage V2

Reconciled: 2026-08-14. This is the zero-dead-control gate for the local change set. Production verification remains
`NO` for new controls until deployment and authenticated acceptance.

| Surface / Control | Visible | Enabled when valid | Handler | Real function | Backend | Authorized | Loading | Error | Success | Consequence | Destination | Production Verified | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admin notification icon/badge | YES | YES | route link | activity center | list/count/read | recipient | YES | empty/error safe | read state | attention updates | `/admin/notifications` | NO | PARTIAL |
| Admin Inbox icon/badge | YES | YES | route link | activity center | list/count/read | recipient | YES | empty/error safe | read state | operational queue | `/admin/inbox` | NO | PARTIAL |
| Customer notification icon/badge | YES | signed in | route link | activity center | list/count/read | recipient | YES | empty/error safe | read state | owned event | `/account/notifications` | NO | PARTIAL |
| Customer Inbox icon/badge | YES | signed in | route link | activity center | list/count/read | recipient | YES | empty/error safe | read state | owned message | `/account/inbox` | NO | PARTIAL |
| Catalog create Draft | YES | valid name/date | submit | canonical create | `secretCatalogs.create` | catalog manage | YES | YES | redirects | Draft record | detail | NO | PARTIAL |
| Catalog edit/open/close | YES | state-valid | submit/click | detail lifecycle | update/open/close | catalog manage | YES | YES | status copy | availability changes | detail | NO | PARTIAL |
| Catalog assign/remove product | YES | valid variant/state | click | item manager | add/remove | catalog manage | YES | YES | list reacts | scoped set changes | detail | NO | PARTIAL |
| Access Management entry | YES | catalog exists | link | dedicated route | safe metadata query | catalog manage | YES | deny/not-found | page | discoverable controls | access route | NO | PARTIAL |
| Generate expiring code | YES | valid expiry | click | secure generator | generateCode | catalog manage | YES | YES | plaintext once | digest record | same route | NO | PARTIAL |
| Copy one-time code | after generation | code present | click | native clipboard | n/a | current Admin UI | n/a | copy feedback | confirmation | clipboard only | same route | NO | PARTIAL |
| Revoke code | active code | active | click | revoke | revokeCode | catalog manage | YES | YES | metadata reacts | sessions fail authoritative checks | same route | NO | PARTIAL |
| Member grant/revoke | YES | customer/catalog valid | submit/click | grant manager | grantMember/revokeGrant | catalog manage | YES | YES | metadata reacts | customer access/Inbox | same route | NO | PARTIAL |
| Customer catalog unlock | YES | code valid | submit | scoped unlock | unlock | rate limit/scope | YES | safe error | catalog appears | session/grant | `/catalog` | old flow only | PARTIAL |
| Book/publisher create/edit | YES | valid | form | master maintenance | create/update | books manage | YES | YES | record reacts | product canonical | book detail | NO | PARTIAL |
| Variant/ISBN/price/status | YES | valid/unique | form | variant/book update | mutations | books manage | YES | YES | detail reacts | projections change | detail | NO | PARTIAL |
| Cover select/upload/replace | YES | JPG/PNG/WebP ≤5 MB | upload | Convex storage | upload URL/attach | books manage + trusted metadata | YES | YES | preview/copy | durable cover | detail/customer | NO | PARTIAL |
| Ready Stock search/filter | YES | always | input/select | reactive query args | list | public-safe | YES | empty state | filtered list | view only | same route | old flow live | ACTIVE |
| Ready Stock quantity/order | YES | stock/customer valid | form | set/create | mutations | manage/ownership | YES | YES | status/link | inventory/reservation/order | detail/order | NO | PARTIAL |
| Join submit/review/approve/reject | YES | state-valid | form/click | join lifecycle | mutations | public/admin | YES | YES | state copy | admission + events | queue/account | NO | PARTIAL |
| Batch create/deadline | YES | future deadline | form | create | batches.create | batch manage | YES | YES | list reacts | editable batch | list | NO | PARTIAL |
| Batch assign/move/remove/lock/status | YES | state-valid | controls | roster/tracking | mutations | batch manage | YES | YES | timeline reacts | customer projection/events | detail | NO | PARTIAL |
| Customer batch list/detail | YES | participating | links | batch pages | own queries | ownership | YES | safe empty/not-found | populated | tracking | `/account/batches*` | NO | PARTIAL |
| Admin order search/status filter | YES | always | inputs | local canonical filter | admin list | order permission | YES | empty state | filtered table | view only | same route | NO | PARTIAL |
| Assisted/Customer order | YES | policy-valid | submit | order functions | mutations | Admin/ownership | YES | YES | order result | canonical order | detail/history | old flow partial | PARTIAL |
| Invoice issue/payment review | YES | state-valid | forms/clicks | invoice/payment lifecycle | mutations | finance/ownership | YES | YES | state reacts | invoice/payment status | detail/queue | old flow live | PARTIAL |
| Payment proof file | YES | approved MIME ≤5 MB | upload/submit | Convex storage | upload URL/submit | own invoice + trusted metadata | YES | YES | confirmation | private review proof | invoice/Admin queue | NO | PARTIAL |
| Deposit top-up proof | YES | amount/file valid | upload/submit | top-up request | mutations | ownership | YES | YES | submitted status | Admin notification | deposit/queue | NO | PARTIAL |
| Top-up review/approve/reject | YES | state-valid | click | top-up lifecycle | mutations | deposits manage | YES | YES | state reacts | one ledger credit or rejection | Admin deposit | NO | PARTIAL |
| Manual deposit adjustment | YES | customer/amount/note valid | form | audited adjustment | adjust | deposits manage | YES | YES | confirmation | append-only ledger delta | Admin deposit | NO | PARTIAL |
| Report period/search | YES | valid ≤366 days | native controls | report query/local search | reports.get | Admin | YES | empty/error | results | canonical recap | report | NO | PARTIAL |
| Excel export | YES | report loaded | click | native Blob/download | audited metadata | Admin | YES | query guard | CSV download | filtered rows | file | NO | PARTIAL |
| Multi-Admin invitation/role/status | YES | Owner + valid email/state | forms/clicks | invitation/user lifecycle | mutations | Owner | YES | YES | status reacts | access changes | users | NO | PARTIAL |
| Audit log | YES | Owner | navigation | immutable list | audit query | Owner | YES | empty state | rows | privileged visibility | audit | NO | PARTIAL |
| Content save/publish | YES | valid text | form/click | content lifecycle | mutations | content manage | YES | YES | state copy | public content changes | public routes | NO | PARTIAL |
| Critical settings save | YES | valid fields | form | settings update | mutation | Owner | YES | YES | confirmation | payment/public copy | settings/invoice | NO | PARTIAL |
| WhatsApp API blast | NO | n/a | none | none | none | n/a | n/a | n/a | n/a | intentionally absent | n/a | YES | EXCLUDED |
| Payment gateway | NO | n/a | none | none | none | n/a | n/a | n/a | n/a | intentionally absent | n/a | YES | EXCLUDED |

Local gate: `UNKNOWN=0`, `DEAD_ACTION=0`. A `PARTIAL` row is operational locally but awaits the Production acceptance
shown in the master matrix; it is not a hidden or dead control.

## Final local audit additions

| Surface / Control | Visible | Handler | Backend | State / consequence | Local status | Production Verified |
| --- | --- | --- | --- | --- | --- | --- |
| Admin invoice create and issue | YES | create then issue | `invoices.create`, `invoices.issue` | draft→issued; customer invoice/notification | ACTIVE_VERIFIED_LOCAL | NO |
| Existing draft issue from queue | YES | issue action | `invoices.issue` | only valid draft transitions | ACTIVE_VERIFIED_LOCAL | NO |
| Book cover local preview and save | YES | native file input + save | upload URL + `books.attachCover` | selected file→durable reference | ACTIVE_VERIFIED_LOCAL | NO |
| Customer detail invoice/deposit context links | YES | route links | existing canonical flows | operator reaches intended workflow | ACTIVE_VERIFIED_LOCAL | NO |
| Admin sidebar optical row primitive | YES | route link | n/a | shared icon box/baseline/badge geometry | ACTIVE_VERIFIED_LOCAL | NO |

These additions do not change the zero-unknown/zero-dead-control result. They
remain local until canonical validation, deployment, and authenticated UAT pass.

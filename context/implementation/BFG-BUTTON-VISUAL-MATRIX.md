# BFG Button Visual Matrix

Status: ACTIVE — global button system consolidation, 2026-08-22. All action
rows route through the canonical family; raw button-like links and raw buttons
outside the primitive are zero in `src/`.

| Button | Semantic type | Route/context | Size | Icon | Current issue | Fix / verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Create / Buat | primary | Admin forms | default | none | mixed Admin heights | canonical `44px` / PASS_LOCAL |
| Add / Tambah | secondary | Admin Book/Catalog forms | default | none | dense form drift | canonical `44px` / PASS_LOCAL |
| Save / Simpan | primary | Admin + Customer forms | default | none | customer/Admin mismatch | shared size class / PASS_LOCAL |
| Publish / Buka | primary or secondary | Book/Catalog lifecycle | default | none | variant-only differences | variant controls color / PASS_LOCAL |
| Upload | primary | Book cover / deposit proof | default | none | route-local padding | shared default / PASS_LOCAL |
| Issue Invoice | primary | Admin invoices | default | none | small admin override | shared default / PASS_LOCAL |
| Review / Approve | primary | Join/payment queues | default | none | compact queue actions | default; compact only in rows / PASS_LOCAL |
| Reject / Revoke | danger | Admission/access/payment | default | none | radius and height drift | shared danger geometry / PASS_LOCAL |
| Generate Access | primary | Catalog Access Management | default | none | mixed form action sizes | shared default / PASS_LOCAL |
| Copy / Salin | secondary | Catalog code result | compact | none | inline action too tall | compact class / PASS_LOCAL |
| Edit / Open Detail | secondary | tables and list cards | default or explicit compact | none | table action oversized | shared size token / PASS_LOCAL |
| Back | icon/secondary | Customer detail routes | icon | chevron | optical target drift | `IconButton`, 44×44px target / PASS_LOCAL |
| Retry | secondary | error states | default | none | inherited local padding | shared default / PASS_LOCAL |

## Rules

- Same semantic action uses the same size class across Admin and Customer.
- `compact` is reserved for dense desktop Admin rows; it is 40px and remaps to
  the 44px target on touch breakpoints.
- `large` is 48px for major conversion and mobile CTA actions.
- Customer mobile actions remain `44px` minimum for touch safety. Full-width is
  a layout choice, not a new button size.
- Icon alignment belongs inside the button flex box; route margins do not tune
  icon baselines.

# Roles and governance permissions

Implemented November 2, 2026; expanded November 5, 2026. Backend policy: `backend/permissions.py`.

| Capability | System Administrator | Office Head | College Dean | Program Chair | College Secretary | Faculty | Document Controller | Student |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Users, role assignments, system settings, full audit logs | All | No | No | No | No | No | No | No |
| Campus announcements | All | No | No | No | No | No | No | No |
| Read published policies / ask the assistant | All | Yes | Yes | Yes | Yes | Yes | Yes | Yes, with student restrictions |
| Manage repository documents | All | Assigned office/program | Assigned college | Assigned program | Assigned college | No | No | No |
| Read/submit CHED and AACCUP evidence | All | Assigned program | All programs in college | Assigned program | All programs in college | Assigned program | No | No |
| Manage accreditation configuration and milestones | All | Assigned program | All programs in college | Assigned program | No | No | No | No |
| Read ISO, QMS, CAR and survey records | All | Assigned office | Assigned office if assigned | Assigned office if assigned | Assigned office if assigned | Assigned office | No | No |
| Review evidence, set compliance, assess plans, close CARs | All | Auditor/QA assignment | Auditor/QA assignment | Auditor/QA assignment | Auditor/QA assignment | Auditor/QA assignment | No | No |
| Paper Trail visibility | All | Own office / participant | Own unit / participant | Own unit / participant | Own unit / participant | Own office / participant | Campus-wide | No |
| Controlled-document routing | All | No special override | No special override | No special override | No special override | No special override | Primary operational role | No |

System Administrator is the emergency/global override and can access every system and governance function. A Quality Assurance office assignment or `is_iqa_auditor` grants campus-wide review access to other personnel roles. Academic leadership does not automatically approve its own evidence unless separately assigned as a reviewer.

## Scope rules

- Office scope comes from `users.administrative_office`. Academic scope comes from `users.department`: College Dean and College Secretary store a college, while Program Chair and Faculty store one program. The backend maps a college to all of its campus programs.
- College Dean can manage accreditation workflows and college-scoped documents. College Secretary can manage college-scoped documents and evidence but cannot manage users or alter accreditation configuration/milestones. Program Chair manages only the assigned program.
- Missing assignments grant no matching workflow access. They are never treated as “all offices.” Legacy `ADMIN` values are interpreted as `OFFICE_HEAD`; new accounts must use the new roles.
- Office names match exact normalized values or the explicit aliases in `permissions.py`, including existing combined ISO process offices. There is no substring matching.
- Updates check both the existing office and a requested replacement office. Evidence access checks the parent requirement/action plan before returning links or changing records.
- Governance evidence is filtered in repository listings, signed links, content retrieval and RAG context. Published general policies remain available under existing student restrictions.
- Frontend navigation uses the role returned by `/auth/me`. Governance controls use server-calculated capabilities. Session storage is only a UI cache; API authorization loads the account from the database.
- Self-registration cannot assign privileged roles, office scope or auditor access. Staff cannot change their own program assignment through Profile Settings.
- The last active System Administrator cannot be disabled, deleted or demoted. Assign another active administrator first. Email changes are allowed; log in again using the new email afterward.

## Existing-account migration

`backend/migrate_roles.py` performs an explicit transaction and backs up role/office/auditor assignments before changes. It never promotes accounts based on their display name or office.

- `admin@ctu.edu.ph` → `SYSTEM_ADMIN`, as requested.
- Other legacy `ADMIN` accounts → `OFFICE_HEAD`.
- Existing QA office and IQA assignments are preserved.
- Legacy `IQA` role, if present → `FACULTY` with the auditor assignment retained.
- One former administrator, `bakiogtiki@gmail.com`, had no office at migration time. Subsequently assigned to **HR & Records Management** at the user's request; the database update was verified.

Backup: `backups/role_assignments_20261102T043416816155Z.json` (ignored by Git).

The migration also removes the public-read policy and public client privileges on `system_events_logs`. This app uses its own authentication and the server's Supabase service role, so API authorization must protect service-role operations. Other public tables were checked: RLS was enabled, with only the intended anonymous survey-insert policy remaining. See [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## Verification and progress

- [x] Role split and central authorization helpers.
- [x] Account and system APIs restricted to System Administrator.
- [x] Office/program checks on ISO, QMS, CAR, CHED and AACCUP workflows.
- [x] Paper Trail direct-record access checked against the same visibility rule as its list.
- [x] Scoped survey results and governance evidence access.
- [x] UI roles, navigation, assignment forms and repository action visibility updated.
- [x] Regression tests in `backend/test_authorization.py` (real route bodies with mocked database calls, plus an HTTP dependency test).
- [x] 31 authorization, password-reset and RAG regression tests passed; frontend production build passed.
- [x] Eight live authenticated API checks passed after restarting the development backend: system settings access, Office Head denial on system APIs, empty unassigned-office records, and preserved QA review access.
- [x] Database verification: one System Administrator, two Office Heads, no legacy ADMIN roles; anonymous/authenticated Supabase clients cannot read system audit logs.
- [x] Assign the missing Office Head office: `bakiogtiki@gmail.com` → HR & Records Management.
- [ ] Administrator reviews academic program assignments where applicable.
- [ ] Final walkthrough using your actual Office Head workflow and presentation documents.

Run tests from `backend`: `python -m unittest test_authorization -v`.
Build the frontend from the project root: `npm run build`.

Future extension: use explicit assignment tables if one person needs several colleges, unrelated programs, several offices or a restricted auditor assignment. Do not grant the campus-wide auditor flag merely to solve a missing scope assignment.

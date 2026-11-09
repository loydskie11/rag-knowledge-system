# Authorization and permission matrix

Updated November 6, 2026. The system uses three base roles and repeatable scoped assignments.

## Base roles

| Base role | Purpose |
| --- | --- |
| System Administrator | Global system and governance access, user management, settings, audit logs and emergency override |
| Personnel | Campus employee account; effective access comes from one or more assignments below |
| Student | Public/student repository, AI assistant, grade evaluation and client survey access |

Job titles are not base roles. A Personnel account can hold several assignments at the same time.

## Personnel assignments

| Assignment | Required scope | Effective access |
| --- | --- | --- |
| Office Head | Office | Office records, office ISO/QMS work, office survey analytics, document management |
| Office Member | Office | Read/submit within the office; no approval, user management or document-management authority |
| College Dean | College | All programs in the college; accreditation and college document management |
| College Secretary | College | All programs in the college and college documents; no accreditation configuration/milestones |
| Program Chair | Program | Assigned program accreditation, evidence and document management |
| Faculty Member / Instructor | Program | Read/submit assigned-program evidence; no approval or document management |
| Quality Assurance Head | Campus | Campus-wide governance review and management |
| Internal Quality Auditor | Campus or office | Campus-wide or assigned-office review scope |
| Survey Analyst | Campus or office | Campus-wide or assigned-office Survey Analytics |
| Document Controller | Campus | Paper Trail control; only one active assignment is allowed |

## Menu and capability rules

| Menu / capability | System Administrator | Personnel | Student |
| --- | --- | --- | --- |
| Dashboard, Knowledge Repository, AI Assistant | Yes | Yes | Yes, with student document restrictions |
| Accreditation Support | Yes | Only with office, academic, QA or IQA assignment | No |
| Paper Trail | Yes; control | Read for all Personnel; control only with Document Controller | No |
| Survey Analytics | Yes, campus-wide | Office Head, QA Head, IQA Auditor or Survey Analyst only | No |
| Document Generator | Yes | Yes | No |
| Grade Evaluation | Yes | Yes | Yes |
| Broadcast Announcement | Yes | No | No |
| Audit Trail | Yes | No | No |
| Users & Roles | Yes | No | No |
| System Settings | Yes | No | No |

## Scope behavior

- Missing assignments grant no governance, accreditation or analytics scope.
- College assignments expand to every program mapped to that college. Program assignments remain program-specific.
- Office assignments use the confirmed campus organizational office directory. `Other` remains a survey response option and cannot be assigned to an account.
- The 16 ISO groups are accreditation/QMS process groups, not organizational offices. `iso_process_unit_mappings` maps each process group to one or more actual campus offices.
- Multiple active assignments are combined. They never change the account's base role from `PERSONNEL`.
- Paper Trail visibility and current-office custody combine every active OFFICE assignment; sender, recipient and Document Controller access remain independent of office scope.
- No dedicated Document Controller is assigned yet. System Administrator retains full Paper Trail control; a future Personnel account with the campus-scoped Document Controller assignment receives the same operational visibility, custody, controlled-release, closure and metadata-correction capabilities.
- QA Head and campus-scoped IQA Auditor grant campus-wide governance review.
- Only the System Administrator, campus-scoped QA Head, or campus-scoped IQA Auditor can calibrate an AACCUP standing, close/open accreditation cycles, log an official level promotion, or change an official accreditation certificate.
- College Deans and Program Chairs retain their scoped program evidence and accreditation-work access, but cannot change the program's official accreditation level.
- Authorized academic personnel and campus reviewers can browse evidence and certificates from prior AACCUP cycles. Closed cycles are read-only; only the active cycle accepts uploads, review changes, or evidence archiving.
- An office-scoped IQA Auditor can review only the assigned office and its mapped ISO process groups. This assignment does not grant access to unrelated offices or academic programs; any additional scope must come from another explicit assignment.
- Survey Analyst grants survey access only and does not grant governance review.
- System Administrator is the only global system-management role and can access every menu.
- API authorization is calculated from database assignments. Browser session storage is only a UI cache.

## Database model

- `users.role`: `SYSTEM_ADMIN`, `PERSONNEL` or `STUDENT`
- `organizational_units`: confirmed offices and academic colleges
- `academic_programs`: programs mapped to colleges
- `user_assignments`: repeatable position and scope records
- `iso_process_groups`: the 16 ISO/QMS process groups
- `iso_process_unit_mappings`: process-group-to-campus-office mappings
- `iso_process_aliases`: exact legacy labels used by existing ISO requirements
- `accreditation_cycles`: one immutable program/level attempt record, with at most one active cycle per program

Migrations:

- `supabase/20261106_base_roles_and_personnel_assignments.sql`
- `supabase/20261106_enforce_authorization_constraints.sql`
- `supabase/20261106_iso_process_aliases.sql`
- `supabase/20261108_accreditation_cycles.sql`

## Migration result

The live Supabase database migration preserved all 33 accounts:

- 1 System Administrator
- 12 Personnel
- 20 Students
- 15 migrated assignments: 7 Faculty Member, 4 Office Member, 2 Office Head and 2 IQA Auditor assignments (some people hold more than one)

Reference data contains 27 assignable campus offices, 5 colleges, 19 programs, 16 ISO process groups, 16 exact legacy aliases and 27 ISO-to-office mappings. All 17 distinct process labels already used by ISO requirements are covered by a canonical name or alias.

## Verification

- Backend compilation passed.
- Authorization regression suite: `python backend/test_authorization.py`
- Authorization and permission regression suite: `python -m unittest discover -s backend -p "test_*.py"`
- Strict TypeScript validation: `npm run typecheck`
- Frontend production build: `npm run build`
- Live database checks confirmed valid base roles, valid assignment scopes and no assignments attached to non-Personnel accounts.
- Supabase Data API hardening removes all `anon` and `authenticated` table/sequence grants; application data and the vector-search RPC are available only through the backend service role.
- The vector-search function uses the fixed `public, extensions` search path, and pgvector is installed in the non-exposed `extensions` schema.
- Fix 11 live configuration: the unused Jane Doe test account was permanently removed, System Administrator remains the current Paper Trail controller, and PAID remains intentionally unmapped pending adviser confirmation.

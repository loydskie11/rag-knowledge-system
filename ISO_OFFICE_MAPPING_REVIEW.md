# Campus Office to ISO Process Mapping — Adviser Review Copy

Updated November 8, 2026. This document records the mappings currently stored in the live system. It is a review copy, not a claim that every mapping has already been institutionally approved.

Fix 11 decision: **Public Assistance and Information Desk remains intentionally unmapped for now.** This prevents the office from inheriting ISO evidence access until the adviser identifies its responsible process group.

## How to read the mapping

- **Campus office** is one of the 27 confirmed offices used for Personnel assignments and Customer Satisfaction Survey scope.
- **Canonical ISO process group** is the normalized process group used by the accreditation and ISO modules.
- **Recognized legacy labels** are labels found in the earlier ISO material. They are aliases of the canonical process group, not additional offices or separate processes.
- An Office Head's ISO scope is derived from this mapping. Changing a mapping can therefore change which ISO requirements and evidence that office can access.

For example, **DOI Office → Academic Affairs**. **Educational Delivery Processes** is a recognized legacy label for Academic Affairs. These are two names for the same mapped process, not two separate DOI assignments.

## Current mapping matrix

| # | Campus office | Office code | Current canonical ISO process group | Recognized legacy ISO label(s) | Adviser decision / correction |
|---:|---|---|---|---|---|
| 1 | Accounting Office | `ACCOUNTING` | Administrative & Finance | Finance/Budget/Accounting/Cashier; Procurement/BAC | ☐ Confirm ☐ Change |
| 2 | Admin Office | `ADMIN` | Administrative & Finance; Quality Assurance & Management (QAU) | Finance/Budget/Accounting/Cashier; Procurement/BAC; Document Controller | ☐ Confirm ☐ Change |
| 3 | BAC Office | `BAC` | Administrative & Finance | Finance/Budget/Accounting/Cashier; Procurement/BAC | ☐ Confirm ☐ Change |
| 4 | Budget / Finance Office | `BUDGET_FINANCE` | Administrative & Finance | Finance/Budget/Accounting/Cashier; Procurement/BAC | ☐ Confirm ☐ Change |
| 5 | CAS Office | `CAS_OFFICE` | Academic Affairs | Educational Delivery Processes | ☐ Confirm ☐ Change |
| 6 | Cashier's Office | `CASHIER` | Administrative & Finance | Finance/Budget/Accounting/Cashier; Procurement/BAC | ☐ Confirm ☐ Change |
| 7 | CD Office | `CD` | Campus Director | Management/Leadership; Gender and Development | ☐ Confirm ☐ Change |
| 8 | Civil Security Unit (CSU) Office | `CSU` | Security & Physical Plant Unit | DRRM; Maintenance/General Services | ☐ Confirm ☐ Change |
| 9 | COED Office | `COED_OFFICE` | Academic Affairs | Educational Delivery Processes | ☐ Confirm ☐ Change |
| 10 | COTE Office | `COTE_OFFICE` | Academic Affairs | Educational Delivery Processes | ☐ Confirm ☐ Change |
| 11 | DOI Office | `DOI` | **Academic Affairs** | **Educational Delivery Processes** | ☐ Confirm ☐ Change |
| 12 | Extension Office | `EXTENSION` | Extension & Community Services | Extension | ☐ Confirm ☐ Change |
| 13 | GAD Office | `GAD` | Campus Director | Management/Leadership; Gender and Development | ☐ Confirm ☐ Change |
| 14 | Graduate School Office | `GRADUATE_SCHOOL` | Academic Affairs | Educational Delivery Processes | ☐ Confirm ☐ Change |
| 15 | Guidance Office | `GUIDANCE` | Guidance & Placement | — | ☐ Confirm ☐ Change |
| 16 | Human Resource and Management Office | `HRMO` | HR & Records Management | HRMO | ☐ Confirm ☐ Change |
| 17 | Library Office | `LIBRARY` | University Library | Library Services | ☐ Confirm ☐ Change |
| 18 | Maintenance Office | `MAINTENANCE` | Security & Physical Plant Unit | DRRM; Maintenance/General Services | ☐ Confirm ☐ Change |
| 19 | Medical Clinic / Dental | `MEDICAL_DENTAL` | Medical & Dental Clinic | — | ☐ Confirm ☐ Change |
| 20 | MIS Office | `MIS` | MIS & Information Technology Unit | — | ☐ Confirm ☐ Change |
| 21 | Planning & Development Office | `PLANNING` | Production & Resource Generation | Production and Resource Generation | ☐ Confirm ☐ Change |
| 22 | Public Assistance and Information Desk | `PAID` | **Intentionally unmapped for now** | — | Adviser confirmation still required before adding ISO scope |
| 23 | Registrar's Office | `REGISTRAR` | Registrar's Office | Registrar/MIS | ☐ Confirm ☐ Change |
| 24 | Research Office | `RESEARCH` | Research & Development | Research and Development | ☐ Confirm ☐ Change |
| 25 | SAO Dean's Office | `SAO_DEAN` | Student Affairs & Services | Student Affairs Services | ☐ Confirm ☐ Change |
| 26 | Scholarship Office | `SCHOLARSHIP` | Student Affairs & Services | Student Affairs Services | ☐ Confirm ☐ Change |
| 27 | Supply Office | `SUPPLY` | Supply & Property Unit | Supply/Property Custodian | ☐ Confirm ☐ Change |

## Items that specifically need adviser confirmation

1. Confirm whether DOI, CAS, COTE, COED, and Graduate School should all share the **Academic Affairs / Educational Delivery Processes** scope.
2. Confirm whether Admin Office should belong to both **Administrative & Finance** and **Quality Assurance & Management**.
3. Confirm whether GAD Office should remain under **Campus Director**, using Gender and Development as a legacy process label.
4. **Interim decision recorded:** the **Public Assistance and Information Desk** intentionally has no ISO scope. Revisit only after adviser confirmation.
5. Review broad grouped aliases. For example, every office under Administrative & Finance currently inherits both the Finance and Procurement/BAC legacy labels because aliases are stored at process-group level.

## Adviser corrections

Record any requested changes below before the database mapping is updated.

| Campus office | Replace/add/remove process group | Reason or adviser note |
|---|---|---|
| Public Assistance and Information Desk | Keep unmapped temporarily | Avoid granting unconfirmed ISO evidence access; revisit with adviser |
|  |  |  |
|  |  |  |

## Technical source

The live matrix is stored in:

- `organizational_units` — campus offices
- `iso_process_groups` — canonical ISO process groups
- `iso_process_unit_mappings` — office-to-process relationships
- `iso_process_aliases` — legacy ISO labels recognized for each process group

The corresponding migrations are `supabase/20261106_base_roles_and_personnel_assignments.sql` and `supabase/20261106_iso_process_aliases.sql`.

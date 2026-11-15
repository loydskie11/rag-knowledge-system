# CAR Workflow Improvement Tracker

This tracker records the recommended implementation order for the ISO Corrective Action Request workflow. Complete fixes sequentially unless a later item is explicitly independent.

## Phase 1 — Authoritative workflow

- [x] Fix 1: Define and enforce the official lifecycle: `Draft → Issued → Acknowledged → Response Submitted → In Progress → Awaiting Verification → Returned or Closed`, with `Void` for incorrectly issued records.
- [x] Fix 2: Unify CAR Form 1 and the QMS Action Plan under one case record.
- [x] Fix 3: Link each CAR to its audit cycle, ISO clause, responsible office, and original finding.
- [x] Fix 4: Safely migrate existing CAR and action-plan records without deletion.

## Phase 2 — Ownership and permissions

- [x] Fix 5: Separate auditor, auditee, responsible-office, reviewer, and technical-administrator responsibilities.
- [x] Fix 6: Lock the auditor’s original finding after issuance.
- [x] Fix 7: Assign designated responsible users.
- [x] Fix 8: Enforce office-scoped CAR access and campus-wide QA/IQA visibility.

## Phase 3 — Finding structure

- [x] Fix 9: Separate requirement/clause, objective evidence, and statement of nonconformity.
- [x] Fix 10: Use Major, Minor, Observation, and Opportunity for Improvement classifications; prohibit issuing `Unknown`.
- [x] Fix 11: Configure which finding classifications require a CAR.

## Phase 4 — Source document and OCR controls

- [x] Fix 12: Store the original scanned CAR and its file metadata/hash.
- [x] Fix 13: Treat OCR output as an editable draft and require review before saving.
- [x] Fix 14: Record explicit human verification before issuance.
- [x] Fix 15: Add side-by-side scanned-document review.
- [x] Fix 16: Store OCR model, version, date, raw JSON, verifier, and verification date.
- [x] Fix 17: Add confidence warnings for critical fields.

## Phase 5 — OCR accuracy

- [x] Fix 18: Render PDF pages at 150–200 DPI.
- [x] Fix 19: Preserve aspect ratio with a high-resolution longest edge.
- [x] Fix 20: Increase structured-output capacity.
- [x] Fix 21: Remove the assumption that the lower half is blank.
- [x] Fix 22: Extract both issuance-only and completed forms.
- [x] Fix 23: Combine conventional OCR with local model extraction.
- [x] Fix 24: Validate dates, classifications, checkboxes, and required output types.

## Phase 6 — Auditee response

- [x] Fix 25: Distinguish correction/containment, root cause, and recurrence-preventing corrective action.
- [x] Fix 26: Support Five Whys, fishbone categories, and free-form root-cause analysis.
- [x] Fix 27: Require action owner, office, target date, and expected evidence.
- [x] Fix 28: Support multiple actions per CAR.
- [x] Fix 29: Attach implementation evidence to each action.
- [x] Fix 30: Require explicit auditee submission for QA verification.

## Phase 7 — Verification and closure

- [x] Fix 31: Add and enforce Awaiting Verification.
- [x] Fix 32: Require verification evidence.
- [x] Fix 33: Use Effective, Partially Effective, Ineffective, and Additional Evidence Required outcomes.
- [x] Fix 34: Enforce closure requirements.
- [x] Fix 35: Synchronize lifecycle status and closure state.
- [x] Fix 36: Return ineffective actions for correction and another follow-up.
- [x] Fix 37: Add controlled reopening with a reason, reviewer, and timestamp.

## Phase 8 — Integrity and traceability

- [x] Fix 38: Generate controlled unique CAR numbers.
- [x] Fix 39: Add database uniqueness constraints.
- [x] Fix 40: Replace free-text workflow identities with user IDs.
- [x] Fix 41: Record status-transition history.
- [x] Fix 42: Preserve field-level revision history.
- [x] Fix 43: Replace permanent deletion of issued CARs with controlled voiding.
- [x] Fix 44: Track all lifecycle timestamps.

## Phase 9 — Notifications and monitoring

- [x] Fix 45: Notify the responsible office when a CAR is issued.
- [x] Fix 46: Send deadline reminders.
- [x] Fix 47: Notify QA when a response is ready for verification.
- [x] Fix 48: Calculate overdue status automatically.
- [x] Fix 49: Escalate overdue major findings.

## Phase 10 — Reports and templates

- [x] Fix 50: Generate CAR Form 1 from verified workflow data.
- [x] Fix 51: Update the CAR Form 3 master log.
- [x] Fix 52: Add lifecycle dashboards.
- [x] Fix 53: Add finding and effectiveness trend analysis.
- [x] Fix 54: Export a complete audit-history package.

## Phase 11 — Standards and testing

- [x] Fix 55: Make the ISO standard version configurable per cycle.
- [x] Fix 56: Test every transition and role restriction.
- [x] Fix 57: Build an anonymized OCR evaluation set.
- [ ] Fix 58: Measure critical-field OCR accuracy.
  - Baseline tooling is operational. The single captured pre-repair case scored 62.5% (5/8); at least 20 anonymized post-repair scans are still required for a valid current accuracy result.
- [x] Fix 59: Test complete issuance-to-closure scenarios.
- [ ] Fix 60: Obtain QA/adviser validation of classifications, numbering, signatories, responsibilities, closure rules, observation policy, and ISO 9001:2026 transition.
  - The technical checklist is ready in `docs/CAR_PHASE11_VALIDATION.md`; formal adviser review remains pending.

## Current implementation order

1. Fixes 1–4 establish the data and workflow foundation.
2. Fixes 5–8 enforce real-world ownership.
3. Fixes 9–17 strengthen findings and source-document integrity.
4. Fixes 25–44 complete auditee response, verification, and traceability.
5. Fixes 45–60 add automation, reporting, and final validation.

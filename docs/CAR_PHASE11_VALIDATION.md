# CAR Phase 11 Validation

## Automated technical checks

- ISO standard version is stored and editable per audit cycle.
- CAR lifecycle transitions are checked against the allowed state graph.
- Operational actions are limited to QA/IQA reviewers, responsible office heads, and designated auditees.
- Closure requires completed actions, implementation evidence, QA verification evidence, an Effective outcome, follow-up date, and remarks.
- Issued CARs are preserved through controlled voiding rather than deletion.
- Reopening records the reviewer, reason, timestamp, and a new lifecycle transition.
- CAR reports and audit packages are generated from server-side canonical records.

## OCR evaluation protocol

1. Collect at least 20 representative CAR Form 1 scans: clean scans, mobile photos, tilted images, handwritten names, checked boxes, partially completed forms, and completed forms.
2. Remove or pseudonymize names, signatures, contact details, and sensitive findings before adding expected values to the dataset.
3. Do not commit source images containing personal data. Store approved anonymized images under an access-controlled evaluation folder.
4. Capture the model output before manually correcting it.
5. Add expected and predicted values to `docs/car-ocr-evaluation/anonymized-baseline.json` with status `CAPTURED`.
6. Run `npm run evaluate:car-ocr` and record the overall and per-field accuracy.
7. Target at least 95% exact accuracy for CAR number, dates, classification, area, auditor, and acknowledged-by fields before claiming production readiness.

## QA/adviser sign-off checklist

The QA adviser must confirm each item and record comments:

- Finding classifications and which classifications require a CAR
- Controlled CAR numbering format
- Required signatories and accountable workflow identities
- Responsible-office and QA/IQA permissions
- Closure and reopening rules
- Treatment of observations and opportunities for improvement
- CAR Form 1 and CAR Form 3 generated layouts
- ISO standard-version transition policy, including ISO 9001:2026 timing
- OCR acceptance target and approved evaluation samples

Final sign-off remains pending until the adviser reviews these items.

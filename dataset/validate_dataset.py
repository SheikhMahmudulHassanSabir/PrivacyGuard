#!/usr/bin/env python3
"""
PrivacyGuard Dataset Validator

Validates:
1. Unique case IDs across CSV and JSON
2. Required columns and fields
3. Valid PII entity labels
4. Exact entity offsets: text[start:end] == entity['text']
5. Consistency between 'contains_pii' and ground-truth annotations
6. Consistency between CSV and JSON records (1:1 alignment)
7. Missing/null values
8. Non-destructive: Reports validation issues without modifying data.
"""

import os
import sys
import csv
import json
from collections import Counter

# Supported PII labels defined by schema
VALID_PII_LABELS = {
    "NAME_STUDENT",
    "EMAIL",
    "PHONE_NUM",
    "STREET_ADDRESS",
    "USERNAME",
    "URL_PERSONAL"
}

REQUIRED_CSV_COLUMNS = [
    "case_id",
    "text",
    "contains_pii",
    "pii_types",
    "risk_level",
    "domain",
    "language",
    "format_type",
    "annotation_status"
]

VALID_RISK_LEVELS = {"NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"}
VALID_STATUSES = {"verified", "needs_review"}

def validate_dataset(dataset_dir=None):
    if dataset_dir is None:
        dataset_dir = os.path.dirname(os.path.abspath(__file__))

    eval_csv_path = os.path.join(dataset_dir, "evaluation_cases.csv")
    annot_json_path = os.path.join(dataset_dir, "annotated_cases.json")
    schema_json_path = os.path.join(dataset_dir, "dataset_schema.json")

    errors = []
    warnings = []

    print(f"============================================================")
    print(f"PRIVACYGUARD DATASET VALIDATION")
    print(f"Target Directory: {dataset_dir}")
    print(f"============================================================")

    # 1. File existence
    for path in [eval_csv_path, annot_json_path, schema_json_path]:
        if not os.path.exists(path):
            errors.append(f"Missing required file: {path}")

    if errors:
        for err in errors:
            print(f"[ERROR] {err}")
        return False, errors, warnings

    # 2. Validate Schema JSON
    try:
        with open(schema_json_path, "r", encoding="utf-8") as f:
            schema_data = json.load(f)
        print("[PASS] Schema file 'dataset_schema.json' is valid JSON.")
    except Exception as e:
        errors.append(f"Failed to parse 'dataset_schema.json': {e}")

    # 3. Read and validate CSV
    csv_records = []
    csv_ids = []
    with open(eval_csv_path, mode="r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        for col in REQUIRED_CSV_COLUMNS:
            if col not in fieldnames:
                errors.append(f"Missing required CSV column: {col}")

        for row_idx, row in enumerate(reader, start=1):
            csv_records.append(row)
            cid = row.get("case_id", "").strip()
            if not cid:
                errors.append(f"CSV Row {row_idx}: Empty case_id")
            csv_ids.append(cid)

            if not row.get("text", "").strip():
                errors.append(f"CSV Row {row_idx} ({cid}): Empty text field")

            risk = row.get("risk_level", "")
            if risk not in VALID_RISK_LEVELS:
                errors.append(f"CSV Row {row_idx} ({cid}): Invalid risk_level '{risk}'")

            status = row.get("annotation_status", "")
            if status not in VALID_STATUSES:
                errors.append(f"CSV Row {row_idx} ({cid}): Invalid annotation_status '{status}'")

    print(f"[PASS] Loaded {len(csv_records):,} records from 'evaluation_cases.csv'.")

    # CSV ID uniqueness
    csv_id_counts = Counter(csv_ids)
    dup_csv_ids = [k for k, v in csv_id_counts.items() if v > 1]
    if dup_csv_ids:
        errors.append(f"Duplicate case_ids in CSV: {len(dup_csv_ids)} duplicates found: {dup_csv_ids[:5]}")
    else:
        print("[PASS] All case_ids in CSV are strictly unique.")

    # 4. Read and validate JSON
    try:
        with open(annot_json_path, "r", encoding="utf-8") as f:
            annot_records = json.load(f)
        print(f"[PASS] Loaded {len(annot_records):,} records from 'annotated_cases.json'.")
    except Exception as e:
        errors.append(f"Failed to parse 'annotated_cases.json': {e}")
        annot_records = []

    # JSON ID uniqueness & structure
    json_ids = []
    json_by_id = {}
    for idx, item in enumerate(annot_records, start=1):
        if not isinstance(item, dict):
            errors.append(f"JSON record {idx} is not a valid JSON object")
            continue

        cid = item.get("case_id", "").strip()
        if not cid:
            errors.append(f"JSON record {idx}: Missing or empty case_id")
        json_ids.append(cid)
        json_by_id[cid] = item

        if "text" not in item:
            errors.append(f"JSON record {idx} ({cid}): Missing 'text' key")
        if "entities" not in item:
            errors.append(f"JSON record {idx} ({cid}): Missing 'entities' key")
        if "annotation_status" not in item:
            errors.append(f"JSON record {idx} ({cid}): Missing 'annotation_status' key")

    json_id_counts = Counter(json_ids)
    dup_json_ids = [k for k, v in json_id_counts.items() if v > 1]
    if dup_json_ids:
        errors.append(f"Duplicate case_ids in JSON: {len(dup_json_ids)} duplicates found")
    else:
        print("[PASS] All case_ids in JSON are strictly unique.")

    # 5. Cross-file 1:1 match
    if len(csv_records) != len(annot_records):
        errors.append(f"Record count mismatch: CSV has {len(csv_records)} while JSON has {len(annot_records)}")
    
    missing_in_json = set(csv_ids) - set(json_ids)
    if missing_in_json:
        errors.append(f"{len(missing_in_json)} case_ids in CSV are missing from JSON")
    missing_in_csv = set(json_ids) - set(csv_ids)
    if missing_in_csv:
        errors.append(f"{len(missing_in_csv)} case_ids in JSON are missing from CSV")

    if not missing_in_json and not missing_in_csv:
        print("[PASS] Exactly 1:1 case_id match between CSV and JSON.")

    # 6. Entity Offsets & Annotation Validation
    total_entities = 0
    offset_errors = 0
    label_errors = 0
    consistency_errors = 0

    for csv_row in csv_records:
        cid = csv_row["case_id"]
        csv_contains_pii = csv_row["contains_pii"].strip().lower() in ("true", "1")
        csv_status = csv_row["annotation_status"]
        csv_text = csv_row["text"]

        json_item = json_by_id.get(cid)
        if not json_item:
            continue

        json_text = json_item.get("text", "")
        if csv_text != json_text:
            errors.append(f"Text mismatch for case_id {cid} between CSV and JSON")

        entities = json_item.get("entities", [])
        num_entities = len(entities)

        # Check contains_pii consistency
        if csv_contains_pii and num_entities == 0:
            errors.append(f"Case {cid}: contains_pii is True but entity count is 0")
            consistency_errors += 1
        elif not csv_contains_pii and num_entities > 0:
            errors.append(f"Case {cid}: contains_pii is False but entity count is {num_entities}")
            consistency_errors += 1

        # Check annotation_status consistency
        if csv_status != json_item.get("annotation_status"):
            errors.append(f"Case {cid}: Status mismatch: CSV='{csv_status}' vs JSON='{json_item.get('annotation_status')}'")
            consistency_errors += 1

        # Check entities
        prev_end = -1
        for ent_idx, ent in enumerate(entities):
            total_entities += 1
            e_text = ent.get("text")
            e_label = ent.get("label")
            start = ent.get("start")
            end = ent.get("end")

            # Check label
            if e_label not in VALID_PII_LABELS:
                errors.append(f"Case {cid} Entity {ent_idx}: Invalid label '{e_label}'")
                label_errors += 1

            # Check offset bounds
            if not isinstance(start, int) or not isinstance(end, int) or start < 0 or end <= start or end > len(json_text):
                errors.append(f"Case {cid} Entity {ent_idx}: Invalid offsets [{start}:{end}] for text len {len(json_text)}")
                offset_errors += 1
                continue

            # Verify exact slice
            slice_text = json_text[start:end]
            if slice_text != e_text:
                errors.append(f"Case {cid} Entity {ent_idx}: Slice mismatch! text[{start}:{end}]='{slice_text}' vs entity text='{e_text}'")
                offset_errors += 1

    print(f"[PASS] Validated {total_entities:,} entities across all cases.")
    if offset_errors == 0:
        print("[PASS] 100% of entity character offsets [start:end] strictly match original text slices.")
    if label_errors == 0:
        print("[PASS] All entity labels belong to schema-supported PII categories.")
    if consistency_errors == 0:
        print("[PASS] Complete consistency between 'contains_pii' flags and entity counts.")

    # 7. Summary
    print("------------------------------------------------------------")
    print(f"Validation Summary:")
    print(f"  Total Errors:   {len(errors)}")
    print(f"  Total Warnings: {len(warnings)}")

    if errors:
        print(f"\n[FAILED] Dataset has {len(errors)} validation errors:")
        for e in errors[:10]:
            print(f"  - {e}")
        if len(errors) > 10:
            print(f"  ... and {len(errors)-10} more errors.")
        return False, errors, warnings
    else:
        print("\n[SUCCESS] Dataset passed all validation checks with zero errors!")
        return True, errors, warnings

if __name__ == "__main__":
    success, errs, warns = validate_dataset()
    if not success:
        sys.exit(1)
    else:
        sys.exit(0)

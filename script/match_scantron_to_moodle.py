#!/usr/bin/env python3

import argparse
import csv
import difflib
import re
import sys
from pathlib import Path
from typing import List, Optional


def normalize_id(value: str) -> str:
    return (value or "").strip()


def normalize_name(value: str) -> str:
    value = (value or "").strip().upper()
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def tokenize_name(value: str):
    normalized = normalize_name(value)
    if not normalized:
        return []
    return normalized.split(" ")


def normalize_header(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (name or "").lower())


def find_best_header(headers: List[str], preferred_names) -> Optional[str]:
    if isinstance(preferred_names, str):
        preferred = [preferred_names]
    else:
        preferred = list(preferred_names)

    normalized_headers = {h: normalize_header(h) for h in headers}

    # 1) exact match
    for p in preferred:
        if p in headers:
            return p

    # 2) normalized exact match
    pref_norms = [normalize_header(p) for p in preferred]
    for h, hn in normalized_headers.items():
        if hn in pref_norms:
            return h

    # 3) fuzzy match against preferred names
    for p in preferred:
        pn = normalize_header(p)
        best = None
        best_score = 0.0
        for h, hn in normalized_headers.items():
            score = difflib.SequenceMatcher(None, pn, hn).ratio()
            if score > best_score:
                best_score = score
                best = h
        if best_score >= 0.80:
            return best

    # 4) fuzzy match against all headers (useful when preferred is generic)
    all_pref = "".join(pref_norms)
    best = None
    best_score = 0.0
    for h, hn in normalized_headers.items():
        score = difflib.SequenceMatcher(None, all_pref, hn).ratio()
        if score > best_score:
            best_score = score
            best = h
    if best_score >= 0.70:
        return best

    return None


def best_token_similarity(source_token: str, target_tokens) -> float:
    if not source_token or not target_tokens:
        return 0.0
    return max(
        difflib.SequenceMatcher(None, source_token, token).ratio()
        for token in target_tokens
    )


def build_scantron_full_name(row, last_col: str, first_col: str) -> str:
    last = (row.get(last_col, "") or "").strip()
    first = (row.get(first_col, "") or "").strip()
    return f"{first} {last}".strip()


def build_name_signature(value: str) -> str:
    tokens = tokenize_name(value)
    return " ".join(tokens)


def compute_name_match(scantron_last: str, scantron_first: str, moodle_full_name: str):
    moodle_tokens = tokenize_name(moodle_full_name)
    scantron_last_token = normalize_name(scantron_last)
    scantron_first_token = normalize_name(scantron_first)
    scantron_full = build_name_signature(f"{scantron_first} {scantron_last}")
    moodle_full = build_name_signature(moodle_full_name)

    last_similarity = best_token_similarity(scantron_last_token, moodle_tokens)
    first_similarity = best_token_similarity(scantron_first_token, moodle_tokens)
    full_similarity = (
        difflib.SequenceMatcher(None, scantron_full, moodle_full).ratio()
        if scantron_full and moodle_full
        else 0.0
    )

    last_match = bool(scantron_last_token) and last_similarity >= 0.80
    first_match = bool(scantron_first_token) and first_similarity >= 0.80
    full_match = (last_match and first_match) or full_similarity >= 0.70

    return {
        "last_match": last_match,
        "first_match": first_match,
        "full_match": full_match,
        "last_similarity": last_similarity,
        "first_similarity": first_similarity,
        "full_similarity": full_similarity,
    }


def score_identity_candidate(scantron_last: str, scantron_first: str, moodle_full_name: str) -> float:
    moodle_tokens = tokenize_name(moodle_full_name)
    scantron_last_token = normalize_name(scantron_last)
    scantron_first_token = normalize_name(scantron_first)

    last_similarity = best_token_similarity(scantron_last_token, moodle_tokens)
    first_similarity = best_token_similarity(scantron_first_token, moodle_tokens)

    scantron_full = build_name_signature(f"{scantron_first} {scantron_last}")
    moodle_full = build_name_signature(moodle_full_name)
    full_similarity = (
        difflib.SequenceMatcher(None, scantron_full, moodle_full).ratio()
        if scantron_full and moodle_full
        else 0.0
    )

    if not scantron_last_token and not scantron_first_token:
        return 0.0

    weighted = 0.45 * last_similarity + 0.45 * first_similarity + 0.10 * full_similarity
    return weighted


def score_identity_candidate_extended(
    scantron_last: str,
    scantron_first: str,
    moodle_full_name: str,
    scantron_row: dict | None = None,
    moodle_row: dict | None = None,
):
    # base name similarity
    base = score_identity_candidate(scantron_last, scantron_first, moodle_full_name)

    bonus = 0.0

    # check username <-> email prefix matching (strong signal)
    try:
        if scantron_row and moodle_row:
            # consider several possible username/email arrangements
            scantron_username = (
                scantron_row.get("Username")
                or scantron_row.get("username")
                or scantron_row.get("User name")
                or ""
            )
            scantron_email = (
                scantron_row.get("Email address")
                or scantron_row.get("Email")
                or scantron_row.get("email")
                or ""
            )
            moodle_email = (
                moodle_row.get("Email address")
                or moodle_row.get("Email")
                or moodle_row.get("email")
                or ""
            )
            moodle_username = (
                moodle_row.get("Username") or moodle_row.get("username") or ""
            )

            # strong signal: scantron username == moodle email prefix
            if scantron_username and moodle_email:
                email_prefix = moodle_email.split("@", 1)[0]
                if email_prefix and email_prefix.lower() == scantron_username.lower():
                    bonus = 0.45

            # scantron email prefix == moodle username
            if not bonus and scantron_email and moodle_username:
                email_prefix = scantron_email.split("@", 1)[0]
                if email_prefix and email_prefix.lower() == moodle_username.lower():
                    bonus = 0.45

            # both have email addresses: compare prefixes
            if not bonus and scantron_email and moodle_email:
                s_pref = scantron_email.split("@", 1)[0]
                m_pref = moodle_email.split("@", 1)[0]
                if s_pref and m_pref and s_pref.lower() == m_pref.lower():
                    bonus = 0.45
    except Exception:
        bonus = 0.0

    # check exact/full name equality as a moderate boost
    try:
        if moodle_full_name and scantron_first is not None and scantron_last is not None:
            scan_full = build_name_signature(f"{scantron_first} {scantron_last}")
            moodle_sig = build_name_signature(moodle_full_name)
            if scan_full and moodle_sig and scan_full == moodle_sig:
                bonus = max(bonus, 0.25)
    except Exception:
        pass

    score = min(1.0, base + bonus)
    return score


def derive_confidence(top_candidates):
    confidence = "low"
    if top_candidates:
        top_score = top_candidates[0]["score"]
        gap = top_score - (top_candidates[1]["score"] if len(top_candidates) > 1 else 0.0)
        if top_score >= 0.80 and gap >= 0.15:
            confidence = "high"
        elif top_score >= 0.65 and gap >= 0.08:
            confidence = "medium"
    return confidence


def parse_float(value: str):
    try:
        return float((value or "").strip())
    except (TypeError, ValueError):
        return None


def format_number(value: float) -> str:
    text = f"{value:.2f}"
    return text.rstrip("0").rstrip(".")


def load_scantron(scantron_path: Path, id_col: str, grade_col: str):
    print(f"Loading scantron file: {scantron_path}")
    with scantron_path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        headers = reader.fieldnames or []
        # ensure returned headers contain canonical names used elsewhere in the script
        headers_out = list(headers)
        for canon in ["ID", "Lastname", "Firstname", "Grade", "Percentage", "Nbrcorrect", "Username"]:
            if canon not in headers_out:
                headers_out.append(canon)
        # try to locate variant headers (be permissive)
        id_actual = find_best_header(headers, [id_col, "ID number", "Student ID", "StudentID", "id"])
        grade_actual = find_best_header(headers, [grade_col, "Grade", "Score", "Marks", "Score"])
        lastname_actual = find_best_header(headers, ["Lastname", "Last name", "Surname", "Family name"])
        firstname_actual = find_best_header(headers, ["Firstname", "First name", "Givenname", "Given name"])
        full_name_actual = find_best_header(headers, ["Full name", "Fullname", "Display name", "Displayname"])
        percentage_actual = find_best_header(headers, ["Percentage", "Percent", "Pct"])
        nbrcorrect_actual = find_best_header(headers, ["Nbrcorrect", "Nbr correct", "NbrCorrect", "Correct"])
        username_actual = find_best_header(headers, ["Username", "User name", "user", "Login"])
        email_actual = find_best_header(headers, ["Email address", "Email", "E-mail", "E mail", "email"])

        if grade_actual is None and grade_col not in headers:
            # grade is helpful but not strictly fatal; warn
            print(f"Warning: grade column '{grade_col}' not found in {scantron_path}; proceeding without it.")

        by_id = {}
        all_rows = []
        missing_id_entries = []
        duplicate_ids = []
        missing_id_rows = 0
        missing_lastname_rows = 0
        missing_firstname_rows = 0
        total_rows = 0

        for index, row in enumerate(reader, start=2):
            total_rows += 1
            all_rows.append(row)

            # populate canonical keys so the rest of the code can continue to use
            # the original column names like 'ID', 'Lastname', 'Firstname', etc.
            if id_actual:
                row["ID"] = row.get(id_actual, "")
            else:
                row.setdefault("ID", "")

            if lastname_actual:
                row["Lastname"] = row.get(lastname_actual, "")
            else:
                row.setdefault("Lastname", "")

            if firstname_actual:
                row["Firstname"] = row.get(firstname_actual, "")
            else:
                row.setdefault("Firstname", "")

            # if first/last are missing but a Full name column exists, try to split it
            if (not normalize_name(row.get("Firstname", "")) and not normalize_name(row.get("Lastname", ""))) and full_name_actual:
                full = (row.get(full_name_actual, "") or "").strip()
                if full:
                    parts = full.split()
                    if len(parts) == 1:
                        row["Firstname"] = parts[0]
                        row["Lastname"] = ""
                    elif len(parts) == 2:
                        row["Firstname"] = parts[0]
                        row["Lastname"] = parts[1]
                    else:
                        # heuristic: last token as Lastname, rest as Firstname
                        row["Lastname"] = parts[-1]
                        row["Firstname"] = " ".join(parts[:-1])

            if grade_actual:
                row["Grade"] = row.get(grade_actual, "")
            else:
                row.setdefault("Grade", "")

            if username_actual:
                row["Username"] = row.get(username_actual, "")
            else:
                row.setdefault("Username", "")

            if email_actual:
                row["Email address"] = row.get(email_actual, "")
            else:
                row.setdefault("Email address", "")

            if percentage_actual:
                row["Percentage"] = row.get(percentage_actual, "")

            if nbrcorrect_actual:
                row["Nbrcorrect"] = row.get(nbrcorrect_actual, "")

            if not normalize_name(row.get("Lastname", "")):
                missing_lastname_rows += 1
            if not normalize_name(row.get("Firstname", "")):
                missing_firstname_rows += 1

            sid = normalize_id(row.get("ID", ""))
            if not sid:
                missing_id_rows += 1
                missing_id_entries.append(
                    {
                        "line": index,
                        "lastname": (row.get("Lastname", "") or "").strip(),
                        "firstname": (row.get("Firstname", "") or "").strip(),
                        "percentage": (row.get("Percentage", "") or "").strip(),
                        "nbrcorrect": (row.get("Nbrcorrect", "") or "").strip(),
                        "username": (row.get("Username", "") or "").strip(),
                        "email": (row.get("Email address", "") or "").strip(),
                    }
                )
                continue
            if sid in by_id:
                duplicate_ids.append(sid)
            by_id[sid] = row

    return {
        "headers": headers_out,
        "rows_by_id": by_id,
        "all_rows": all_rows,
        "missing_id_entries": missing_id_entries,
        "duplicates": sorted(set(duplicate_ids)),
        "missing_id_rows": missing_id_rows,
        "missing_lastname_rows": missing_lastname_rows,
        "missing_firstname_rows": missing_firstname_rows,
        "total_rows": total_rows,
    }


def choose_grade_index(headers, grade_header: str, occurrence: int) -> int:
    matches = [i for i, name in enumerate(headers) if name == grade_header]
    if not matches:
        raise ValueError(f"Column '{grade_header}' not found in Moodle file")
    if occurrence < 1 or occurrence > len(matches):
        raise ValueError(
            f"Requested {grade_header} occurrence {occurrence}, "
            f"but only {len(matches)} occurrence(s) exist"
        )
    return matches[occurrence - 1]


def locate_teaching_data_root(desired_root: Path) -> Path:
    if desired_root.exists():
        return desired_root

    candidates = [Path.cwd(), Path(__file__).resolve().parent]
    for base in candidates:
        for parent in [base] + list(base.parents):
            candidate = parent / "_data" / "teaching"
            if candidate.exists():
                return candidate

    return desired_root


def update_moodle(
    moodle_path: Path,
    output_path: Path,
    scantron_rows_by_id,
    moodle_id_col: str,
    moodle_grade_col: str,
    moodle_grade_occurrence: int,
    scantron_grade_col: str,
    scale_to_maximum: bool,
    debug_headers: bool = False,
):
    matched_name_checks = []
    use_percentage_scaling = scale_to_maximum and scantron_grade_col.strip().lower() == "percentage"

    print(f"Loading Moodle file: {moodle_path}")
    with moodle_path.open("r", newline="", encoding="utf-8-sig") as source:
        reader = csv.reader(source)
        headers = next(reader)

        # find best header variants for common names
        moodle_id_actual = find_best_header(headers, [moodle_id_col, "ID number", "ID", "Student ID"])
        moodle_grade_actual = find_best_header(headers, [moodle_grade_col, "Grade"])
        max_grade_actual = find_best_header(headers, ["Maximum grade", "Maximumgrade", "Maximum"])
        moodle_full_name_actual = find_best_header(headers, ["Full name", "Fullname", "Display name", "Displayname"])

        moodle_id_index = headers.index(moodle_id_actual) if moodle_id_actual in headers else -1
        if moodle_grade_actual and moodle_grade_actual in headers:
            try:
                moodle_grade_index = choose_grade_index(headers, moodle_grade_actual, moodle_grade_occurrence)
            except ValueError:
                moodle_grade_index = -1
        else:
            moodle_grade_index = -1

        max_grade_index = headers.index(max_grade_actual) if max_grade_actual in headers else -1
        moodle_full_name_index = headers.index(moodle_full_name_actual) if moodle_full_name_actual in headers else -1

        if debug_headers:
            print("Detected Moodle headers:")
            print(f"  moodle_id_actual: {moodle_id_actual} -> index {moodle_id_index}")
            print(f"  moodle_grade_actual: {moodle_grade_actual} -> index {moodle_grade_index}")
            print(f"  max_grade_actual: {max_grade_actual} -> index {max_grade_index}")
            print(f"  moodle_full_name_actual: {moodle_full_name_actual} -> index {moodle_full_name_index}")

        matched = 0
        unmatched_ids = []
        missing_moodle_id = 0
        seen_matched_scantron_ids = set()
        output_rows = [headers]

        for row in reader:
            if len(row) < len(headers):
                row = row + [""] * (len(headers) - len(row))

            mid = normalize_id(row[moodle_id_index]) if moodle_id_index != -1 else ""
            if not mid:
                missing_moodle_id += 1
                output_rows.append(row)
                continue

            scantron_row = scantron_rows_by_id.get(mid)
            if not scantron_row:
                unmatched_ids.append(mid)
                if moodle_grade_index != -1:
                    row[moodle_grade_index] = "0"
                output_rows.append(row)
                continue

            seen_matched_scantron_ids.add(mid)
            matched += 1
            scantron_grade_raw = (scantron_row.get(scantron_grade_col) or "").strip()

            if moodle_full_name_index != -1:
                moodle_full_name = row[moodle_full_name_index]
                name_check = compute_name_match(
                    scantron_row.get("Lastname", ""),
                    scantron_row.get("Firstname", ""),
                    moodle_full_name,
                )
                matched_name_checks.append(
                    {
                        "id": mid,
                        "scantron_lastname": (scantron_row.get("Lastname", "") or "").strip(),
                        "scantron_firstname": (scantron_row.get("Firstname", "") or "").strip(),
                        "moodle_full_name": moodle_full_name,
                        **name_check,
                    }
                )

            if use_percentage_scaling:
                pct = parse_float(scantron_row.get("Percentage", ""))
                max_grade = parse_float(row[max_grade_index]) if max_grade_index != -1 else None
                if pct is not None and max_grade is not None:
                    scaled = (pct / 100.0) * max_grade
                    if moodle_grade_index != -1:
                        row[moodle_grade_index] = format_number(scaled)
                else:
                    if moodle_grade_index != -1:
                        row[moodle_grade_index] = scantron_grade_raw
            else:
                if moodle_grade_index != -1:
                    row[moodle_grade_index] = scantron_grade_raw

            output_rows.append(row)

    with output_path.open("w", newline="", encoding="utf-8") as target:
        writer = csv.writer(target)
        writer.writerows(output_rows)

    unmatched_scantron_ids = sorted(set(scantron_rows_by_id) - seen_matched_scantron_ids)

    return {
        "matched": matched,
        "matched_moodle_ids": sorted(seen_matched_scantron_ids),
        "unmatched_moodle_ids": unmatched_ids,
        "unmatched_scantron_ids": unmatched_scantron_ids,
        "missing_moodle_id_rows": missing_moodle_id,
        "total_moodle_rows": len(output_rows) - 1,
        "matched_name_checks": matched_name_checks,
    }


def load_moodle_directory(moodle_path: Path, moodle_id_col: str):
    with moodle_path.open("r", newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        headers = reader.fieldnames or []
        # locate likely header variants and populate canonical keys
        moodle_id_actual = find_best_header(headers, [moodle_id_col, "ID number", "ID", "Student ID"])
        moodle_full_name_actual = find_best_header(headers, ["Full name", "Fullname", "Display name", "Displayname"])

        by_id = {}
        all_rows = []
        for row in reader:
            # ensure canonical keys exist for compatibility with the rest of the script
            if moodle_id_actual and moodle_id_actual in row:
                row["ID number"] = row.get(moodle_id_actual, "")
            else:
                row.setdefault("ID number", "")

            if moodle_full_name_actual and moodle_full_name_actual in row:
                row["Full name"] = row.get(moodle_full_name_actual, "")
            else:
                row.setdefault("Full name", "")

            all_rows.append(row)
            mid = normalize_id(row.get("ID number", ""))
            if mid:
                by_id[mid] = row

    return {"rows_by_id": by_id, "rows": all_rows}


def verify_missing_scantron_id_identities(
    scantron_missing_id_entries,
    moodle_rows,
    excluded_moodle_ids,
):
    suggestions = []
    excluded_ids = set(excluded_moodle_ids)

    for entry in scantron_missing_id_entries:
        last = entry["lastname"]
        first = entry["firstname"]
        scored_candidates = []

        for moodle_row in moodle_rows:
            moodle_name = moodle_row.get("Full name", "")
            moodle_id = normalize_id(moodle_row.get("ID number", ""))
            if moodle_id and moodle_id in excluded_ids:
                continue
            # build a lightweight scantron-like row from entry to allow username matching
            scan_row_like = {
                "Firstname": entry.get("firstname", ""),
                "Lastname": entry.get("lastname", ""),
                "Username": entry.get("username", ""),
                "Email address": entry.get("email", ""),
            }
            score = score_identity_candidate_extended(last, first, moodle_name, scantron_row=scan_row_like, moodle_row=moodle_row)
            if score >= 0.45:
                scored_candidates.append(
                    {
                        "score": score,
                        "moodle_id": moodle_id,
                        "moodle_name": moodle_name,
                        "moodle_email": (moodle_row.get("Email address") or moodle_row.get("Email") or "").strip(),
                        "moodle_username": (moodle_row.get("Username") or moodle_row.get("username") or "").strip(),
                    }
                )

        scored_candidates.sort(key=lambda item: item["score"], reverse=True)
        top_candidates = scored_candidates[:3]

        confidence = derive_confidence(top_candidates)

        suggestions.append(
            {
                **entry,
                "candidates": top_candidates,
                "confidence": confidence,
            }
        )

    return suggestions


def suggest_corrections_for_unmatched_scantron_ids(
    unmatched_scantron_ids,
    scantron_rows_by_id,
    moodle_rows,
    unmatched_moodle_ids,
):
    unmatched_moodle_set = set(unmatched_moodle_ids)
    moodle_unmatched_rows = [
        row
        for row in moodle_rows
        if normalize_id(row.get("ID number", "")) in unmatched_moodle_set
    ]

    suggestions = []
    for sid in unmatched_scantron_ids:
        scantron_row = scantron_rows_by_id.get(sid, {})
        last = (scantron_row.get("Lastname", "") or "").strip()
        first = (scantron_row.get("Firstname", "") or "").strip()

        scored_candidates = []
        for moodle_row in moodle_unmatched_rows:
            moodle_name = moodle_row.get("Full name", "")
            moodle_id = normalize_id(moodle_row.get("ID number", ""))
            score = score_identity_candidate_extended(last, first, moodle_name, scantron_row=scantron_row, moodle_row=moodle_row)
            if score >= 0.45:
                scored_candidates.append(
                    {
                        "score": score,
                        "moodle_id": moodle_id,
                        "moodle_name": moodle_name,
                        "moodle_email": (moodle_row.get("Email address") or moodle_row.get("Email") or "").strip(),
                        "moodle_username": (moodle_row.get("Username") or moodle_row.get("username") or "").strip(),
                    }
                )

        scored_candidates.sort(key=lambda item: item["score"], reverse=True)
        top_candidates = scored_candidates[:3]
        confidence = derive_confidence(top_candidates)

        suggestions.append(
            {
                "scantron_id": sid,
                "scantron_firstname": first,
                "scantron_lastname": last,
                "candidates": top_candidates,
                "confidence": confidence,
            }
        )

    return suggestions


def build_default_report_path(moodle_path: Path) -> Path:
    return moodle_path.with_name(f"{moodle_path.stem}.identity-report.txt")


def build_default_cleaned_scantron_path(scantron_path: Path) -> Path:
    return scantron_path.with_name(f"{scantron_path.stem}.cleaned.csv")


def write_cleaned_scantron(
    scantron_data,
    cleaned_output_path: Path,
    scantron_id_col: str,
    missing_id_identity_suggestions,
    unmatched_scantron_corrections,
    prompt_medium_confidence: bool,
    auto_accept_medium: bool = False,
):
    cleaned_rows = [dict(row) for row in scantron_data["all_rows"]]
    updates_from_missing_id = 0
    updates_from_unmatched_id = 0
    interactive_enabled = prompt_medium_confidence and sys.stdin.isatty()

    def should_apply(correction_type: str, label: str, confidence: str, candidate) -> bool:
        if confidence == "high":
            return True
        if confidence != "medium":
            return False
        # if configured to auto-accept medium-confidence suggestions, do so
        if auto_accept_medium:
            return True
        if not interactive_enabled:
            return False
        print()
        print(f"Medium-confidence {correction_type} suggestion:")
        print(f"  {label}")

        # Print scantron-side details if present in the label or candidate
        scan_first = None
        scan_last = None
        scan_user = None
        try:
            # label often contains Firstname/Lastname for missing-ID suggestions
            # fallback to candidate info passed in by caller
            scan_first = candidate.get("scantron_firstname") if isinstance(candidate, dict) else None
            scan_last = candidate.get("scantron_lastname") if isinstance(candidate, dict) else None
            scan_user = candidate.get("scantron_username") if isinstance(candidate, dict) else None
        except Exception:
            scan_first = scan_last = scan_user = None

        if scan_first or scan_last or scan_user:
            print("  Scantron:")
            if scan_first is not None:
                print(f"    First name: {scan_first}")
            if scan_last is not None:
                print(f"    Last name: {scan_last}")
            if scan_user:
                print(f"    Username: {scan_user}")

        # Print Moodle-side details from the candidate
        moodle_id = candidate.get("moodle_id", "")
        moodle_name = candidate.get("moodle_name", "")
        moodle_email = candidate.get("moodle_email", "")
        moodle_user = candidate.get("moodle_username", "")
        print("  Moodle:")
        print(f"    ID: {moodle_id}")
        print(f"    Full name: {moodle_name}")
        if moodle_email:
            print(f"    Email: {moodle_email}")
        if moodle_user:
            print(f"    Username: {moodle_user}")

        print(f"  suggested ID {moodle_id} | {moodle_name} (score={candidate['score']:.3f})")
        while True:
            response = input("Apply this correction? [y/N]: ").strip().lower()
            if response in {"y", "yes"}:
                return True
            if response in {"", "n", "no"}:
                return False
            print("Please enter 'y' or 'n'.")

    for suggestion in missing_id_identity_suggestions:
        if not suggestion.get("candidates"):
            continue

        confidence = suggestion.get("confidence", "low")
        candidate = suggestion["candidates"][0]
        label = (
            f"line {suggestion['line']} "
            f"Firstname='{suggestion['firstname']}', Lastname='{suggestion['lastname']}'"
        )
        if not should_apply("missing-ID", label, confidence, candidate):
            continue

        row_index = suggestion["line"] - 2
        if row_index < 0 or row_index >= len(cleaned_rows):
            continue

        row = cleaned_rows[row_index]
        current_id = normalize_id(row.get(scantron_id_col, ""))
        if current_id:
            continue

        corrected_id = candidate["moodle_id"]
        if not corrected_id:
            continue

        row[scantron_id_col] = corrected_id
        updates_from_missing_id += 1

    for correction in unmatched_scantron_corrections:
        if not correction.get("candidates"):
            continue

        confidence = correction.get("confidence", "low")
        candidate = correction["candidates"][0]
        scantron_full_name = (
            f"{correction.get('scantron_firstname', '')} "
            f"{correction.get('scantron_lastname', '')}"
        ).strip()
        label = (
            f"scantron ID {correction.get('scantron_id', '')} "
            f"for '{scantron_full_name}'"
        )
        if not should_apply("unmatched-ID", label, confidence, candidate):
            continue

        old_id = normalize_id(correction.get("scantron_id", ""))
        new_id = normalize_id(candidate.get("moodle_id", ""))
        if not old_id or not new_id:
            continue
        if old_id == new_id:
            continue

        for row in cleaned_rows:
            if normalize_id(row.get(scantron_id_col, "")) == old_id:
                row[scantron_id_col] = new_id
                updates_from_unmatched_id += 1

    with cleaned_output_path.open("w", newline="", encoding="utf-8") as handle:
        # ensure fieldnames include any extra keys that may have been added
        original_fieldnames = list(scantron_data.get("headers", []) or [])
        extra_fields = []
        seen = set(original_fieldnames)
        for row in cleaned_rows:
            for k in row.keys():
                if k not in seen and k is not None:
                    extra_fields.append(k)
                    seen.add(k)

        final_fieldnames = original_fieldnames + extra_fields
        writer = csv.DictWriter(handle, fieldnames=final_fieldnames)
        writer.writeheader()
        writer.writerows(cleaned_rows)

    return {
        "path": cleaned_output_path,
        "updated_missing_id_rows": updates_from_missing_id,
        "updated_unmatched_id_rows": updates_from_unmatched_id,
        "total_updates": updates_from_missing_id + updates_from_unmatched_id,
    }


def write_report(report_path: Path, scantron_data, moodle_result, missing_id_identity_suggestions):
    name_checks = moodle_result["matched_name_checks"]
    full_name_mismatch = [item for item in name_checks if not item["full_match"]]
    missing_last_among_matches = [item for item in name_checks if not item["scantron_lastname"].strip()]
    missing_first_among_matches = [item for item in name_checks if not item["scantron_firstname"].strip()]

    lines = []
    lines.append("Scantron <> Moodle identity quality report")
    lines.append("=" * 45)
    lines.append("")
    lines.append("Summary")
    lines.append("-------")
    lines.append(f"Scantron total rows: {scantron_data['total_rows']}")
    lines.append(f"Scantron rows missing ID: {scantron_data['missing_id_rows']}")
    lines.append(f"Scantron rows missing Lastname: {scantron_data['missing_lastname_rows']}")
    lines.append(f"Scantron rows missing Firstname: {scantron_data['missing_firstname_rows']}")
    lines.append(f"Moodle rows matched by ID: {moodle_result['matched']}")
    lines.append(f"Moodle IDs without scantron match: {len(set(moodle_result['unmatched_moodle_ids']))}")
    lines.append(f"Scantron IDs without moodle match: {len(moodle_result['unmatched_scantron_ids'])}")
    lines.append(f"Matched-ID rows with name mismatch: {len(full_name_mismatch)}")
    lines.append("")

    lines.append("Moodle IDs without Scantron match (details)")
    lines.append("-----------------------------------------")
    unmatched_moodle_details = moodle_result.get("unmatched_moodle_details", [])
    if not unmatched_moodle_details:
        lines.append("None")
    else:
        for item in unmatched_moodle_details:
            lines.append(f"{item['id']} | {item['full_name']}")
    lines.append("")

    lines.append("Scantron IDs without Moodle match (details)")
    lines.append("-----------------------------------------")
    correction_suggestions = {
        item["scantron_id"]: item
        for item in moodle_result.get("unmatched_scantron_corrections", [])
    }
    if not moodle_result["unmatched_scantron_ids"]:
        lines.append("None")
    else:
        for sid in moodle_result["unmatched_scantron_ids"]:
            scantron_row = scantron_data["rows_by_id"].get(sid, {})
            first = (scantron_row.get("Firstname", "") or "").strip()
            last = (scantron_row.get("Lastname", "") or "").strip()
            full_name = f"{first} {last}".strip()
            correction = correction_suggestions.get(sid)
            top = correction["candidates"][0] if correction and correction["candidates"] else None
            if full_name:
                if top:
                    lines.append(
                        (
                            f"{sid} | {full_name} | suggested Moodle ID {top['moodle_id']} "
                            f"({top['moodle_name']}, score={top['score']:.3f}, confidence={correction['confidence']})"
                        )
                    )
                else:
                    lines.append(f"{sid} | {full_name}")
            else:
                lines.append(f"{sid} | (name missing)")
    lines.append("")

    lines.append("Scantron rows with missing ID (identity verification attempt)")
    lines.append("-----------------------------------------------------------")
    if not missing_id_identity_suggestions:
        lines.append("None")
    else:
        for entry in missing_id_identity_suggestions:
            label = f"line {entry['line']}: Firstname='{entry['firstname']}', Lastname='{entry['lastname']}'"
            lines.append(label)
            if not entry["candidates"]:
                lines.append("  no plausible Moodle candidate found")
                continue
            lines.append(f"  confidence: {entry['confidence']}")
            for rank, candidate in enumerate(entry["candidates"], start=1):
                lines.append(
                    f"  {rank}. ID {candidate['moodle_id']} | {candidate['moodle_name']} | score {candidate['score']:.3f}"
                )
    lines.append("")

    lines.append("Matched IDs with name mismatch")
    lines.append("------------------------------")
    if not full_name_mismatch:
        lines.append("None")
    else:
        for item in full_name_mismatch:
            lines.append(
                (
                    f"ID {item['id']}: scantron='{item['scantron_firstname']} {item['scantron_lastname']}' "
                    f"vs moodle='{item['moodle_full_name']}' "
                    f"(first={item['first_similarity']:.3f}, last={item['last_similarity']:.3f}, full={item['full_similarity']:.3f})"
                )
            )
    lines.append("")

    lines.append("Matched IDs with missing scantron name parts")
    lines.append("-------------------------------------------")
    if not missing_last_among_matches and not missing_first_among_matches:
        lines.append("None")
    else:
        if missing_last_among_matches:
            lines.append("Missing Lastname:")
            for item in missing_last_among_matches:
                lines.append(f"  ID {item['id']} | Firstname='{item['scantron_firstname']}' | Moodle='{item['moodle_full_name']}'")
        if missing_first_among_matches:
            lines.append("Missing Firstname:")
            for item in missing_first_among_matches:
                lines.append(f"  ID {item['id']} | Lastname='{item['scantron_lastname']}' | Moodle='{item['moodle_full_name']}'")
    lines.append("")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_default_output_path(moodle_path: Path) -> Path:
    return moodle_path.with_name(f"{moodle_path.stem}.matched.csv")


def resolve_csv_path(raw_path: Path, data_root: Path, course: str, semester: str) -> Path:
    if raw_path.exists():
        return raw_path

    if course and semester:
        candidate = data_root / course / semester / "SCANTRON" / raw_path.name
        if candidate.exists():
            return candidate

    return raw_path


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Match scantron exam grades to Moodle worksheet rows by student ID. "
            "Writes an updated Moodle CSV with matched grades."
        )
    )
    parser.add_argument(
        "scantron_csv",
        nargs="?",
        type=Path,
        default=Path("scantron.csv"),
        help="Path to scantron.csv (default: scantron.csv)",
    )
    parser.add_argument(
        "moodle_csv",
        nargs="?",
        type=Path,
        default=Path("moodle-grades.csv"),
        help="Path to moodle-grades.csv (default: moodle-grades.csv)",
    )
    parser.add_argument(
        "--course",
        default=None,
        help="Course code used to locate files under _data/teaching/<course>/<semester>/SCANTRON",
    )
    parser.add_argument(
        "--semester",
        default=None,
        help="Semester code used to locate files under _data/teaching/<course>/<semester>/SCANTRON",
    )
    parser.add_argument(
        "--teaching-data-root",
        type=Path,
        default=Path("_data/teaching"),
        help="Root for course data lookup (default: _data/teaching)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Output CSV path (default: <moodle filename>.matched.csv)",
    )
    parser.add_argument(
        "--scantron-id-col",
        default="ID",
        help="ID column in scantron CSV (default: ID)",
    )
    parser.add_argument(
        "--scantron-grade-col",
        default="Grade",
        help="Grade column from scantron CSV to write into Moodle Grade (default: Grade)",
    )
    parser.add_argument(
        "--moodle-id-col",
        default="ID number",
        help="ID column in Moodle CSV (default: ID number)",
    )
    parser.add_argument(
        "--moodle-grade-col",
        default="Grade",
        help="Grade column header in Moodle CSV (default: Grade)",
    )
    parser.add_argument(
        "--moodle-grade-occurrence",
        type=int,
        default=1,
        help=(
            "When Moodle has duplicate Grade headers, pick which one to write "
            "(1-based, default: 1)"
        ),
    )
    parser.add_argument(
        "--scale-to-maximum",
        action="store_true",
        help=(
            "If scantron grade is Percentage, scale it to Moodle Maximum grade before writing"
        ),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Identity/missing-data report path (default: <moodle filename>.identity-report.txt)",
    )
    parser.add_argument(
        "--apply-cleaned",
        action="store_true",
        help="Run interactive cleaning first and then re-run update to apply cleaned IDs into Moodle output",
    )
    parser.add_argument(
        "--debug-headers",
        action="store_true",
        help="Print which Moodle headers were detected (debug)",
    )
    parser.add_argument(
        "--auto-accept-medium",
        action="store_true",
        help="Automatically accept medium-confidence identity suggestions (non-interactive)",
    )
    parser.add_argument(
        "--cleaned-scantron-output",
        type=Path,
        default=None,
        help="Cleaned scantron CSV path (default: <scantron filename>.cleaned.csv)",
    )
    parser.add_argument(
        "--no-prompt-medium",
        action="store_true",
        help="Do not prompt for medium-confidence corrections; apply only high-confidence ones",
    )

    args = parser.parse_args()

    if args.scale_to_maximum and args.scantron_grade_col.strip().lower() != "percentage":
        print(
            "Note: --scale-to-maximum ignored because --scantron-grade-col is not 'Percentage'; "
            "copying scantron grade values directly."
        )

    data_root = locate_teaching_data_root(args.teaching_data_root)
    resolved_scantron_csv = resolve_csv_path(
        raw_path=args.scantron_csv,
        data_root=data_root,
        course=args.course,
        semester=args.semester,
    )
    print(f"Resolved scantron CSV path: {resolved_scantron_csv}")
    resolved_moodle_csv = resolve_csv_path(
        raw_path=args.moodle_csv,
        data_root=data_root,
        course=args.course,
        semester=args.semester,
    )
    print(f"Resolved Moodle CSV path: {resolved_moodle_csv}")   
    

    if not resolved_scantron_csv.exists() or not resolved_moodle_csv.exists():
        missing = []
        if not resolved_scantron_csv.exists():
            missing.append(str(resolved_scantron_csv))
        if not resolved_moodle_csv.exists():
            missing.append(str(resolved_moodle_csv))
        parser.error(
            "Input file(s) not found: "
            + ", ".join(missing)
            + ". Use full paths or provide --course and --semester."
        )

    output_path = args.output or build_default_output_path(resolved_moodle_csv)
    report_path = args.report or build_default_report_path(resolved_moodle_csv)
    cleaned_scantron_path = args.cleaned_scantron_output or build_default_cleaned_scantron_path(resolved_scantron_csv)

    moodle_directory = load_moodle_directory(resolved_moodle_csv, args.moodle_id_col)

    scantron_data = load_scantron(
        resolved_scantron_csv,
        id_col=args.scantron_id_col,
        grade_col=args.scantron_grade_col,
    )

    moodle_result = update_moodle(
        moodle_path=resolved_moodle_csv,
        output_path=output_path,
        scantron_rows_by_id=scantron_data["rows_by_id"],
        moodle_id_col=args.moodle_id_col,
        moodle_grade_col=args.moodle_grade_col,
        moodle_grade_occurrence=args.moodle_grade_occurrence,
        scantron_grade_col=args.scantron_grade_col,
        scale_to_maximum=args.scale_to_maximum,
        debug_headers=args.debug_headers,
    )

    missing_id_identity_suggestions = verify_missing_scantron_id_identities(
        scantron_data["missing_id_entries"],
        moodle_directory["rows"],
        moodle_result["matched_moodle_ids"],
    )

    unmatched_moodle_details = []
    unique_unmatched_moodle_ids = sorted(set(moodle_result["unmatched_moodle_ids"]))
    for mid in unique_unmatched_moodle_ids:
        row = moodle_directory["rows_by_id"].get(mid, {})
        unmatched_moodle_details.append(
            {
                "id": mid,
                "full_name": row.get("Full name", "").strip() or "(name not found)",
            }
        )
    moodle_result["unmatched_moodle_details"] = unmatched_moodle_details

    unmatched_scantron_corrections = suggest_corrections_for_unmatched_scantron_ids(
        unmatched_scantron_ids=moodle_result["unmatched_scantron_ids"],
        scantron_rows_by_id=scantron_data["rows_by_id"],
        moodle_rows=moodle_directory["rows"],
        unmatched_moodle_ids=unique_unmatched_moodle_ids,
    )
    moodle_result["unmatched_scantron_corrections"] = unmatched_scantron_corrections

    cleaned_result = write_cleaned_scantron(
        scantron_data=scantron_data,
        cleaned_output_path=cleaned_scantron_path,
        scantron_id_col=args.scantron_id_col,
        missing_id_identity_suggestions=missing_id_identity_suggestions,
        unmatched_scantron_corrections=unmatched_scantron_corrections,
        prompt_medium_confidence=not args.no_prompt_medium,
        auto_accept_medium=args.auto_accept_medium,
    )

    # If requested, re-run update_moodle using the cleaned scantron so accepted
    # corrections are actually applied into the matched Moodle output.
    if args.apply_cleaned:
        print("Re-running update using cleaned scantron to apply accepted corrections...")
        reloaded_scantron = load_scantron(
            cleaned_result["path"],
            id_col=args.scantron_id_col,
            grade_col=args.scantron_grade_col,
        )
        moodle_result = update_moodle(
            moodle_path=resolved_moodle_csv,
            output_path=output_path,
            scantron_rows_by_id=reloaded_scantron["rows_by_id"],
            moodle_id_col=args.moodle_id_col,
            moodle_grade_col=args.moodle_grade_col,
            moodle_grade_occurrence=args.moodle_grade_occurrence,
            scantron_grade_col=args.scantron_grade_col,
            scale_to_maximum=args.scale_to_maximum,
            debug_headers=args.debug_headers,
        )

    write_report(
        report_path=report_path,
        scantron_data=scantron_data,
        moodle_result=moodle_result,
        missing_id_identity_suggestions=missing_id_identity_suggestions,
    )

    print(f"Wrote: {output_path}")
    print(f"Wrote report: {report_path}")
    print(f"Wrote cleaned scantron: {cleaned_result['path']}")
    print(
        "Cleaned scantron high-confidence ID updates:",
        cleaned_result["total_updates"],
        f"(missing-ID rows: {cleaned_result['updated_missing_id_rows']}, unmatched-ID rows: {cleaned_result['updated_unmatched_id_rows']})",
    )
    print(
        "Matched Moodle rows:",
        moodle_result["matched"],
        "/",
        moodle_result["total_moodle_rows"],
    )
    print("Moodle rows missing ID number:", moodle_result["missing_moodle_id_rows"])
    print("Scantron rows missing ID:", scantron_data["missing_id_rows"])
    print("Scantron rows missing Lastname:", scantron_data["missing_lastname_rows"])
    print("Scantron rows missing Firstname:", scantron_data["missing_firstname_rows"])

    name_mismatch_count = sum(
        1 for item in moodle_result["matched_name_checks"] if not item["full_match"]
    )
    print("Matched ID rows with name mismatch:", name_mismatch_count)

    if missing_id_identity_suggestions:
        print("Missing scantron ID identity attempts:")
        for entry in missing_id_identity_suggestions:
            preview = (
                f"line {entry['line']} "
                f"({entry['firstname']} {entry['lastname']})"
            )
            if not entry["candidates"]:
                print(f"  - {preview}: no candidate")
                continue
            top = entry["candidates"][0]
            print(
                f"  - {preview}: top candidate {top['moodle_id']} "
                f"{top['moodle_name']} (score={top['score']:.3f}, confidence={entry['confidence']})"
            )

    if scantron_data["duplicates"]:
        print("Duplicate scantron IDs (last row kept):", ", ".join(scantron_data["duplicates"]))

    if moodle_result["unmatched_moodle_ids"]:
        print(
            "Moodle IDs with no scantron match:",
            ", ".join(sorted(set(moodle_result["unmatched_moodle_ids"]))),
        )

    if moodle_result["unmatched_scantron_ids"]:
        print(
            "Scantron IDs with no Moodle match:",
            ", ".join(moodle_result["unmatched_scantron_ids"]),
        )


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""Set/add values to a specified CSV column from the command line.

Usage examples:
  # set the column 'file' to 'TBD' for all rows, write in-place
  python3 script/add_csv_column_values.py data.csv -c file -v TBD --inplace

  # set column 'status' to 'done' only for rows where 'id' == 42
  python3 script/add_csv_column_values.py data.csv -c status -v done -m id -M 42 -o new.csv

Options:
  -c/--column       Column name to set (created if missing)
  -v/--value        Value to write into the column (required)
  -m/--match-column Column used to select rows (optional)
  -M/--match-value  Value to match in --match-column (required when -m used)
  --only-empty      Only set value when the target cell is empty
  --inplace         Overwrite the original file (backup saved as .bak)
  -o/--output       Path to output file (defaults to stdout when not --inplace)
"""
import argparse
import csv
import sys
import os

# site constants to support course/semester shorthand like other scripts
SITE_DIR = '/Users/hepting/Sites/dhhepting.github.io/'
DATA_ROOT = SITE_DIR + '_data/teaching/'


def parse_args():
    p = argparse.ArgumentParser(description='Set/add values to a CSV column.')
    p.add_argument('csvfile', help='CSV file to modify or course/semester shorthand (e.g. CS-280/202610)')
    p.add_argument('subpath', nargs='?', help='Optional filename within the course/semester directory (e.g. meetings.csv)')
    p.add_argument('-c', '--column', required=True, help='Target column name')
    p.add_argument('-v', '--value', help='Value to write into the column')
    p.add_argument('-m', '--match-column', help='Column to match for selective update')
    p.add_argument('-M', '--match-value', help='Value to match in the match-column')
    p.add_argument('--only-empty', action='store_true', help='Only set when target cell is empty')
    p.add_argument('--inplace', action='store_true', help='Modify file in-place (saves backup as .bak)')
    p.add_argument('--increment', action='store_true', help='Treat --value as start and increment for subsequent selected empty cells')
    p.add_argument('--start-row', type=int, default=1, help='1-based index within selected rows to place the start value (default 1)')
    p.add_argument('-o', '--output', help='Output CSV path (if not provided and not --inplace writes to stdout)')
    p.add_argument('--values-file', help='Path to a file with one value per line to assign sequentially to rows (blank lines = no assignment)')
    p.add_argument('--values-file-blank-assign', action='store_true', help='Treat blank lines in --values-file as explicit empty assignments (overwrite existing cell with empty string)')
    p.add_argument('--export-file', help='Export the specified column to a file: first line is the header, subsequent lines are values for each row')
    p.add_argument('--preview', action='store_true', help='Show resulting CSV to stdout instead of writing files (no in-place changes)')
    p.add_argument('--fix-shifted', action='store_true', help='Attempt to fix rows with shifted/mismatched columns (repair field counts)')
    return p.parse_args()


def read_csv(path):
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        for r in rows:
            print(len(r),r)
            if len(r) != len(reader.fieldnames):
                print('MISMATCH:', r)
        fieldnames = list(reader.fieldnames) if reader.fieldnames else []
    return rows, fieldnames


def write_csv(path, rows, fieldnames):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)


def main():
    args = parse_args()

    if args.match_column and args.match_value is None:
        print('When using --match-column you must also provide --match-value', file=sys.stderr)
        sys.exit(2)

    # Allow course/semester shorthand in place of a full path
    csvpath = args.csvfile
    shorthand_parts = None
    course_dir = None
    if '/' in args.csvfile and not os.path.isfile(args.csvfile):
        parts = args.csvfile.split('/')
        if len(parts) == 2:
            shorthand_parts = parts
            jcrs = parts[0].replace('+', '_')
            semester = parts[1]
            filename = args.subpath if args.subpath else 'meetings.csv'
            course_dir = os.path.join(DATA_ROOT, jcrs, semester)
            csvpath = os.path.join(course_dir, filename)

    if not os.path.isfile(csvpath):
        print('CSV file not found:', csvpath, file=sys.stderr)
        sys.exit(2)

    # optionally attempt to fix shifted rows before reading
    def repair_csv_rows(path):
        fixed = []
        with open(path, newline='', encoding='utf-8') as fh:
            reader = csv.reader(fh)
            all_rows = list(reader)
        if not all_rows:
            return [], []
        header = all_rows[0]
        fixed.append(header)
        changed = False
        for row in all_rows[1:]:
            orig_len = len(row)
            # trim trailing empty fields
            while len(row) > len(header) and row and row[-1] == '':
                row.pop()
            # if still too many, collapse extras into last column
            if len(row) > len(header):
                row = row[:len(header)-1] + [','.join(row[len(header)-1:])]
            # if too few, pad with empties
            if len(row) < len(header):
                row = row + [''] * (len(header) - len(row))
            if len(row) != orig_len:
                changed = True
            fixed.append(row)
        return fixed, changed

    if args.fix_shifted:
        fixed_rows, changed = repair_csv_rows(csvpath)
        if changed:
            # if preview, print fixed CSV and exit
            if args.preview:
                w = csv.writer(sys.stdout)
                for r in fixed_rows:
                    w.writerow(r)
                print('\n(Preview mode: no files modified)', file=sys.stderr)
                sys.exit(0)
            # if inplace, backup original and write fixed
            if args.inplace:
                bak = csvpath + '.bak'
                try:
                    os.replace(csvpath, bak)
                except Exception:
                    import shutil
                    shutil.copy2(csvpath, bak)
                with open(csvpath, 'w', newline='', encoding='utf-8') as fh:
                    writer = csv.writer(fh)
                    for r in fixed_rows:
                        writer.writerow(r)
                print('Fixed CSV written to', csvpath, '(backup at', bak + ')')
            else:
                # write fixed to a temp file and read from it
                import tempfile
                tf = tempfile.NamedTemporaryFile(mode='w', delete=False, newline='', encoding='utf-8')
                with tf as fh:
                    writer = csv.writer(fh)
                    for r in fixed_rows:
                        writer.writerow(r)
                csvpath = tf.name
        # else not changed -> continue with original csvpath

    rows, fieldnames = read_csv(csvpath)

    # sanitize rows: remove any extra-field lists stored under the None key by csv.DictReader
    for idx, row in enumerate(rows, start=1):
        if None in row:
            extras = row.pop(None)
            # warn if extras contain non-empty values
            if any(str(x).strip() for x in extras):
                print(f'Warning: row {idx} in {csvpath} has extra unnamed fields {extras}; these will be ignored', file=sys.stderr)

    # warn if requested column doesn't exist in the CSV header
    if args.column not in fieldnames:
        print(f'Warning: column "{args.column}" not found in {csvpath}; it will be created when writing output.', file=sys.stderr)

    # If action requires a value (and none provided), error unless exporting
    if not args.export_file and not args.values_file and not args.increment and args.value is None:
        print('Either -v/--value or --values-file or --increment or --export-file must be provided', file=sys.stderr)
        sys.exit(2)

    # export column if requested
    if args.export_file:
        # resolve export path relative to course dir when shorthand used and user passed a simple filename
        export_path = args.export_file
        if course_dir and not os.path.isabs(export_path) and os.path.dirname(export_path) == '':
            export_path = os.path.join(course_dir, export_path)

        # ensure export dir exists
        os.makedirs(os.path.dirname(export_path) or '.', exist_ok=True)

        # write header then each row's value (empty if missing)
        with open(export_path, 'w', encoding='utf-8') as ef:
            ef.write(args.column + '\n')
            for r in rows:
                ef.write((r.get(args.column) or '') + '\n')
        print('Exported column', args.column, 'to', export_path)
        sys.exit(0)

    # ensure target column present
    if args.column not in fieldnames:
        fieldnames.append(args.column)

    # apply updates
    if args.values_file:
        if args.value:
            # both provided; prefer values-file
            print('Warning: --value ignored when --values-file is provided', file=sys.stderr)

        # read values lines (preserve blank lines as no-assignment markers)
        values_path = args.values_file
        # if shorthand was used and values_file doesn't exist, try inside the course/semester dir
        if shorthand_parts and not os.path.isfile(values_path):
            alt = os.path.join(DATA_ROOT, shorthand_parts[0].replace('+', '_'), shorthand_parts[1], values_path)
            if os.path.isfile(alt):
                values_path = alt

        if not os.path.isfile(values_path):
            print('Values file not found:', values_path, file=sys.stderr)
            sys.exit(2)
        with open(values_path, 'r', encoding='utf-8') as vf:
            vals = [line.rstrip('\n') for line in vf]

        # If the first line is the column header, drop it (export format)
        if vals and vals[0].strip() == args.column:
            vals = vals[1:]

        # ensure target column present
        if args.column not in fieldnames:
            fieldnames.append(args.column)

        start_idx = max(0, args.start_row - 1)
        remaining = len(rows) - start_idx
        if len(vals) < remaining:
            print(f'Warning: values file has fewer lines ({len(vals)}) than rows to fill ({remaining})', file=sys.stderr)
        if len(vals) > remaining:
            print(f'Warning: values file has more lines ({len(vals)}) than rows to fill ({remaining}); extra values will be ignored', file=sys.stderr)

        for i, v in enumerate(vals):
            target = start_idx + i
            if target >= len(rows):
                break
            if v == '':
                # blank line: either explicit empty assignment or skip
                if args.values_file_blank_assign:
                    rows[target][args.column] = ''
                else:
                    continue
            else:
                rows[target][args.column] = v

    elif args.increment:
        # Build list of indices of rows to operate on (respecting match-column)
        if args.match_column:
            selected_indices = [i for i, r in enumerate(rows) if r.get(args.match_column, '') == args.match_value]
        else:
            selected_indices = list(range(len(rows)))

        if not selected_indices:
            print('No rows match selection criteria; nothing to do.', file=sys.stderr)
            sys.exit(0)

        # validate start-row
        start_idx_in_selected = max(0, args.start_row - 1)
        if start_idx_in_selected >= len(selected_indices):
            print(f'--start-row {args.start_row} out of range for {len(selected_indices)} selected rows', file=sys.stderr)
            sys.exit(2)

        # prepare incrementer
        start_value = args.value

        def is_integer(s):
            try:
                int(s)
                return True
            except Exception:
                return False

        def alpha_to_num(s):
            # Convert letters like A, Z, AA to 1-based number
            s = s.upper()
            n = 0
            for ch in s:
                if not ('A' <= ch <= 'Z'):
                    raise ValueError('Not an alpha sequence')
                n = n * 26 + (ord(ch) - ord('A') + 1)
            return n

        def num_to_alpha(n):
            # Convert 1-based number to letters (1 -> A)
            if n <= 0:
                raise ValueError('alpha sequence must be positive')
            s = ''
            while n > 0:
                n, rem = divmod(n - 1, 26)
                s = chr(ord('A') + rem) + s
            return s

        if is_integer(start_value):
            mode = 'numeric'
            current_num = int(start_value)

            def next_value():
                nonlocal current_num
                v = str(current_num)
                current_num += 1
                return v

            # advance so the first call to next_value() returns start_value+1
            current_num += 1
        else:
            # try alpha
            try:
                current_num = alpha_to_num(start_value)
                mode = 'alpha'

                def next_value():
                    nonlocal current_num
                    v = num_to_alpha(current_num)
                    current_num += 1
                    return v
                # advance so first call to next_value() returns the next alpha after start_value
                current_num += 1
            except Exception:
                print('Cannot increment value; must be integer or alphabetic sequence (A..Z, AA..)', file=sys.stderr)
                sys.exit(2)

        # ensure target column present
        if args.column not in [fn for fn in ([] if not rows else rows[0].keys())]:
            # add empty field to each row so writer keeps column order consistent
            for r in rows:
                if args.column not in r:
                    r[args.column] = ''

        # set start value in the designated selected row
        start_row_idx = selected_indices[start_idx_in_selected]
        rows[start_row_idx][args.column] = start_value

        # fill subsequent selected indices with incremented values when empty
        for sel in selected_indices[start_idx_in_selected + 1:]:
            cell = rows[sel].get(args.column, '')
            if cell is None:
                cell = ''
            if cell.strip() == '':
                rows[sel][args.column] = next_value()
            else:
                continue
    else:
        for row in rows:
            # selection
            if args.match_column:
                if row.get(args.match_column, '') != args.match_value:
                    continue

            # only-empty check
            if args.only_empty and row.get(args.column, '').strip() != '':
                continue

            row[args.column] = args.value

    # output
    # preview mode: write resulting CSV to stdout and do not modify files
    if args.preview:
        writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
        print('\n(Preview mode: no files were modified)', file=sys.stderr)
        sys.exit(0)

    if args.inplace:
        bak = csvpath + '.bak'
        try:
            os.replace(csvpath, bak)
        except Exception:
            # fallback copy
            import shutil
            shutil.copy2(csvpath, bak)
        write_csv(csvpath, rows, fieldnames)
        print('Wrote', csvpath, '(backup at', bak + ')')
    else:
        outpath = args.output
        if outpath:
            write_csv(outpath, rows, fieldnames)
            print('Wrote', outpath)
        else:
            writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames)
            writer.writeheader()
            for r in rows:
                writer.writerow(r)


if __name__ == '__main__':
    main()

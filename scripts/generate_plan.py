#!/usr/bin/env python3
"""Generate an active offering plan by merging course/global defaults and offering overrides.

Usage:
  python3 scripts/generate_plan.py <COURSE>/<SEMESTER>
  python3 scripts/generate_plan.py CS-428/202530 --validate
  python3 scripts/generate_plan.py CS-428/202530 --promote

Behavior:
  - Loads global defaults from `_data/teaching/gen-info.yml` if present
  - Loads course defaults from `_data/teaching/<COURSE>/defaults.yml` if present
  - Loads offering overrides from `_data/teaching/<COURSE>/<SEMESTER>/plan.yml`
  - Deep-merges defaults -> overrides (overrides win) and writes
    `_data/teaching/<COURSE>/<SEMESTER>/plan_active.yml`.
  - `--validate` will attempt to validate using `yamale` and
    `scripts/plan_schema.yaml` if available.
  - `--promote` will copy the offering `plan.yml` to the course defaults
    file (`defaults.yml`) and record a promotion entry in
    `defaults_promotions.yml`.
"""
from __future__ import annotations
import os
import sys
import yaml
from datetime import datetime
from typing import Any, Dict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_TEACHING = os.path.join(ROOT, '_data', 'teaching')


def read_yaml(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f) or {}


def write_yaml(path: str, data: Dict[str, Any]):
    with open(path, 'w', encoding='utf-8') as f:
        yaml.safe_dump(data, f, sort_keys=False)


def deep_merge(a: Any, b: Any) -> Any:
    """Recursively merge b into a and return the merged result.

    Semantics:
      - Scalars and lists in `b` replace those in `a`.
      - Dicts are merged recursively.
      - If `b` explicitly sets a key to None, the result will be None.
    """
    if isinstance(a, dict) and isinstance(b, dict):
        result = dict(a)
        for k, v in b.items():
            if k in result:
                result[k] = deep_merge(result[k], v)
            else:
                result[k] = v
        return result
    # for lists and scalars, prefer b (replace)
    return b


def validate_with_yamale(schema_path: str, target_path: str) -> bool:
    try:
        import yamale
    except Exception:
        print('yamale not installed; skipping validation (install with `pip install yamale`)')
        return False
    schema = yamale.make_schema(schema_path)
    data = yamale.make_data(target_path)
    try:
        yamale.validate(schema, data)
        print('Validation succeeded')
        return True
    except Exception as e:
        print('Validation failed:', e)
        return False


def promote_offering(course_dir: str, offering_dir: str):
    plan_src = os.path.join(offering_dir, 'plan.yml')
    defaults_dst = os.path.join(course_dir, 'defaults.yml')
    promotions_log = os.path.join(course_dir, 'defaults_promotions.yml')
    if not os.path.exists(plan_src):
        print('No offering plan to promote:', plan_src)
        return False
    # copy plan.yml to defaults.yml (overwrite)
    with open(plan_src, 'r', encoding='utf-8') as fsrc:
        content = fsrc.read()
    with open(defaults_dst, 'w', encoding='utf-8') as fdst:
        fdst.write(content)
    # append promotion record
    record = {
        'promoted_from': os.path.basename(offering_dir.rstrip(os.sep)),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'note': 'Promoted offering plan to course defaults'
    }
    promotions = read_yaml(promotions_log) or {}
    history = promotions.get('history', [])
    history.append(record)
    promotions['history'] = history
    write_yaml(promotions_log, promotions)
    print(f'Promoted {plan_src} -> {defaults_dst}; logged in {promotions_log}')
    return True


def main():
    if len(sys.argv) < 2:
        print('Usage: python3 scripts/generate_plan.py <COURSE>/<SEMESTER> [--validate] [--promote]')
        sys.exit(2)
    target = sys.argv[1]
    flags = set(sys.argv[2:])
    if '/' not in target:
        print('Target must be in the form COURSE/SEMESTER (e.g. CS-428/202530)')
        sys.exit(2)
    course, sem = target.split('/', 1)
    course_dir = os.path.join(DATA_TEACHING, course)
    offering_dir = os.path.join(course_dir, sem)
    if not os.path.isdir(course_dir):
        print('Course directory not found:', course_dir)
        # still allow creation
    if not os.path.isdir(offering_dir):
        print('Offering directory not found; creating:', offering_dir)
        os.makedirs(offering_dir, exist_ok=True)

    # Load global, course, and offering files
    global_defaults = read_yaml(os.path.join(DATA_TEACHING, 'gen-info.yml'))
    course_defaults = read_yaml(os.path.join(course_dir, 'defaults.yml'))
    offering_plan = read_yaml(os.path.join(offering_dir, 'plan.yml'))

    # Merge order: global -> course -> offering
    merged = deep_merge(global_defaults, course_defaults) if global_defaults else course_defaults
    merged = deep_merge(merged, offering_plan) if merged else offering_plan

    out_path = os.path.join(offering_dir, 'plan_active.yml')
    write_yaml(out_path, merged or {})
    print('Wrote', out_path)

    if '--validate' in flags:
        schema = os.path.join(ROOT, 'scripts', 'plan_schema.yaml')
        if os.path.exists(schema):
            validate_with_yamale(schema, out_path)
        else:
            print('Schema not found at', schema)

    if '--promote' in flags:
        promote_offering(course_dir, offering_dir)


if __name__ == '__main__':
    main()

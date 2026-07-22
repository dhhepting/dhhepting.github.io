#!/usr/bin/env python3
"""Generate an active Jekyll config by merging deploy target overrides.

Usage:
  DEPLOY_TARGET=uregina python3 scripts/generate_config.py
If DEPLOY_TARGET is not set, uses `deploy.default` from `_config.yml`.
Writes `_config_active.yml` in the repo root.
"""
import os
import sys
import yaml

ROOT_CONFIG = "_config.yml"
OUT_CONFIG = "_config_active.yml"


def deep_merge(a, b):
    """Recursively merge dict b into dict a and return the result."""
    if not isinstance(a, dict) or not isinstance(b, dict):
        return b
    result = dict(a)
    for k, v in b.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def main():
    if not os.path.exists(ROOT_CONFIG):
        print(f"Error: {ROOT_CONFIG} not found", file=sys.stderr)
        sys.exit(2)
    with open(ROOT_CONFIG, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    deploy = cfg.get("deploy", {})
    default_target = deploy.get("default") if isinstance(deploy, dict) else None
    target = os.getenv("DEPLOY_TARGET") or default_target

    # Base config is everything except the deploy key
    base = {k: v for k, v in cfg.items() if k != "deploy"}

    if target and isinstance(deploy, dict):
        targets = deploy.get("targets", {})
        overrides = targets.get(target)
        if overrides:
            merged = deep_merge(base, overrides)
            with open(OUT_CONFIG, "w", encoding="utf-8") as out:
                yaml.safe_dump(merged, out, sort_keys=False)
            print(f"Wrote {OUT_CONFIG} for target '{target}'")
            return
        else:
            print(f"Warning: deploy target '{target}' not found; writing base config", file=sys.stderr)

    # Fallback: write base config without deploy section
    with open(OUT_CONFIG, "w", encoding="utf-8") as out:
        yaml.safe_dump(base, out, sort_keys=False)
    print(f"Wrote {OUT_CONFIG} (base)")


if __name__ == "__main__":
    main()

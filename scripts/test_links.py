#!/usr/bin/env python3
"""scripts/test_links.py

Lightweight checker for `_site/` that validates presence of selected
content elements and checks internal links resolve to files. Intended to
run after `bundle exec jekyll build`.

Usage: python3 scripts/test_links.py
"""
import sys
import os
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

SITE_DIR = os.environ.get("SITE_DIR", "_site")

def read_baseurl(config_path="_config.yml"):
    """Return the `baseurl` value from the Jekyll config (or empty string)."""
    try:
        with open(config_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line.startswith("baseurl:"):
                    # get value after colon
                    val = line.split(":", 1)[1].strip()
                    # strip surrounding quotes
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    # normalize: empty or "/" means no baseurl
                    if val == "/":
                        return ""
                    return val
    except Exception:
        pass
    return ""

def is_local_href(href):
    if not href:
        return False
    if href.startswith("mailto:") or href.startswith("tel:"):
        return False
    p = urlparse(href)
    return (p.scheme == "" and p.netloc == "")

def gather_pages(site_dir):
    pages = []
    for root, _, files in os.walk(site_dir):
        for f in files:
            if f.endswith('.html') or f.endswith('.htm'):
                pages.append(os.path.join(root, f))
    return pages

def resolve_local(href, page_path):
    # Resolve relative href against page path and map to SITE_DIR file path
    base = 'file://' + os.path.abspath(page_path)
    resolved = urljoin(base, href)
    p = urlparse(resolved)
    path = p.path
    # If urljoin returned an absolute filesystem path inside the built site,
    # use it directly. Otherwise map the site-relative path into SITE_DIR.
    abs_site = os.path.abspath(SITE_DIR)
    # Normalize path
    path_norm = os.path.normpath(path)
    if path_norm.startswith(abs_site):
        candidate = path_norm
    else:
        candidate = os.path.join(SITE_DIR, path.lstrip('/'))
    if os.path.isdir(candidate):
        candidate = os.path.join(candidate, 'index.html')
    return candidate

def check_page(path):
    errs = []
    baseurl = read_baseurl()
    try:
        with open(path, 'rb') as fh:
            soup = BeautifulSoup(fh, 'html.parser')
    except Exception as e:
        return [f"Failed to open {path}: {e}"]

    # Required selectors
    required = {
        'nav': 'nav',
        'footer': 'footer',
        'meta_description': 'meta[name="description"]',
        'canonical': 'link[rel="canonical"]'
    }
    for name, sel in required.items():
        if not soup.select_one(sel):
            errs.append(f"Missing {name} ({sel}) in {path}")

    # Check local links
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:'):
            continue
        if is_local_href(href):
            # strip baseurl if present so /<baseurl>/foo -> /foo
            h = href
            if baseurl:
                # ensure baseurl starts with '/'
                b = baseurl if baseurl.startswith('/') else '/' + baseurl
                if h.startswith(b):
                    h = h[len(b):]
                    if not h:
                        h = '/'
            candidate = resolve_local(h, path)
            if not os.path.exists(candidate):
                errs.append(f"Broken internal link in {path}: '{href}' -> {candidate}")

    return errs

def main():
    pages = gather_pages(SITE_DIR)
    all_errs = []
    if not pages:
        print(f"No HTML pages found in {SITE_DIR}. Did you build the site?")
        sys.exit(2)
    for p in pages:
        all_errs.extend(check_page(p))

    if all_errs:
        print("Found errors:")
        for e in all_errs:
            print(' -', e)
        sys.exit(1)
    print("All checks passed.")
    return 0

if __name__ == '__main__':
    sys.exit(main())

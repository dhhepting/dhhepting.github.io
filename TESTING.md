# Testing the site (links & content checks)

This document explains how to run the site tests locally and what the CI workflow does. The repo includes two checks:

- `html-proofer` (Ruby): link and HTML checks against the generated `_site/` directory.
- `scripts/test_links.py` (Python): lightweight checks for required selectors and internal link resolution.

**Prerequisites**
- macOS / zsh (commands below work in `zsh`).
- Ruby and Bundler (the project already includes a `Gemfile` with `html-proofer`).
- Python 3 and `pip` for the small content/link checker.

**Install dependencies**

Install Ruby bundler and gems:

```bash
gem install bundler
bundle install
```

Install Python deps (recommended in a virtualenv):

```bash
python3 -m pip install --user --upgrade pip
python3 -m pip install --user requests beautifulsoup4
```

**Build the site**

Build with Jekyll (the repo uses multiple config files; adapt if needed):

```bash
bundle exec jekyll build --config _config.yml,_config_uregina.yml
# If you preview locally, you may need: bundle exec jekyll serve --baseurl ""
```

If the generated site appears at `_site/`, proceed to the checks.

**Run html-proofer**

The repository includes `_htmlproofer.yml` that sets sensible defaults (skips external checks by default). Run:

```bash
bundle exec htmlproofer ./_site --config-file _htmlproofer.yml
```

Common flags you may want to tweak in `_htmlproofer.yml`:
- `disable_external: true` — skip external link checks (avoid flaky failures).
- `assume_extension: true` — treat `/.*/foo/` as `index.html` (useful for pretty URLs).
- `allow_hash_href: true` — ignore `href="#"` placeholders.

To enable external checks, remove or set `disable_external: false` and be prepared for slower runs and occasional intermittent failures from third-party sites.

**Run Python content + internal link checks**

After building the site, run the lightweight checker:

```bash
python3 scripts/test_links.py
```

The script checks for the presence of these elements on each page: `<nav>`, `<footer>`, `meta[name="description"]`, and `link[rel="canonical"]`. It also resolves internal links (relative and pretty URLs) to files under `_site/` and reports missing targets.

If your built pages are in a different folder, set `SITE_DIR` env var:

```bash
SITE_DIR=public python3 scripts/test_links.py
```

**CI (GitHub Actions)**

A workflow file is present at `.github/workflows/site-checks.yml`. It performs:
- checkout
- install Ruby and gems
- `bundle exec jekyll build --config _config.yml,_config_uregina.yml`
- `bundle exec htmlproofer ./_site --config-file _htmlproofer.yml`
- install Python deps and run `python3 scripts/test_links.py`

Modify the workflow if you want different triggers, Ruby/Python versions, or to skip external checks.

**Troubleshooting & tips**
- If `html-proofer` reports broken links for pretty URLs, ensure `assume_extension: true` is set.
- If `html-proofer` fails on external sites, either whitelist them in `_htmlproofer.yml` (`ignore_urls`) or disable external checks.
- If `scripts/test_links.py` finds missing selectors for a specific page type that intentionally lacks them, you can extend the script to ignore that path or add page-specific rules.
- For debugging, inspect `_site/<path>` directly to verify files and anchors.

**Next steps / customization**
- Add more checks to `scripts/test_links.py` (image `alt` attributes, specific page content assertions, or JSON data checks).
- Add nightly workflow to verify external links less frequently if you want them checked but not on every PR.

If you want, I can run the checks locally and report any failures, or customize the script to validate additional selectors/pages. Tell me which pages or selectors you care about and I'll add them.

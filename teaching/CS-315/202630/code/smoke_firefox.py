#!/usr/bin/env python3
"""Open each .html page in headless Firefox and report console output, uncaught
JS errors and 404s.  Clicks every <button> once.  Exit status 1 if any page fails.

  python3 smoke_firefox.py [root-dir] [glob ...]
  python3 smoke_firefox.py . 'm-textbook/07/*.html'

Env: FIREFOX_BIN, GECKODRIVER (optional paths), SETTLE (seconds, default 1.5)
"""
import collections, functools, http.server, mimetypes, os, pathlib, socketserver, sys, threading, time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
GLOBS = sys.argv[2:]
SETTLE = float(os.environ.get('SETTLE', '1.5'))
SKIP = {'node_modules', 'dist', '.git', 'downloads'}      # only applied to the default glob
LOG_MAX = int(os.environ.get('LOG_MAX', '6'))             # non-error lines shown per page
QUIET = bool(os.environ.get('QUIET'))                     # only print failing pages

def squash(lines):
    """collapse identical lines into 'line  (xN)', keeping first-seen order"""
    return [l + (f'  (x{n})' if n > 1 else '') for l, n in collections.Counter(lines).items()]


mimetypes.add_type('text/javascript', '.mjs'); mimetypes.add_type('text/javascript', '.js')
not_found = []

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, *a, **k):
        if code == 404 and self.path != '/favicon.ico': not_found.append(self.path.split('?')[0])
        super().send_error(code, *a, **k)
    def log_message(self, *a): pass

httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
httpd.daemon_threads = True
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{httpd.server_address[1]}'

opts = Options(); opts.add_argument('-headless'); opts.enable_bidi = True
opts.set_capability('unhandledPromptBehavior', 'accept')   # pages call alert() when WebGL is missing
if os.environ.get('FIREFOX_BIN'): opts.binary_location = os.environ['FIREFOX_BIN']
svc = Service(os.environ['GECKODRIVER']) if os.environ.get('GECKODRIVER') else Service()
driver = webdriver.Firefox(options=opts, service=svc)

log = []
driver.script.add_console_message_handler(lambda m: log.append(f'console.{m.level}: {m.text}'))
driver.script.add_javascript_error_handler(lambda e: log.append(f'JS ERROR: {e.text}'))

driver.get('about:blank')
if not driver.execute_script("return !!document.createElement('canvas').getContext('webgl2')"):
    print('WARNING: this headless Firefox has no WebGL2; every GL page will report failure.\n')

if GLOBS:
    pages = sorted({p for g in GLOBS for p in ROOT.glob(g) if p.suffix == '.html'})
else:
    pages = sorted(p for p in ROOT.glob('**/*.html') if not SKIP & set(p.relative_to(ROOT).parts))

bad = 0; failed = []
for p in pages:
    rel = p.relative_to(ROOT).as_posix()
    log.clear(); not_found.clear()
    driver.get(f'{base}/{rel}'); time.sleep(SETTLE)
    clicked = 0
    for b in driver.find_elements(By.TAG_NAME, 'button'):
        try: b.click(); clicked += 1; time.sleep(0.1)
        except Exception as e: log.append(f'JS ERROR: click failed ({e.__class__.__name__})')
    time.sleep(0.3)
    misses = [f'404: {u}' for u in dict.fromkeys(not_found)]
    errs = [l for l in log if l.startswith(('JS ERROR', 'console.error'))] + misses
    other = [l for l in log if not l.startswith(('JS ERROR', 'console.error'))]
    bad += bool(errs)
    if errs: failed.append(rel)
    if QUIET and not errs: continue
    print(f"[{'FAIL' if errs else 'ok'}] {rel}  ({clicked} buttons clicked)")
    for l in squash(errs): print('    ' + l)                  # errors: always shown in full
    shown = squash(other)
    for l in shown[:LOG_MAX]: print('    ' + l)
    if len(shown) > LOG_MAX:
        print(f'    ... {len(shown) - LOG_MAX} more distinct console lines ({len(other)} total)')
driver.quit(); httpd.shutdown()
print(f'\n{len(pages)} pages, {bad} with problems')
for f in failed: print('  FAIL', f)
sys.exit(1 if bad else 0)

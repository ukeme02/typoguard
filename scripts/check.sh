#!/usr/bin/env bash
# TypoGuard pre-flight check — run from repo root: ./scripts/check.sh
set -u
FAIL=0

echo "== 1. Repository state =="
git status --short
git log --oneline -1

echo "== 2. JS syntax =="
for f in content.js discovery.js editor-discovery.js; do
  if [ -f "$f" ]; then
    node --check "$f" && echo "OK   $f" || { echo "FAIL syntax: $f"; FAIL=1; }
  else
    echo "MISSING: $f"; FAIL=1
  fi
done

echo "== 3. manifest.json validity =="
python3 -m json.tool manifest.json > /dev/null && echo "OK   manifest.json" || { echo "FAIL: invalid JSON"; FAIL=1; }

echo "== 4. Privacy-sensitive API scan (Phase 2: ANY hit is suspicious — review each) =="
grep -nE "\.value|innerText|textContent|innerHTML|keydown|keyup|keypress" content.js discovery.js editor-discovery.js && echo "^ REVIEW each hit" || echo "clean — no content-reading APIs"

echo "== 5. Network-call scan =="
grep -nE "fetch\(|XMLHttpRequest|WebSocket" content.js discovery.js editor-discovery.js && echo "^ REVIEW each hit" || echo "clean — no network calls"

echo "== 6. Required files =="
for f in manifest.json content.js discovery.js test/discovery-tests.html docs/ARCHITECTURE.md docs/PRODUCT-BACKLOG.md; do
  [ -f "$f" ] && echo "OK   $f" || { echo "MISSING: $f"; FAIL=1; }
done

echo "== RESULT: $([ $FAIL -eq 0 ] && echo ALL CHECKS PASSED || echo FAILURES PRESENT) =="
exit $FAIL
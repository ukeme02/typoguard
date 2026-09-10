#!/usr/bin/env bash
# TypoGuard pre-flight check — run from repo root: ./scripts/check.sh
set -u
FAIL=0

echo "== 1. Repository state =="
git status --short
git log --oneline -1

echo "== 2. JS syntax =="
for f in content.js discovery.js editor-discovery.js capture.js; do
  if [ -f "$f" ]; then
    node --check "$f" && echo "OK   $f" || { echo "FAIL syntax: $f"; FAIL=1; }
  else
    echo "MISSING: $f"; FAIL=1
  fi
done

echo "== 3. manifest.json validity =="
python3 -m json.tool manifest.json > /dev/null && echo "OK   manifest.json" || { echo "FAIL: invalid JSON"; FAIL=1; }

echo "== 4. manifest content_scripts sanity =="
for j in discovery.js capture.js content.js; do
  grep -q "\"$j\"" manifest.json && echo "OK   $j listed" || { echo "FAIL: $j missing from manifest"; FAIL=1; }
done
ORDER=$(grep -oE '"(discovery|capture|content)\.js"' manifest.json | tr -d '"' | tr '\n' ' ')
if [ "$ORDER" = "discovery.js capture.js content.js " ]; then
  echo "OK   injection order (discovery -> capture -> content)"
else
  echo "REVIEW injection order: $ORDER (expected discovery.js capture.js content.js)"
fi

echo "== 5. Cross-file top-level name collision check =="
# All content_scripts share ONE isolated world: duplicate top-level names collide.
COLLISIONS=$( { grep -hE "^(const|let) [A-Za-z_$]" content.js discovery.js editor-discovery.js capture.js | sed -E 's/^(const|let) ([A-Za-z_$][A-Za-z0-9_$]*).*/\2/';
                grep -hE "^function [A-Za-z_$]" content.js discovery.js editor-discovery.js capture.js | sed -E 's/^function ([A-Za-z_$][A-Za-z0-9_$]*).*/\1/'; } | sort | uniq -d )
if [ -n "$COLLISIONS" ]; then
  echo "FAIL: duplicate top-level names across content scripts:"
  echo "$COLLISIONS"
  FAIL=1
else
  echo "clean — no duplicate top-level names"
fi

echo "== 6. Privacy-sensitive API scan =="
# capture.js is the ONLY file permitted to read editor content (capture duty, Phase 3+).
for f in content.js discovery.js editor-discovery.js; do
  HITS=$(grep -nE "\.value\b|innerText|textContent|innerHTML|keydown|keyup|keypress" "$f" || true)
  if [ -n "$HITS" ]; then
    echo "FAIL content-read APIs in $f (not permitted outside capture.js):"
    echo "$HITS"
    FAIL=1
  else
    echo "clean  $f"
  fi
done
CHITS=$(grep -nE "\.value\b|innerText" capture.js || true)
if [ -n "$CHITS" ]; then
  echo "capture.js content reads (allowed by design):"
  echo "$CHITS"
else
  echo "note: no .value/innerText reads found in capture.js (unexpected — capture needs them)"
fi
CTEXT=$(grep -nE "textContent" capture.js || true)
if [ -n "$CTEXT" ]; then
  echo "REVIEW textContent in capture.js (plan specifies innerText for contenteditable):"
  echo "$CTEXT"
fi
CBAD=$(grep -nE "innerHTML|keydown|keyup|keypress" capture.js || true)
if [ -n "$CBAD" ]; then
  echo "FAIL forbidden APIs in capture.js:"
  echo "$CBAD"
  FAIL=1
fi

echo "== 7. Network-call scan =="
NET=$(grep -nE "fetch\(|XMLHttpRequest|WebSocket" content.js discovery.js editor-discovery.js capture.js || true)
if [ -n "$NET" ]; then
  echo "FAIL network calls found:"
  echo "$NET"
  FAIL=1
else
  echo "clean — no network calls"
fi

echo "== 8. Required files =="
for f in manifest.json content.js discovery.js capture.js test/discovery-tests.html test/capture-tests.html docs/ARCHITECTURE.md docs/PHASE3-CAPTURE-PLAN.md docs/PRODUCT-BACKLOG.md scripts/check.sh; do
  [ -f "$f" ] && echo "OK   $f" || { echo "MISSING: $f"; FAIL=1; }
done

echo "== RESULT: $([ $FAIL -eq 0 ] && echo ALL CHECKS PASSED || echo FAILURES PRESENT) =="
exit $FAIL
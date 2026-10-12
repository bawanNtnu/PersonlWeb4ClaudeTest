#!/usr/bin/env bash
# 最終驗收一鍵執行：bash scripts/qa/run-final.sh <previewURL> <expectedSHA>
# 前置：npm run build 完成，且本機 `npx astro preview --host 127.0.0.1 --port 4321` 正在執行。
# 任何一項失敗都會記錄於 summary.txt，但會繼續跑完其餘項目（避免單點失敗遮蔽其他結果）。
set -u
URL=$1; SHA=$2; E=docs/acceptance/evidence/final; mkdir -p "$E"
: > "$E/summary.txt"
run(){ local name=$1; shift; if out=$("$@" 2>&1); then st=PASS; else st=FAIL; fi; echo "$out" > "$E/$name.log"; echo "[$st] $name :: $(echo "$out" | grep -E 'PASS /|正確|一致|Tests ' | tail -1)" | tee -a "$E/summary.txt"; }
echo "HEAD=$(git rev-parse HEAD) expected=$SHA preview=$URL" | tee -a "$E/summary.txt"
run static            node scripts/qa/static-checks.mjs --json "$E/static.json"
run unit              npx vitest run
run fault-static      node scripts/qa/fault-injection.mjs --json "$E/fault-injection-static.json"
run browser-local     node scripts/qa/browser-checks.mjs http://127.0.0.1:4321/ --json "$E/browser-local.json"
run a11y-local        node scripts/qa/a11y-checks.mjs http://127.0.0.1:4321/ --json "$E/a11y-local.json"
run fault-browser     node scripts/qa/browser-fault-injection.mjs --json "$E/fault-injection-browser.json"
run remote-preview    node scripts/qa/remote-preview-checks.mjs "$URL" "$SHA" --json "$E/remote-preview.json"
run compare           node scripts/qa/compare-local-remote.mjs "$URL" --json "$E/compare-local-remote.json"
run browser-remote    node scripts/qa/browser-checks.mjs "$URL" --json "$E/browser-remote.json"
run a11y-remote       node scripts/qa/a11y-checks.mjs "$URL" --json "$E/a11y-remote.json"

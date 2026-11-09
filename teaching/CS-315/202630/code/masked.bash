
for h in m-textbook/*/*.html; do
  j=${h%.html}.js
  [ -f "$j" ] && grep -q 'initShaders(' "$j" \
    && ! grep -qE 'globals\.mjs|initShaders' "$h" && echo "NO initShaders source: $h"
done

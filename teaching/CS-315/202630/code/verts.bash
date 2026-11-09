
shasum m-textbook/*/vertices.js                      # expect one hash

for f in $(grep -l 'src="vertices.js"' m-textbook/*/*.html.bak); do
  h=${f%.bak}
  g=$(grep -n 'globals.mjs' "$h" | head -1 | cut -d: -f1)
  v=$(grep -n 'vertices' "$h" | head -1 | cut -d: -f1)
  echo "$h globals@${g:-none} vertices@$v $([ "${g:-999}" -lt "$v" ] && echo OK || echo ORDER-PROBLEM)"
done

bash modsed.bash && bash leftover.bash

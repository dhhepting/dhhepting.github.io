grep -n 'function rotateY' common/MV.mjs     # want: export function rotateY
sed -n '932p' common/MV.mjs                  # want: const result = new Array(arguments[1].length);

# 1. drop the legacy global-script shader loader (globals.mjs replaces it)
\#src="[./]*Common/initShaders[0-9]*\.js"#d
# 2. MV (any variant) -> the globals bridge, as a module
s#<script type="text/javascript" src="[./]*Common/MV(new)?\.m?js"></script>#<script type="module" src="../../common/globals.mjs"></script>#
# 3. the page's own scripts become modules
s#<script type="text/javascript" src="([^"]+)"></script>#<script type="module" src="\1"></script>#

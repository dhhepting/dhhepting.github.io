# 1. legacy shader loader (HTML-id variant only) -> globals bridge
s#<script( type="text/javascript")? src="[./]*Common/initShaders\.js"></script>#<script type="module" src="../../common/globals.mjs"></script>#
# 2. MV (any variant) -> globals bridge
s#<script( type="text/javascript")? src="[./]*Common/MV(new)?\.m?js"></script>#<script type="module" src="../../common/globals.mjs"></script>#
# 3. the page's own same-directory script becomes a module (bare filenames only)
s#<script( type="text/javascript")? src="([^"/]+\.js)"></script>#<script type="module" src="\2"></script>#

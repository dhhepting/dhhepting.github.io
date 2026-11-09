# 1. legacy shader loader (HTML-id variant; either filename case) -> globals bridge
s#<script( type="text/javascript")? src="[./]*Common/[iI]nitShaders\.js"></script>#<script type="module" src="../../common/globals.mjs"></script>#
# 1b. XHR shader loader (shaders fetched from .glsl files): bridge, then override initShaders
s#<script( type="text/javascript")? src="[./]*Common/initShaders2\.js"></script>#<script type="module" src="../../common/globals.mjs"></script>\
<script type="module">import { initShaders } from "../../common/initShadersXHR.mjs"; globalThis.initShaders = initShaders;</script>#
# 2. MV (any variant) -> globals bridge
s#<script( type="text/javascript")? src="[./]*Common/MV(new)?\.m?js"></script>#<script type="module" src="../../common/globals.mjs"></script>#
# 3. three.js: point at the vendored r124 build (stays a classic script; sets global THREE)
s#<script src="\.\./\.\./three\.js-master/build/three\.js"></script>#<script src="../../common/three-r124.min.js"></script>#
# 4. teapot control vertices call vec3() at load time: shared module, loaded after globals.mjs
s#<script( type="text/javascript")? src="vertices\.js"></script>#<script type="module" src="../../common/vertices.mjs"></script>#
# (the page's own <script> -> module conversion is done per-file in modsed.bash)

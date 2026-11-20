// Single adapter to the shared common/ modules,
// (they import '../../../Common/...'
// from <chapter>/<project>/file.mjs; this file is one folder deeper, in lib/).
export {
    vec3, mat4, lookAt, ortho, perspective, rotate, translate, scale,
    mult, inverse, normalMatrix, flatten,
} from '../../../../common/MV.mjs';
export { initShaders } from '../../../../common/initShadersJS.mjs';

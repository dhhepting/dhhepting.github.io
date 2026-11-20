// Single adapter to the course's shared Common/ modules, with the same
// relative depth your chapter samples use (they import '../../Common/...'
// from <chapter>/<project>/file.mjs; this file is one folder deeper, in lib/).
export {
    vec3, mat4, lookAt, ortho, perspective, rotate, translate, scale,
    mult, inverse, normalMatrix, flatten,
} from '../../../Common/MV.mjs';
export { initShaders } from '../../../Common/initShadersJS.mjs';

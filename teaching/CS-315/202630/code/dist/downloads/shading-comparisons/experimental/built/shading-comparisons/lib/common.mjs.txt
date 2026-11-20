// Single adapter to the shared common/ modules. Every other file in lib/ imports
// MV.mjs and initShadersJS.mjs through here, so this is the only file that names
// the path to common/ (four levels up from lib/: lib -> shading-comparisons ->
// built -> experimental -> code).
export {
    vec3, mat4, lookAt, ortho, perspective, rotate, translate, scale,
    mult, inverse, normalMatrix, flatten,
} from '../../../../common/MV.mjs';
export { initShaders } from '../../../../common/initShadersJS.mjs';

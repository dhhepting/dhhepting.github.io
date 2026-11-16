// Informal cost model: count the expensive operations in each shader stage by
// reading the shader source itself, weight them, and multiply by how many times
// the stage runs. This is a teaching estimate, not a GPU profiler.

// Rough scalar-ALU-op weights (documented so students can argue with them).
export const WEIGHTS = {
    matMat4: 112,  // mat4 * mat4: 64 multiplies + 48 adds
    matVec4: 28,   // mat4 * vec4: 16 multiplies + 12 adds
    matVec3: 15,   // mat3 * vec3: 9 multiplies + 6 adds
    normalize: 9,  // dot (5) + inverse sqrt (1) + 3 multiplies
    dot: 5,        // 3 multiplies + 2 adds
    pow: 8,        // exp2(y * log2(x)): two transcendental ops
    reflect: 12,   // I - 2 * dot(N, I) * N
    max: 1,
    interpolatedFloat: 1, // rasteriser interpolates each varying component per fragment
};

export const LABELS = {
    matMat4: 'mat4·mat4',
    matVec4: 'mat4·vec4',
    matVec3: 'mat3·vec3',
    normalize: 'normalize',
    dot: 'dot',
    pow: 'pow',
    reflect: 'reflect',
    max: 'max',
    interpolatedFloat: 'interpolated floats',
};

const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/^\s*#version.*$/m, '');

const countMatches = (src, re) => (src.match(re) ?? []).length;

/** Index of the '}' matching the '{' at `open`. */
function matchingBrace(src, open) {
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') { depth -= 1; if (depth === 0) return i; }
    }
    throw new Error('Unbalanced braces in shader source');
}

/**
 * Resolve `if (NAME) { ... } else { ... }` for uniforms whose value is known,
 * keeping only the branch that would run. Lets a combined shader (such as
 * shadedCubeHalfway, which switches models with uUseHalfway) be costed for the
 * branch each canvas actually takes. The shader itself is not modified.
 */
export function pruneBranches(source, constants) {
    let src = stripComments(source);
    for (const [name, value] of Object.entries(constants)) {
        const re = new RegExp(`if\\s*\\(\\s*${name}\\s*\\)\\s*\\{`);
        for (let m = re.exec(src); m; m = re.exec(src)) {
            const open = m.index + m[0].length - 1;
            const close = matchingBrace(src, open);
            let end = close + 1;
            let elseBody = '';
            const elseMatch = /^\s*else\s*\{/.exec(src.slice(end));
            if (elseMatch) {
                const elseOpen = end + elseMatch[0].length - 1;
                const elseClose = matchingBrace(src, elseOpen);
                elseBody = src.slice(elseOpen + 1, elseClose);
                end = elseClose + 1;
            }
            const chosen = value ? src.slice(open + 1, close) : elseBody;
            src = src.slice(0, m.index) + chosen + src.slice(end);
        }
    }
    return src;
}

/** Weighted cost of a chunk of statements (no interpolant counting). */
function tally(src) {
    const counts = {
        matMat4: 0, matVec4: 0, matVec3: 0,
        normalize: countMatches(src, /\bnormalize\s*\(/g),
        dot: countMatches(src, /\bdot\s*\(/g),
        pow: countMatches(src, /\bpow\s*\(/g),
        reflect: countMatches(src, /\breflect\s*\(/g),
        max: countMatches(src, /\bmax\s*\(/g),
        interpolatedFloat: 0,
    };

    // Matrix products: a uniform named u...Matrix followed by '*'.
    //  - followed directly by another u...Matrix (no parenthesis): left-to-right
    //    evaluation makes this a full mat4 * mat4 product (P * MV * v);
    //  - the normal matrix is the only mat3;
    //  - anything else is a matrix * vector product.
    // (the lookahead lets consecutive products overlap: in `P * MV * v`, MV starts the second product)
    for (const match of src.matchAll(/\b(u\w*Matrix)\s*\*\s*(?=(\(?)\s*(\w+))/g)) {
        const [, name, paren, next] = match;
        if (!paren && /^u\w*Matrix$/.test(next)) counts.matMat4 += 1;
        else if (/normal/i.test(name)) counts.matVec3 += 1;
        else counts.matVec4 += 1;
    }
    return counts;
}

const costOf = (counts) => Object.entries(counts).reduce((sum, [key, n]) => sum + n * WEIGHTS[key], 0);

/** `if (c) a; else b;` (single statements): only one runs, so keep the costlier. */
function collapseSimpleIfElse(src) {
    const re = /if\s*\(((?:[^()]|\([^()]*\))*)\)\s*([^;{}]+;)\s*else\s*([^;{}]+;)/g;
    return src.replace(re, (all, condition, a, b) =>
        `${condition};${costOf(tally(a)) >= costOf(tally(b)) ? a : b}`);
}

function analyzeStage(source, { countsInterpolants, constants }) {
    let src = constants ? pruneBranches(source, constants) : stripComments(source);
    src = collapseSimpleIfElse(src);
    const counts = tally(src);

    if (countsInterpolants) {
        const sizes = { float: 1, vec2: 2, vec3: 3, vec4: 4 };
        for (const match of src.matchAll(/^\s*in\s+(float|vec2|vec3|vec4)\s+([^;]+);/gm)) {
            counts.interpolatedFloat += sizes[match[1]] * match[2].split(',').length;
        }
    }
    return { counts, cost: costOf(counts) };
}

/** constants (optional): known uniform values used to prune untaken branches. */
export function analyzeProgram(vertSource, fragSource, constants = null) {
    return {
        vertex: analyzeStage(vertSource, { countsInterpolants: false, constants }),
        fragment: analyzeStage(fragSource, { countsInterpolants: true, constants }),
    };
}

/** Weighted ops per frame = vertices x vertex cost + shaded pixels x fragment cost. */
export function estimateFrameCost(analysis, vertices, fragments) {
    const vertexWork = vertices * analysis.vertex.cost;
    const fragmentWork = fragments * analysis.fragment.cost;
    return { vertexWork, fragmentWork, total: vertexWork + fragmentWork };
}

/** "2× mat4·vec4, 3× normalize, …" for display. */
export function describeCounts(counts) {
    const parts = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([key, n]) => `${n}× ${LABELS[key]}`);
    return parts.length ? parts.join(', ') : 'nothing (copies the interpolated colour)';
}

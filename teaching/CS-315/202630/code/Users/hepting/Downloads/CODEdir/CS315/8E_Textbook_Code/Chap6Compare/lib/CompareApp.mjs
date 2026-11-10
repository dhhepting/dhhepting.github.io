// Two-canvas comparison harness.
//
// One set of controls (supplied by a scene: sphere or cube) drives both
// canvases. Beneath them: a pixel-difference image, an informal cost model
// (static analysis of the shader source x workload) and a timed stress test.
import { SHADERS } from './shaderSources.mjs';
import { LitMeshPane } from './LitMeshPane.mjs';
import { estimateFrameCost, describeCounts } from './costModel.mjs';

const COMMON_DEFAULTS = { canvasSize: 512, showDiff: true, diffAmp: 8, stressPasses: 100 };

const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === 'class') node.className = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
    }
    node.append(...children.filter((c) => c !== null && c !== undefined));
    return node;
};

const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtOps = (n) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)} G`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)} k`;
    return `${Math.round(n)}`;
};
const nextTurn = () => new Promise((resolve) => setTimeout(resolve, 0));

export class CompareApp {
    /**
     * config = {
     *   title, summary,                    // header text (summary may contain HTML)
     *   scene,                             // sphereScene(...) or cubeScene(...) from scenes.mjs
     *   defaults?: {},                     // overrides of the scene's defaults
     *   panes: [ {                         // exactly two
     *       title, subtitle,
     *       sources(state) -> { vert, frag },   // names from shaderSources.mjs
     *       lightSpace?: 'eye' | 'object',      // which light position uLightPosition gets
     *       costConstants?: {},                 // uniform values that fix a shader's branches, for costing
     *       uniforms?(state) -> {},             // per-pane uniform overrides
     *   } ],
     *   extraControls?: [ control specs ],  // page-specific controls
     *   notes: [ { heading, html } ],
     * }
     */
    constructor(root, config) {
        this.root = root;
        this.config = config;
        this.scene = config.scene;
        this.state = { ...COMMON_DEFAULTS, ...this.scene.defaults, ...(config.defaults ?? {}) };
        for (const extra of config.extraControls ?? []) {
            if (extra.type !== 'button' && !(extra.id in this.state)) this.state[extra.id] = extra.value;
        }
        this.inputs = new Map();
        this.panes = [];
        this.paneNames = ['', ''];
        this.coverage = [0, 0];
        this.stress = null;
        this.meshKey = '';
        this.dirty = true;
        this.paused = false;
        this.analysisTimer = null;
        this.lastTime = null;   // set from the first animation frame, so dt never mixes clocks
    }

    async start() {
        try {
            this.#buildDom();
            this.panes = this.canvases.map((canvas) => new LitMeshPane(canvas));
            this.#rebuildMesh();
            this.#syncSources();
            this.#resizeCanvases();
            this.#syncControls();
            requestAnimationFrame(this.#tick);
        } catch (error) {
            console.error(error);
            this.root.replaceChildren(el('p', { class: 'fatal' }, `Could not start: ${error.message}`));
        }
    }

    // ---------------------------------------------------------------- state

    #changed(id) {
        if (this.scene.meshKey(this.state) !== this.meshKey) this.#rebuildMesh();
        if (id === 'canvasSize') this.#resizeCanvases();
        this.#syncSources();
        this.#syncControls();
        this.dirty = true;
        if (id === 'showDiff' && !this.state.showDiff) this.#clearDiff();
    }

    #rebuildMesh() {
        this.meshKey = this.scene.meshKey(this.state);
        this.mesh = this.scene.buildMesh(this.state);
        this.panes.forEach((pane) => pane.setMesh(this.mesh));
    }

    #resizeCanvases() {
        const size = this.state.canvasSize;
        this.panes.forEach((pane) => pane.resize(size));
        this.diffCanvas.width = size;
        this.diffCanvas.height = size;
        this.diffImage = this.diffContext.createImageData(size, size);
        this.buffers = null;
    }

    #syncSources() {
        this.config.panes.forEach((def, i) => {
            const { vert, frag } = def.sources(this.state);
            const names = `${vert} + ${frag}`;
            if (names !== this.paneNames[i]) {
                this.panes[i].setSources(SHADERS[vert], SHADERS[frag], def.costConstants ?? null);
                this.paneNames[i] = names;
                this.fileLabels[i].textContent = names;
            }
        });
    }

    #uniformsFor(i, frame) {
        const def = this.config.panes[i];
        const uniforms = { ...frame.uniforms };
        uniforms.uLightPosition = def.lightSpace === 'object'
            ? uniforms.uLightPositionObject
            : uniforms.uLightPositionEye;
        return { ...uniforms, ...(def.uniforms?.(this.state) ?? {}) };
    }

    // ------------------------------------------------------------------ DOM

    #makeControl(spec) {
        const { id } = spec;
        if (spec.type === 'button') {
            const button = el('button', { type: 'button', class: 'action' }, spec.label);
            button.addEventListener('click', () => {
                spec.action(this.state);
                this.#changed(id);
            });
            return button;
        }

        let input;
        let valueLabel = null;
        if (spec.type === 'range') {
            input = el('input', { type: 'range', min: spec.min, max: spec.max, step: spec.step });
            valueLabel = el('output');
            input.addEventListener('input', () => {
                this.state[id] = Number(input.value);
                this.#changed(id);
            });
        } else if (spec.type === 'select') {
            input = el('select', {}, ...spec.options.map(([value, text]) => el('option', { value }, text)));
            input.addEventListener('change', () => {
                const raw = input.value;
                this.state[id] = Number.isNaN(Number(raw)) ? raw : Number(raw);
                this.#changed(id);
            });
        } else {
            input = el('input', { type: 'checkbox' });
            input.addEventListener('change', () => {
                this.state[id] = input.checked;
                this.#changed(id);
            });
        }
        this.inputs.set(id, { input, valueLabel, spec });
        return el(
            'label', { class: `ctl ctl-${spec.type}` },
            el('span', { class: 'ctl-label' }, spec.label),
            input, valueLabel,
            spec.hint ? el('span', { class: 'ctl-hint' }, spec.hint) : null,
        );
    }

    #syncControls() {
        for (const [id, { input, valueLabel, spec }] of this.inputs) {
            const value = this.state[id];
            if (spec.type === 'checkbox') input.checked = Boolean(value);
            else input.value = String(value);
            if (valueLabel) valueLabel.textContent = Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
        }
    }

    #buildDom() {
        const { config } = this;
        const sides = ['left', 'right'];

        this.canvases = [];
        this.fileLabels = [];
        this.paneReadouts = [];

        const panes = config.panes.map((def, i) => {
            const canvas = el('canvas', { 'aria-label': def.title });
            const fileLabel = el('code', { class: 'files' });
            const readout = el('p', { class: 'readout' });
            this.canvases.push(canvas);
            this.fileLabels.push(fileLabel);
            this.paneReadouts.push(readout);
            return el(
                'figure', { class: `pane ${sides[i]}` },
                el('figcaption', {}, el('strong', {}, def.title), el('span', {}, def.subtitle), fileLabel),
                canvas, readout,
            );
        });

        this.diffCanvas = el('canvas', { 'aria-label': 'Pixel difference between the two canvases' });
        this.diffContext = this.diffCanvas.getContext('2d');
        this.diffReadout = el('p', { class: 'readout' });
        const diffPane = el(
            'figure', { class: 'pane diff' },
            el('figcaption', {}, el('strong', {}, 'Difference'), el('span', {}, 'bright = the two canvases disagree (|left − right|, amplified)')),
            this.diffCanvas, this.diffReadout,
        );

        const groups = [
            ...this.scene.controls,
            ...(config.extraControls?.length ? [{ group: 'This comparison', items: config.extraControls }] : []),
            {
                group: 'Difference image',
                items: [
                    { id: 'showDiff', type: 'checkbox', label: 'Show difference image' },
                    { id: 'diffAmp', type: 'range', label: 'Amplify', min: 1, max: 32, step: 1 },
                ],
            },
        ];
        const controls = el('section', { class: 'controls', 'aria-label': 'Controls' });
        for (const { group, items } of groups) {
            const fieldset = el('fieldset', {}, el('legend', {}, group));
            const buttons = items.filter((spec) => spec.type === 'button');
            if (buttons.length) fieldset.append(el('div', { class: 'button-row' }, ...buttons.map((spec) => this.#makeControl(spec))));
            items.filter((spec) => spec.type !== 'button').forEach((spec) => fieldset.append(this.#makeControl(spec)));
            controls.append(fieldset);
        }

        this.root.replaceChildren(
            el('header', { class: 'page-head' },
                el('p', { class: 'crumb' }, el('a', { href: 'index.html' }, 'All comparisons')),
                el('h1', {}, config.title),
                el('p', { class: 'summary', html: config.summary })),
            el('section', { class: 'stage' }, ...panes, diffPane),
            controls,
            this.#buildCostSection(),
            el('section', { class: 'notes' },
                ...config.notes.flatMap((n) => [el('h2', {}, n.heading), el('div', { html: n.html })])),
        );

        this.#attachPointerControls();
    }

    #buildCostSection() {
        const cell = (cls) => el('td', { class: cls });
        const row = (label, ...cells) => el('tr', {}, el('th', { scope: 'row' }, label), ...cells);

        this.cost = {
            vertexCost: [cell('l'), cell('r')],
            fragmentCost: [cell('l'), cell('r')],
            vertices: [cell('l'), cell('r')],
            pixels: [cell('l'), cell('r')],
            estimate: [cell('l'), cell('r')],
            measured: [cell('l'), cell('r')],
        };
        const { cost } = this;

        this.stressButton = el('button', { type: 'button', class: 'run', onclick: () => this.#runStress() }, 'Run stress test');
        this.stressStatus = el('span', { class: 'stress-status' });
        const passesControl = this.#makeControl({
            id: 'stressPasses', type: 'range', label: 'Passes per timing', min: 10, max: 1000, step: 10,
        });

        const table = el('table', { class: 'cost-table' },
            el('thead', {}, el('tr', {}, el('th', {}), el('th', { class: 'l' }, this.config.panes[0].title), el('th', { class: 'r' }, this.config.panes[1].title))),
            el('tbody', {},
                row('Cost per vertex', ...cost.vertexCost),
                row('Cost per shaded pixel', ...cost.fragmentCost),
                row('Vertices per frame', ...cost.vertices),
                row('Pixels shaded (measured)', ...cost.pixels),
                row('Estimated work per frame', ...cost.estimate),
                row('Timed stress test', ...cost.measured),
            ));

        return el('section', { class: 'costs' },
            el('h2', {}, 'What each approach costs (informal)'),
            el('p', { class: 'cost-intro', html:
                'Operation counts are read from the shader source and weighted by a rough ALU-op guess ' +
                '(mat4·mat4 = 112, mat4·vec4 = 28, normalize = 9, pow = 8, dot = 5, reflect = 12, one per interpolated float; ' +
                'for an if/else only the costlier branch is counted). ' +
                '<em>Estimated work</em> = vertices × cost per vertex + shaded pixels × cost per pixel. ' +
                'Real GPUs differ, so treat the numbers as a way to compare, not to predict.' }),
            table,
            el('div', { class: 'stress' }, this.stressButton, passesControl, this.stressStatus),
            el('p', { class: 'cost-intro', html:
                'The stress test redraws each canvas many times with the depth test off, so every fragment of every pass is shaded, ' +
                'then waits for the GPU. Run it a few times; browsers and drivers add noise, and a fast GPU may report both sides as nearly equal at small sizes. ' +
                'Raise the resolution to push the load toward pixels' +
                (this.scene.kind === 'sphere' ? ', or the subdivision level to push it toward vertices.' : '.') }),
        );
    }

    #attachPointerControls() {
        for (const canvas of this.canvases) {
            let last = null;
            canvas.addEventListener('pointerdown', (e) => {
                last = { x: e.clientX, y: e.clientY };
                canvas.setPointerCapture(e.pointerId);
            });
            canvas.addEventListener('pointermove', (e) => {
                if (!last) return;
                this.scene.drag?.(this.state, (e.clientX - last.x) * 0.4, (e.clientY - last.y) * 0.4);
                last = { x: e.clientX, y: e.clientY };
                this.#changed('view');
            });
            const end = () => { last = null; };
            canvas.addEventListener('pointerup', end);
            canvas.addEventListener('pointercancel', end);
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.scene.wheel?.(this.state, e.deltaY);
                this.#changed('view');
            }, { passive: false });
            canvas.style.touchAction = 'none';
        }
    }

    // ----------------------------------------------------------- main loop

    #tick = (now) => {
        requestAnimationFrame(this.#tick);
        const dt = this.lastTime === null ? 0 : Math.max(0, Math.min(0.1, (now - this.lastTime) / 1000));
        this.lastTime = now;
        if (this.paused) return;

        const animating = this.scene.isAnimating(this.state);
        if (!animating && !this.dirty) return;

        if (animating) {
            this.scene.advance(this.state, dt);
            this.#syncControls();
        }

        const frame = this.scene.frame(this.state);
        this.panes.forEach((pane, i) => pane.draw(this.#uniformsFor(i, frame), frame.marker?.uniforms));
        this.dirty = false;
        this.#scheduleAnalysis();
    };

    #scheduleAnalysis() {
        if (this.analysisTimer) return;
        this.analysisTimer = setTimeout(() => {
            this.analysisTimer = null;
            if (!this.paused) this.#analyse();
        }, 150);
    }

    // ------------------------------------------------- readback + analysis

    #clearDiff() {
        this.diffContext.clearRect(0, 0, this.diffCanvas.width, this.diffCanvas.height);
        this.diffReadout.textContent = 'Difference image is switched off.';
    }

    #analyse() {
        const { state: s, panes } = this;
        const size = s.canvasSize;
        const length = size * size * 4;
        if (!this.buffers || this.buffers[0].length !== length) {
            this.buffers = [new Uint8Array(length), new Uint8Array(length)];
        }
        const [a, b] = this.buffers;
        panes[0].readPixels(a);
        panes[1].readPixels(b);

        const covered = [0, 0];
        let union = 0;
        let sum = 0;
        let differing = 0;
        const out = this.diffImage.data;
        const amplify = s.diffAmp;
        const draw = s.showDiff;

        for (let y = 0; y < size; y += 1) {
            const srcRow = y * size * 4;
            const dstRow = (size - 1 - y) * size * 4; // readPixels is bottom-up
            for (let x = 0; x < size; x += 1) {
                const i = srcRow + x * 4;
                const inA = a[i + 3] !== 0;
                const inB = b[i + 3] !== 0;
                if (inA) covered[0] += 1;
                if (inB) covered[1] += 1;
                if (inA || inB) union += 1;
                const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
                sum += d;
                if (d > 2) differing += 1;
                if (draw) {
                    const o = dstRow + x * 4;
                    const v = Math.min(255, d * amplify);
                    out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = 255;
                }
            }
        }
        this.coverage = covered;

        if (draw) {
            this.diffContext.putImageData(this.diffImage, 0, 0);
            const mean = union ? sum / union : 0;
            const share = union ? (100 * differing) / union : 0;
            this.diffReadout.textContent =
                `Mean difference ${mean.toFixed(2)} / 255 over ${fmtInt(union)} covered pixels · ` +
                `${fmtInt(differing)} pixels (${share.toFixed(1)}%) differ by more than 2/255`;
        }
        this.paneReadouts.forEach((node, i) => {
            node.textContent = `${fmtInt(covered[i])} pixels covered · ${fmtInt(this.mesh.vertexCount)} vertices · ${fmtInt(this.mesh.triangleCount)} triangles`;
        });
        this.#updateCosts();
    }

    #updateCosts() {
        const { cost, panes, mesh, coverage } = this;
        const est = panes.map((pane, i) => estimateFrameCost(pane.analysis, mesh.vertexCount, coverage[i]));
        const maxEst = Math.max(...est.map((e) => e.total), 1);

        const bar = (value, max, text, cls) => {
            const wrap = el('div', { class: 'bar' }, el('span', { class: cls, style: `width:${(100 * value / max).toFixed(1)}%` }));
            return [el('div', { class: 'num' }, text), wrap];
        };

        panes.forEach((pane, i) => {
            const cls = i === 0 ? 'l' : 'r';
            const { vertex, fragment } = pane.analysis;
            cost.vertexCost[i].replaceChildren(
                el('div', { class: 'num' }, `${vertex.cost} ops`),
                el('div', { class: 'detail' }, describeCounts(vertex.counts)));
            cost.fragmentCost[i].replaceChildren(
                el('div', { class: 'num' }, `${fragment.cost} ops`),
                el('div', { class: 'detail' }, describeCounts(fragment.counts)));
            cost.vertices[i].textContent = fmtInt(mesh.vertexCount);
            cost.pixels[i].textContent = fmtInt(coverage[i]);
            cost.estimate[i].replaceChildren(
                ...bar(est[i].total, maxEst, `${fmtOps(est[i].total)} ops`, cls),
                el('div', { class: 'detail' }, `vertex stage ${fmtOps(est[i].vertexWork)} + fragment stage ${fmtOps(est[i].fragmentWork)}`));
        });

        if (this.stress) {
            const max = Math.max(...this.stress.msPerPass);
            const stale = this.stress.key !== this.#stressKey();
            panes.forEach((_, i) => {
                const children = bar(this.stress.msPerPass[i], max, `${this.stress.msPerPass[i].toFixed(3)} ms / pass`, i === 0 ? 'l' : 'r');
                if (stale) children.push(el('div', { class: 'detail stale' }, 'settings changed since this run'));
                cost.measured[i].replaceChildren(...children);
            });
        } else {
            panes.forEach((_, i) => { cost.measured[i].textContent = 'not run yet'; });
        }
    }

    #stressKey() {
        const s = this.state;
        return [this.meshKey, this.mesh.vertexCount, s.canvasSize, s.stressPasses, this.paneNames.join('|')].join(':');
    }

    async #runStress() {
        if (this.paused) return;
        this.paused = true;
        this.stressButton.disabled = true;
        this.stressStatus.textContent = 'Running…';
        await nextTurn();

        try {
            const frame = this.scene.frame(this.state);
            const passes = this.state.stressPasses;
            const best = [Infinity, Infinity];
            // Round 0 warms the pipeline and is discarded; sides alternate so
            // neither benefits from running second.
            for (let round = 0; round < 5; round += 1) {
                for (let i = 0; i < this.panes.length; i += 1) {
                    const ms = this.panes[i].timePasses(this.#uniformsFor(i, frame), passes);
                    if (round > 0) best[i] = Math.min(best[i], ms / passes);
                    await nextTurn();
                }
            }
            this.stress = { msPerPass: best, key: this.#stressKey() };
            const faster = best[0] < best[1] ? 0 : 1;
            const ratio = best[1 - faster] / best[faster];
            this.stressStatus.textContent =
                `${this.config.panes[faster].title} was ${ratio.toFixed(2)}× faster on this run.`;
        } finally {
            this.paused = false;
            this.stressButton.disabled = false;
            this.dirty = true;
            this.#updateCosts();
        }
    }
}

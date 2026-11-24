"use strict";

export const TEX_SIZE = 512;                    // size of each projected texture

// ---------------------------------------------------------------------------
// procedural textures, drawn with the 2D canvas API
// ---------------------------------------------------------------------------


export function newTexCanvas() {
    const c = document.createElement("canvas");
    c.width = TEX_SIZE;
    c.height = TEX_SIZE;
    return c;
}

function hsl(h, s, l) {
    return `hsl(${h} ${s}% ${l}%)`;
}

function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const rgb = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
    return [rgb[0] * 255, rgb[1] * 255, rgb[2] * 255];
}

function mulberry32(seed) {
    let a = seed;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// per-pixel helper for the textures that are easier to compute than to draw
function paintPixels(ctx, colourAt) {
    const img = ctx.createImageData(TEX_SIZE, TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
            const c = colourAt(x, y);
            const k = 4 * (y * TEX_SIZE + x);
            img.data[k] = c[0];
            img.data[k + 1] = c[1];
            img.data[k + 2] = c[2];
            img.data[k + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
}

export function drawColourChecker(ctx) {
    const n = 16;
    const cell = TEX_SIZE / n;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            ctx.fillStyle = ((i + j) & 1)
                ? hsl((i * 360 / n) % 360, 90, 58)
                : hsl((j * 360 / n + 180) % 360, 70, 22);
            ctx.fillRect(i * cell, j * cell, cell, cell);
        }
    }
}

// the texture from the original example: 8x8 pixel checks (on a 256 grid)
// inside a circle, black outside
export function drawCheckerDisc(ctx) {
    const cell = TEX_SIZE / 32;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(TEX_SIZE / 2, TEX_SIZE / 2, TEX_SIZE / 2, 0, 2 * Math.PI);
    ctx.clip();
    for (let i = 0; i < 32; i++) {
        for (let j = 0; j < 32; j++) {
            ctx.fillStyle = ((i + j) & 1) ? "#000" : "#fff";
            ctx.fillRect(i * cell, j * cell, cell, cell);
        }
    }
    ctx.restore();
}

// a registration grid with a marked top edge, so that roll and
// perspective distortion are easy to read
export function drawGrid(ctx) {
    const S = TEX_SIZE;
    ctx.fillStyle = "#0b1d3a";
    ctx.fillRect(0, 0, S, S);
    for (let k = 0; k <= S; k += 32) {
        ctx.strokeStyle = (k % 128 === 0) ? "#9cc5ff" : "#3f6ab8";
        ctx.lineWidth = (k % 128 === 0) ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(S, k); ctx.stroke();
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ff4d4d";                       // horizontal axis: red
    ctx.beginPath(); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke();
    ctx.strokeStyle = "#4dff88";                       // vertical axis: green
    ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.stroke();
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, S - 8, S - 8);
    ctx.fillStyle = "#ffffff";                         // "up" marker
    ctx.beginPath();
    ctx.moveTo(S / 2, 22); ctx.lineTo(S / 2 - 26, 70); ctx.lineTo(S / 2 + 26, 70);
    ctx.closePath(); ctx.fill();
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("UP", S / 2, 116);
}

export function drawRings(ctx) {
    const S = TEX_SIZE;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, S, S);
    const rings = 12;
    for (let k = rings; k >= 1; k--) {
        ctx.fillStyle = (k & 1) ? hsl((k * 360 / rings) % 360, 90, 55) : hsl((k * 360 / rings + 30) % 360, 60, 18);
        ctx.beginPath();
        ctx.arc(S / 2, S / 2, (S / 2) * k / rings, 0, 2 * Math.PI);
        ctx.fill();
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S);
    ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
    ctx.stroke();
}

export function drawRainbow(ctx) {
    const c = TEX_SIZE / 2;
    paintPixels(ctx, (x, y) => {
        const dx = x - c, dy = y - c;
        const hue = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1;
        const sat = Math.min(1, Math.hypot(dx, dy) / (c * 0.95));
        return hsvToRgb(hue, sat, 1.0);
    });
}

export function drawStainedGlass(ctx) {
    const rand = mulberry32(7);
    const n = 42;
    const sx = [], sy = [], hue = [], val = [];
    for (let k = 0; k < n; k++) {
        sx.push(rand() * TEX_SIZE);
        sy.push(rand() * TEX_SIZE);
        hue.push(rand());
        val.push(0.50 + 0.30 * rand());
    }
    paintPixels(ctx, (x, y) => {
        const frame = 12;
        if (x < frame || y < frame || x >= TEX_SIZE - frame || y >= TEX_SIZE - frame) return [18, 14, 12];
        let d1 = 1e9, d2 = 1e9, nearest = 0;
        for (let k = 0; k < n; k++) {
            const d = Math.hypot(x - sx[k], y - sy[k]);
            if (d < d1) { d2 = d1; d1 = d; nearest = k; }
            else if (d < d2) { d2 = d; }
        }
        if (d2 - d1 < 3.5) return [18, 14, 12];        // lead came between the panes
        const v = Math.min(1, val[nearest] + 0.35 * Math.max(0, 1 - d1 / 70));
        return hsvToRgb(hue[nearest], 0.78, v);
    });
}

export function drawStripes(ctx) {
    const palette = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#bf5af2"];
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    const band = 44;
    for (let k = -TEX_SIZE; k < 2 * TEX_SIZE; k += band) {
        ctx.fillStyle = palette[(Math.floor(k / band) % palette.length + palette.length) % palette.length];
        ctx.beginPath();
        ctx.moveTo(k, 0); ctx.lineTo(k + band, 0);
        ctx.lineTo(k + band - TEX_SIZE, TEX_SIZE); ctx.lineTo(k - TEX_SIZE, TEX_SIZE);
        ctx.closePath();
        ctx.fill();
    }
}

// a classic "gobo": light falling through a window
export function drawWindow(ctx) {
    const S = TEX_SIZE;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, S, S);
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, "#ffb347");
    g.addColorStop(1, "#fff6dc");
    ctx.fillStyle = g;
    const frame = 56, bar = 22;
    ctx.fillRect(frame, frame, S - 2 * frame, S - 2 * frame);
    ctx.fillStyle = "#000";
    ctx.fillRect(S / 2 - bar / 2, frame, bar, S - 2 * frame);
    ctx.fillRect(frame, S / 2 - bar / 2, S - 2 * frame, bar);
}

export function drawSoftSpot(ctx) {
    const S = TEX_SIZE;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.55, "#9a9a9a");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
}

// name + drawing function for each built-in texture
export const TEXTURE_MAKERS = [
    ["Colour checker", drawColourChecker],
    ["Checker disc (original)", drawCheckerDisc],
    ["Grid", drawGrid],
    ["Rings", drawRings],
    ["Rainbow", drawRainbow],
    ["Stained glass", drawStainedGlass],
    ["Stripes", drawStripes],
    ["Window", drawWindow],
    ["Soft spot", drawSoftSpot]
];

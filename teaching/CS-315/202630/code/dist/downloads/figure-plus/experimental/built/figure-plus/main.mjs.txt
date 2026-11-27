// main.mjs -- wires the model, the DIY WebGL2 renderer, the three.js view and
// the controls together. This replaces `window.onload = function init() {...}`.

import "./style.css";
import { POSES, theta, setTheta, DEFAULT_THETA, initAllNodes, initNodes, JOINT_CONTROLS } from "./figure-model.mjs";
import { createDiyRenderer } from "./diy-renderer.mjs";
import { createThreeView } from "./three-view.mjs";
import { createJointSliders, createPoseButtons } from "./controls.mjs";

const $ = (id) => document.getElementById(id);

function showError(message) {
  const box = $("error");
  box.hidden = false;
  box.textContent = message;
}

async function init() {
  initAllNodes();

  let diy = null;
  let three = null;

  try {
    diy = await createDiyRenderer($("gl-canvas"));
  } catch (error) {
    console.error(error);
    showError(`DIY WebGL2 view failed: ${error.message}`);
  }
  try {
    three = createThreeView($("three-canvas"));
  } catch (error) {
    console.error(error);
    showError(`three.js view failed: ${error.message}`);
  }

  // ---- controls
  const sliders = createJointSliders($("sliders"), () => {});
  createPoseButtons($("poses"), POSES, () => sliders.syncFromTheta());

  $("part-colours").addEventListener("change", (e) => { if (diy) diy.partColours = e.target.checked; });
  $("outlines").addEventListener("change", (e) => { if (diy) diy.outlines = e.target.checked; });
  for (const radio of document.querySelectorAll('input[name="three-mode"]')) {
    radio.addEventListener("change", (e) => { if (three && e.target.checked) three.mode = e.target.value; });
  }

  // ---- walk-cycle animation (an enhancement; the book only has sliders)
  const animate = $("animate");
  function applyWalk(t) {
    const swing = Math.sin(t * 3);
    const knee = (phase) => 40 * Math.max(0, Math.sin(t * 3 + phase));
    const pose = [...DEFAULT_THETA];
    pose[2] = 180 + 30 * swing;   // left upper arm
    pose[4] = 180 - 30 * swing;   // right upper arm
    pose[3] = -20;                // left lower arm
    pose[5] = -20;                // right lower arm
    pose[6] = 180 - 30 * swing;   // left upper leg
    pose[8] = 180 + 30 * swing;   // right upper leg
    pose[7] = knee(0.5);          // left lower leg
    pose[9] = knee(0.5 + Math.PI);// right lower leg
    for (let i = 0; i < pose.length; i++) theta[i] = pose[i];
    for (const { id } of JOINT_CONTROLS) initNodes(id);
  }

  // ---- frame loop
  const parityOut = $("parity");
  let frame = 0;
  function loop(time) {
    if (animate.checked) {
      applyWalk(time / 1000);
      sliders.syncFromTheta();
    }
    if (diy) diy.render();
    if (three) {
      three.render();
      if (frame++ % 10 === 0) {
        parityOut.textContent = three.parityError().toExponential(1);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

init();

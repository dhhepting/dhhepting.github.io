// controls.mjs -- builds the joint sliders from JOINT_CONTROLS (instead of eleven
// hand-copied <div>s) and keeps them in sync with theta[] in both directions.

import { JOINT_CONTROLS, theta, initNodes, setTheta } from "./figure-model.mjs";

/**
 * @param {HTMLElement} container  where the sliders go
 * @param {() => void}  onChange   called after any joint angle changes
 * @returns {{ syncFromTheta: () => void }}
 */
export function createJointSliders(container, onChange) {
  const inputs = new Map();

  for (const { id, label } of JOINT_CONTROLS) {
    const row = document.createElement("label");
    row.className = "slider-row";

    const name = document.createElement("span");
    name.className = "slider-name";
    name.textContent = label;

    const input = document.createElement("input");
    input.type = "range";
    input.id = `slider${id}`; // same ids as the book's slider0 .. slider10
    input.min = -180;
    input.max = 180;
    input.step = 10;
    input.value = theta[id];

    const readout = document.createElement("output");
    readout.htmlFor = input.id;
    readout.textContent = `${theta[id]}°`;

    // "input" fires continuously while dragging; the book's "change" only fired
    // on release. Number() matters: event.target.value is a *string*.
    input.addEventListener("input", (event) => {
      theta[id] = Number(event.target.value);
      initNodes(id);
      readout.textContent = `${theta[id]}°`;
      onChange();
    });

    row.append(name, input, readout);
    container.append(row);
    inputs.set(id, { input, readout });
  }

  return {
    syncFromTheta() {
      for (const [id, { input, readout }] of inputs) {
        input.value = theta[id];
        readout.textContent = `${Math.round(theta[id])}°`;
      }
    },
  };
}

/** Pose buttons: each one loads a full theta[] array. */
export function createPoseButtons(container, poses, onChange) {
  for (const [name, values] of Object.entries(poses)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("click", () => {
      setTheta(values);
      onChange();
    });
    container.append(button);
  }
}

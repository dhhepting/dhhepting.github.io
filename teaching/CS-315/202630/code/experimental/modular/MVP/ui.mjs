// The interface: one table describes every control; buildPanel() makes the DOM
// from it and syncControls() keeps it in step with the state object.
// To add a control, add a line to GROUPS. Nothing else needs to change.

const xyz = (path, name, min, max, step) =>
  ['x', 'y', 'z'].map((axis, i) => ({ type: 'range', path: `${path}.${i}`, label: `${name} ${axis}`, min, max, step }));

const isMode = mode => s => s.camera.mode === mode;
const isProjection = type => s => s.projection.type === type;

export const GROUPS = [
  { title: 'Camera animation', controls: [
    { type: 'checkbox', path: 'animate', label: 'Orbit the camera' },
  ] },
  { title: 'Model matrix M', controls: [
    ...xyz('model.translate', 'translate', -4, 4, 0.1),
    ...xyz('model.rotate', 'rotate', -180, 180, 1),
    ...xyz('model.scale', 'scale', 0.2, 3, 0.05),
  ] },
  { title: 'Camera setup', controls: [
    { type: 'choice', path: 'camera.mode', options: [['lookAt', 'lookAt(eye, at, up)'], ['euler', 'Position, pitch, yaw, roll']] },
  ] },
  { title: 'View matrix V: lookAt', when: isMode('lookAt'), controls: [
    ...xyz('camera.lookAt.eye', 'eye', -12, 12, 0.1),
    ...xyz('camera.lookAt.at', 'at', -6, 6, 0.1),
    ...xyz('camera.lookAt.up', 'up', -1, 1, 0.1),
  ] },
  { title: 'View matrix V: pitch, yaw, roll', when: isMode('euler'), controls: [
    ...xyz('camera.euler.position', 'position', -12, 12, 0.1),
    { type: 'range', path: 'camera.euler.pitch', label: 'pitch', min: -180, max: 180, step: 1 },
    { type: 'range', path: 'camera.euler.yaw', label: 'yaw', min: -180, max: 180, step: 1 },
    { type: 'range', path: 'camera.euler.roll', label: 'roll', min: -180, max: 180, step: 1 },
  ] },
  { title: 'Projection type', controls: [
    { type: 'choice', path: 'projection.type', options: [['perspective', 'Perspective'], ['parallel', 'Parallel']] },
  ] },
  { title: 'Projection matrix P', controls: [
    { type: 'range', path: 'projection.fovy', label: 'field of view', min: 10, max: 120, step: 1, when: isProjection('perspective') },
    { type: 'range', path: 'projection.size', label: 'half height', min: 0.5, max: 8, step: 0.1, when: isProjection('parallel') },
    { type: 'range', path: 'projection.near', label: 'near', min: 0.1, max: 10, step: 0.1 },
    { type: 'range', path: 'projection.far', label: 'far', min: 5, max: 60, step: 0.5 },
  ] },
];

const getPath = (obj, path) => path.split('.').reduce((o, key) => o[key], obj);

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, key) => o[key], obj)[last] = value;
}

const decimals = step => (String(step).split('.')[1] || '').length;

const bindings = [];   // { path, element, output, control, step } for every control
const sections = [];   // { element, group }

export function buildPanel(root, state, onChange) {
  for (const group of GROUPS) {
    const section = document.createElement('section');
    section.className = 'group';
    const heading = document.createElement('h2');
    heading.textContent = group.title;
    section.append(heading);
    sections.push({ element: section, group });

    for (const control of group.controls) {
      const row = document.createElement(control.type === 'choice' ? 'div' : 'label');
      row.className = `control ${control.type}`;
      const binding = { control, row, path: control.path };

      if (control.type === 'range') {
        const name = document.createElement('span');
        name.textContent = control.label;
        const input = Object.assign(document.createElement('input'), {
          type: 'range', min: control.min, max: control.max, step: control.step,
        });
        const output = document.createElement('output');
        input.addEventListener('input', () => { setPath(state, control.path, Number(input.value)); onChange(); });
        row.append(name, input, output);
        Object.assign(binding, { input, output, places: decimals(control.step) });
      } else if (control.type === 'checkbox') {
        const input = Object.assign(document.createElement('input'), { type: 'checkbox' });
        input.addEventListener('change', () => { setPath(state, control.path, input.checked); onChange(); });
        row.append(input, document.createTextNode(` ${control.label}`));
        binding.input = input;
      } else if (control.type === 'choice') {
        binding.radios = control.options.map(([value, text]) => {
          const option = document.createElement('label');
          const radio = Object.assign(document.createElement('input'), { type: 'radio', name: control.path, value });
          radio.addEventListener('change', () => { setPath(state, control.path, value); onChange(); });
          option.append(radio, document.createTextNode(` ${text}`));
          row.append(option);
          return radio;
        });
      }
      section.append(row);
      bindings.push(binding);
    }
    root.append(section);
  }
  syncControls(state);
}

// Copy the state into the controls and show only the controls that apply.
export function syncControls(state) {
  for (const { element, group } of sections) {
    element.hidden = group.when ? !group.when(state) : false;
  }
  for (const b of bindings) {
    const value = getPath(state, b.path);
    b.row.hidden = b.control.when ? !b.control.when(state) : false;
    if (b.control.type === 'range') {
      b.input.value = value;
      b.output.textContent = Number(value).toFixed(b.places);
    } else if (b.control.type === 'checkbox') {
      b.input.checked = value;
    } else {
      for (const radio of b.radios) radio.checked = radio.value === value;
    }
  }
}

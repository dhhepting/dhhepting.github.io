import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// set up WebGL renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//
// set up perspective camera and controls
//

// Camera frustum vertical field of view
const fov = 45; 
// Camera frustum aspect ratio
const aspectRatio = window.innerWidth / window.innerHeight;
// Camera frustum near plane
const near = 1;
// Camera frustum far plane
const far = 500;
const camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
camera.position.set(0, 0, 300);
camera.lookAt(new THREE.Vector3(0, 0, 0));
const controls = new OrbitControls(camera, renderer.domElement);

// make a scene :-)
const scene = new THREE.Scene();

// set up triangle
const defaultLevel = 5;
const initialPoints = [[-100, -50], [0, 100], [100, -50]];
drawTriangle(...initialPoints);
sierpinski(...initialPoints);

renderer.render(scene, camera);
controls.update();

animate();

window.addEventListener('resize', onWindowResize);

function drawTriangle(p1, p2, p3) {

  const material = new THREE.LineBasicMaterial({color: new THREE.Color( 1, 0, 0 )});
  const points = [];
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
  points.push(new THREE.Vector3(...[...p1, 0]));
  points.push(new THREE.Vector3(...[...p2, 0]));
  points.push(new THREE.Vector3(...[...p3, 0]));
  points.push(new THREE.Vector3(...[...p1, 0]));
  let geometry = new THREE.BufferGeometry().setFromPoints(points)
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

function sierpinski(p1, p2, p3, level = defaultLevel) {
    // helper 
    function getMidPoints(p1, p2, p3) {
        const mid = (p1, p2) => [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        return [mid(p1, p2), mid(p2, p3), mid(p3, p1)];
    } 
    if (level > 0) {
        const midpoints = getMidPoints(p1, p2, p3);
        drawTriangle(...midpoints, {level});
        sierpinski(p1, midpoints[0], midpoints[2], level - 1);
        sierpinski(midpoints[0], p2, midpoints[1], level - 1);
        sierpinski(midpoints[2], midpoints[1], p3, level - 1);
    }
}

function render() {
  controls.update();
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

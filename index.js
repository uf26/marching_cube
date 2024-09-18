
const CUBE_SIZE = new THREE.Vector3(2, 2, 2);
const SPHERE_RADIUS = 0.1;


let oldMouse = null;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 
    window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const group = new THREE.Group();
scene.add(group);

// cube wireframe
const cube_geometry = new THREE.BoxGeometry(...CUBE_SIZE.toArray());
const cube_edges = new THREE.EdgesGeometry(cube_geometry);
const cube_material = new THREE.LineBasicMaterial({ color: 0xffffff });
const cube = new THREE.LineSegments(cube_edges, cube_material);
group.add(cube);

// spheres in the corners
function getPos(i) {
  return new THREE.Vector3(
    ((i & 1) >> 0) * CUBE_SIZE.x - CUBE_SIZE.x / 2,
    ((i & 2) >> 1) * CUBE_SIZE.y - CUBE_SIZE.y / 2,
    ((i & 4) >> 2) * CUBE_SIZE.z - CUBE_SIZE.z / 2);
}

const corners = new THREE.Group();
group.add(corners);
const sphere_geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 16, 16);
for (let i = 0; i < 8; i++) {
  const pos = getPos(i).toArray();

  const sphere_material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sphere = new THREE.Mesh(sphere_geometry, sphere_material);
  sphere.position.set(...pos);
  sphere.index = i;
  sphere.solid = false;
  corners.add(sphere);
}

camera.position.z = 5;

// triangles
const triangles = new THREE.Group();
group.add(triangles);
function recalculateTriangles() {
  triangles.children = [];

  let index = 0;
  corners.children.forEach((corner) => index |= corner.solid << corner.index);

  const triangles_entry = TRIANGLE_TABLE[index];
  for (let i = 0; i < triangles_entry.length; i += 3) {
    if (triangles_entry[i] == -1)
      break;

    const positions = new Float32Array(9);
    for (let j = 0; j <  3; j++) {
      const edges = EDGE_VERTEX_INDICES[triangles_entry[i + j]];

      const posA = getPos(edges[0]);
      const posB = getPos(edges[1]);
      
      const pos = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);

      positions[j * 3] = pos.x;
      positions[j * 3 + 1] = pos.y;
      positions[j * 3 + 2] = pos.z;
    }
    console.log(positions);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const triangle = new THREE.Mesh(geometry, material);
    triangles.add(triangle);

    const edges = new THREE.EdgesGeometry(geometry);
    const outline_material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const outline = new THREE.LineSegments(edges, outline_material);
    triangles.add(outline);
  }
  console.log(triangles);
}

// Animation loop
function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

render();

window.addEventListener("click", (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1);
  
  const rayCaster = new THREE.Raycaster();
  rayCaster.setFromCamera(mouse, camera);

  const objects = rayCaster.intersectObjects(corners.children);
  objects.forEach((intersection) => {
    const o = intersection.object;
    o.solid = !o.solid;
    o.material.color.set(o.material.color.getHex() === 0xffffff ? 0xff0000 : 0xffffff);
    console.log(o.index, o.solid);
  });

  if (objects.length > 0)
    recalculateTriangles();

}, false);

function move(event, touch=false) {
  if (event.buttons == 0)
    return;

  const pos = touch ? event.touches[0] : event;
  const mouse = new THREE.Vector2(
    (pos.clientX / window.innerWidth) * 2 - 1,
    -(pos.clientY / window.innerHeight) * 2 + 1);

  if (oldMouse === null) {  
    oldMouse = mouse;
    return;
  }

  const diff = new THREE.Vector2().subVectors(mouse, oldMouse);
  oldMouse = mouse;

  const quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-diff.y, diff.x, 0, 'XYZ'));
  group.quaternion.multiplyQuaternions(quaternion, group.quaternion);
}
window.addEventListener("mousemove", move, false);
window.addEventListener("mouseup", () => oldMouse = null, false);
window.addEventListener("touchmove", (event) => move(event, true), false);
window.addEventListener("touchend", () => oldMouse = null, false);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

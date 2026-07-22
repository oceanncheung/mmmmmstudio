const stage = document.querySelector('#stage');
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: false,
});
renderer.setClearColor(0x000000, 0);
renderer.setClearAlpha(0);
stage.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 0.82, 6.8);

const cup = new THREE.Group();
scene.add(cup);

scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5a50, 2.35));

const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
keyLight.position.set(4, 4.5, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xfff0df, 1.2);
fillLight.position.set(-5, 1.5, 3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
rimLight.position.set(-3, 4, -5);
scene.add(rimLight);

const textureLoader = new THREE.TextureLoader();
const wrapTextureSource = window.CUP_WRAP_DATA_URI || './assets/cup-wrap.png';
const bodyTopRadius = 1.12;
const bodyBottomRadius = 0.84;
const bodyHeight = 2.55;
const bodyYOffset = -0.12;
const logoRowCenters = [0.91, 0.675, 0.44, 0.205, -0.03, -0.265, -0.5, -0.735, -0.97, -1.205];
const logoColumnCount = 7;
const logoPrints = [];

function createTaperedCupGeometry(topRadius, bottomRadius, height, radialSegments = 192, heightSegments = 64) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const slope = (topRadius - bottomRadius) / height;
  const normalScale = 1 / Math.sqrt(1 + slope * slope);
  const rowStride = radialSegments + 1;

  for (let row = 0; row <= heightSegments; row += 1) {
    const v = row / heightSegments;
    const radius = bottomRadius + (topRadius - bottomRadius) * v;
    const y = -height / 2 + height * v;

    for (let column = 0; column <= radialSegments; column += 1) {
      const u = column / radialSegments;
      const angle = u * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      positions.push(radius * sin, y, radius * cos);
      normals.push(sin * normalScale, -slope * normalScale, cos * normalScale);
      uvs.push(u, v);
    }
  }

  for (let row = 0; row < heightSegments; row += 1) {
    for (let column = 0; column < radialSegments; column += 1) {
      const a = row * rowStride + column;
      const b = (row + 1) * rowStride + column;
      const c = (row + 1) * rowStride + column + 1;
      const d = row * rowStride + column + 1;

      indices.push(a, d, b, d, c, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

function createLogoTexture(sourceImage) {
  const crop = { x: 143, y: 33, width: 156, height: 86 };
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = crop.width;
  logoCanvas.height = crop.height;
  const logoContext = logoCanvas.getContext('2d');
  logoContext.drawImage(sourceImage, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  const imageData = logoContext.getImageData(0, 0, crop.width, crop.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const isLogoPixel = pixels[i] < 55 && pixels[i + 1] < 60 && pixels[i + 2] < 70;
    pixels[i] = 10;
    pixels[i + 1] = 12;
    pixels[i + 2] = 13;
    pixels[i + 3] = isLogoPixel ? 255 : 0;
  }
  logoContext.putImageData(imageData, 0, 0);

  const logoTexture = new THREE.CanvasTexture(logoCanvas);
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  logoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return logoTexture;
}

function radiusAtY(y) {
  const bodyLocalY = y - bodyYOffset;
  const v = THREE.MathUtils.clamp((bodyLocalY + bodyHeight / 2) / bodyHeight, 0, 1);
  return bodyBottomRadius + (bodyTopRadius - bodyBottomRadius) * v;
}

function createCurvedLogoGeometry(centerAngle, centerY, width, height, radialSegments = 12, heightSegments = 4) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const rowStride = radialSegments + 1;

  for (let row = 0; row <= heightSegments; row += 1) {
    const v = row / heightSegments;
    const y = centerY + (v - 0.5) * height;
    const radius = radiusAtY(y);

    for (let column = 0; column <= radialSegments; column += 1) {
      const u = column / radialSegments;
      const angle = centerAngle + ((u - 0.5) * width) / radius;
      const printRadius = radius + 0.003;
      positions.push(Math.sin(angle) * printRadius, y, Math.cos(angle) * printRadius);
      uvs.push(u, v);
    }
  }

  for (let row = 0; row < heightSegments; row += 1) {
    for (let column = 0; column < radialSegments; column += 1) {
      const a = row * rowStride + column;
      const b = (row + 1) * rowStride + column;
      const c = (row + 1) * rowStride + column + 1;
      const d = row * rowStride + column + 1;
      indices.push(a, d, b, d, c, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function addLogoPrints(logoTexture) {
  const startAngle = 0.28;
  const columnStep = (Math.PI * 2) / logoColumnCount;
  const logoWidth = 0.32;
  const logoHeight = 0.176;

  logoRowCenters.forEach((y, rowIndex) => {
    const rowOffset = rowIndex % 2 === 0 ? 0 : columnStep / 2;
    for (let column = 0; column < logoColumnCount; column += 1) {
      const angle = startAngle + rowOffset + (column - Math.floor(logoColumnCount / 2)) * columnStep;
      const logoMaterial = new THREE.MeshBasicMaterial({
        map: logoTexture,
        transparent: true,
        alphaTest: 0.08,
        opacity: 1,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        side: THREE.FrontSide,
      });
      const logo = new THREE.Mesh(createCurvedLogoGeometry(angle, y, logoWidth, logoHeight), logoMaterial);
      logo.userData.angle = angle;
      logoPrints.push(logo);
      cup.add(logo);
    }
  });
}

textureLoader.load(wrapTextureSource, (wrapTexture) => {
  const logoTexture = createLogoTexture(wrapTexture.image);

  const body = new THREE.Mesh(
    createTaperedCupGeometry(bodyTopRadius, bodyBottomRadius, bodyHeight),
    new THREE.MeshStandardMaterial({
      color: 0xf85513,
      roughness: 0.58,
      metalness: 0,
    }),
  );
  body.position.y = bodyYOffset;
  cup.add(body);
  addLogoPrints(logoTexture);

  const blackRimCover = new THREE.Mesh(
    new THREE.CylinderGeometry(1.185, 1.185, 0.12, 192, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.62,
      metalness: 0.01,
    }),
  );
  blackRimCover.position.y = 0.99;
  cup.add(blackRimCover);

  const insetBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.62, 0.08, 192),
    new THREE.MeshStandardMaterial({
      color: 0xf5f0e8,
      roughness: 0.74,
    }),
  );
  insetBase.position.y = -1.415;
  cup.add(insetBase);

  const baseShadow = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.012, 10, 192),
    new THREE.MeshStandardMaterial({
      color: 0xd6cfc5,
      roughness: 0.8,
    }),
  );
  baseShadow.rotation.x = Math.PI / 2;
  baseShadow.position.y = -1.375;
  cup.add(baseShadow);

  const hiddenPaperLip = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.012, 10, 192),
    new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.75,
    }),
  );
  hiddenPaperLip.rotation.x = Math.PI / 2;
  hiddenPaperLip.position.y = 1.075;
  cup.add(hiddenPaperLip);
  fitCameraToCup();

});

const blackPlastic = new THREE.MeshStandardMaterial({
  color: 0x060606,
  roughness: 0.5,
  metalness: 0.02,
});

const lidOuterRadius = 1.18;

const lidProfile = [
  [1.045, 0.955],
  [1.1, 0.982],
  [1.12, 1.018],
  [lidOuterRadius, 1.06],
  [lidOuterRadius, 1.118],
  [1.13, 1.16],
  [1.045, 1.19],
  [1.02, 1.43],
  [0.93, 1.495],
  [0.72, 1.515],
];

const lid = new THREE.Mesh(
  new THREE.LatheGeometry(
    lidProfile.map(([radius, y]) => new THREE.Vector2(radius, y)),
    192,
  ),
  blackPlastic,
);
cup.add(lid);

const lowerLidRim = new THREE.Mesh(new THREE.TorusGeometry(lidOuterRadius - 0.02, 0.032, 12, 192), blackPlastic);
lowerLidRim.rotation.x = Math.PI / 2;
lowerLidRim.position.y = 1.066;
cup.add(lowerLidRim);

const snapLip = new THREE.Mesh(new THREE.TorusGeometry(1.09, 0.012, 8, 192), blackPlastic);
snapLip.rotation.x = Math.PI / 2;
snapLip.position.y = 0.965;
cup.add(snapLip);

const params = new URLSearchParams(window.location.search);
const speed = Number.parseFloat(params.get('speed') || '0.0115');
const startAngle = Number.parseFloat(params.get('angle') || '-0.35');
cup.rotation.y = Number.isFinite(startAngle) ? startAngle : -0.35;

function resize() {
  const { clientWidth, clientHeight } = stage;
  const compact = window.matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2));
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
  fitCameraToCup();
  renderFrame(false);
}

function fitCameraToCup() {
  if (!stage.clientWidth || !stage.clientHeight) return;
  cup.scale.setScalar(1);
  cup.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(cup);
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const clearance = 1.08;
  const radialEnvelope = Math.max(size.x, size.z) / 2;
  const verticalEnvelope = size.y / 2;
  // The cup is rotationally symmetric: fit its radial envelope to the
  // horizontal field, and its full height plus the nearest radial depth to
  // the vertical field. This remains stable through rotation without the
  // excess empty space of a full bounding sphere.
  const horizontalDistance = radialEnvelope / Math.sin((horizontalFov / 2) / clearance);
  const verticalDistance = radialEnvelope + (verticalEnvelope * clearance) / Math.tan(verticalFov / 2);
  const distance = Math.max(horizontalDistance, verticalDistance);
  camera.position.set(center.x, center.y, center.z + distance);
  camera.near = Math.max(0.01, distance - size.z * 2);
  camera.far = distance + size.z * 4;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

let animationFrame = 0;
let embedVisible = true;
let parentVisible = true;

function shouldAnimate() {
  return embedVisible && parentVisible && !document.hidden;
}

function renderFrame(advance = true) {
  if (advance) cup.rotation.y += Number.isFinite(speed) ? speed : 0.0115;
  logoPrints.forEach((logo) => {
    const facing = Math.cos(cup.rotation.y + logo.userData.angle);
    const edgeFade = THREE.MathUtils.smoothstep(facing, 0.18, 0.55);
    logo.material.opacity = edgeFade;
    logo.visible = edgeFade > 0.02;
  });
  renderer.render(scene, camera);
}

function animate() {
  animationFrame = 0;
  if (!shouldAnimate()) return;
  renderFrame(true);
  animationFrame = requestAnimationFrame(animate);
}

function syncAnimation() {
  if (shouldAnimate()) {
    if (!animationFrame) animationFrame = requestAnimationFrame(animate);
  } else if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
}

if ('IntersectionObserver' in window) {
  const visibilityObserver = new IntersectionObserver((entries) => {
    embedVisible = entries.some((entry) => entry.isIntersecting);
    syncAnimation();
  }, { threshold: 0 });
  visibilityObserver.observe(stage);
}
document.addEventListener('visibilitychange', syncAnimation);
const EMBED_KIND = 'v7-cup';
const EMBED_PROTOCOL_VERSION = 1;
let expectedParentOrigin = '';
if (window.parent !== window && document.referrer) {
  try {
    const parentOrigin = new URL(document.referrer).origin;
    if (parentOrigin && parentOrigin !== 'null') expectedParentOrigin = parentOrigin;
  } catch (error) {}
}
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!expectedParentOrigin || event.source !== window.parent || event.origin !== expectedParentOrigin) return;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  if (data.__mmsEmbedVisibility !== 1 || data.kind !== EMBED_KIND) return;
  if (data.protocolVersion !== EMBED_PROTOCOL_VERSION || typeof data.visible !== 'boolean') return;
  parentVisible = data.visible;
  syncAnimation();
});

window.addEventListener('resize', resize);
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
resize();
renderFrame(false);
let embedReadyPosted = false;
function postEmbedReady() {
  if (embedReadyPosted || !expectedParentOrigin) return;
  renderFrame(false);
  try {
    window.parent.postMessage({
      __mmsEmbedReady: 1,
      protocolVersion: EMBED_PROTOCOL_VERSION,
      kind: EMBED_KIND
    }, expectedParentOrigin);
    embedReadyPosted = true;
  } catch (error) {}
}
requestAnimationFrame(postEmbedReady);
window.addEventListener('load', postEmbedReady, { once: true });
setTimeout(postEmbedReady, 250);
syncAnimation();

window.v7Cup = {
  scene,
  cup,
  renderer,
  camera,
};

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer, fish;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight * 0.8);
  document.getElementById("container").appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambient);

  const loader = new GLTFLoader();
  loader.load("seabass.glb", function (gltf) {
    fish = gltf.scene;
    fish.scale.set(1.5, 1.5, 1.5);
    scene.add(fish);
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (fish) {
    fish.rotation.y += 0.005;
  }

  renderer.render(scene, camera);
}

window.speak = function () {
  const utterance = new SpeechSynthesisUtterance("釣りタイムへようこそ");
  utterance.lang = "ja-JP";

  utterance.onstart = () => {
    if (fish) fish.scale.set(1.6, 1.4, 1.6);
  };

  utterance.onend = () => {
    if (fish) fish.scale.set(1.5, 1.5, 1.5);
  };

  speechSynthesis.speak(utterance);
};

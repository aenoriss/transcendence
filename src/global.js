// Mandatory A-Frame import
require('aframe');

// Additional optional components
require('aframe-animation-component');
require('aframe-event-set-component');
require('aframe-layout-component');
require('aframe-template-component');
require("aframe-particle-system-component")

require('./components/movementDetector');
require('./components/teleport');
require('./components/showInfo');

require('aframe-extras');

const Ammo = require("ammo.js/builds/ammo.wasm.js");
const AmmoWasm = require("ammo.js/builds/ammo.wasm.wasm");
window.Ammo = Ammo.bind(undefined, {
  locateFile(path) {
    if (path.endsWith(".wasm")) {
      return AmmoWasm;
    }
    return path;
  }
});
require("aframe-physics-system")


// Custom components in components/
// require('./components/foo');

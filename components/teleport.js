/* global AFRAME, THREE */

// The four worlds. `goTo` on a portal names one of these keys.
// Each has the map it shows, where you land, where the return portal stands, the fog and
// accent colour of its floor, and the artworks hung in it.
var WORLDS = {
  map0: { map: 'map1', label: 'WORLD 01', spawn: [0, 3, 0],     fog: '#1a0410', accent: '#ff3df2', artworks: [] },
  map1: { map: 'map2', label: 'WORLD 02', spawn: [-31, 3, -50], back: [-47, 0, -45], backRot: 90,  fog: '#02101a', accent: '#35e6ff', artworks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  map2: { map: 'map3', label: 'WORLD 03', spawn: [6, 3, -5],    back: [37, 0, -6],    backRot: 270, fog: '#041a08', accent: '#52ff6e', artworks: [13, 14, 15] },
  map3: { map: 'map4', label: 'WORLD 04', spawn: [-26, 3, -42], back: [-54, 0, -42],  backRot: 90,  fog: '#06061c', accent: '#9a86ff', artworks: [] },
};

// Shows one world and hides the rest: its map, its artworks, its portals and its fog.
function showWorld(key) {
  var world = WORLDS[key], scene = document.querySelector('a-scene');
  Object.keys(WORLDS).forEach(function (k) {
    document.getElementById(WORLDS[k].map).setAttribute('visible', k === key);
  });
  for (var i = 1; i <= 15; i++) {
    document.getElementById('artwork' + i).setAttribute('visible', world.artworks.indexOf(i) !== -1);
  }
  // The start world has the three outbound portals. Every other world has one portal back.
  var home = key === 'map0', back = document.getElementById('portalSpawn');
  ['portal1', 'portal2', 'portal3'].forEach(function (id) { document.getElementById(id).setAttribute('visible', home); });
  back.setAttribute('visible', !home);
  if (!home) {
    back.setAttribute('position', { x: world.back[0], y: -2, z: world.back[2] });
    back.setAttribute('rotation', { x: 0, y: world.backRot, z: 0 });
  }
  scene.setAttribute('fog', { type: 'exponential', color: world.fog, density: 0.0042 });
  var glow = document.getElementById('glow');
  if (glow) glow.setAttribute('light', 'color', world.accent);
  scene.emit('worldchange', { key: key, map: world.map, label: world.label, accent: world.accent });
}

AFRAME.registerComponent('teleport', {
  schema: {
    goTo: { default: 'map0' },
    radius: { default: 7 },
  },

  init: function () {
    this.rig = document.getElementById('rig');
    this.portalPos = new THREE.Vector3();
    this.armed = true;
  },

  tick: function () {
    if (!this.el.object3D.visible) return;
    var rig = this.rig.object3D.position;
    this.portalPos.copy(this.el.object3D.position);
    // Measured on the floor plane, so the rig's eye height does not shrink the trigger.
    var dx = rig.x - this.portalPos.x, dz = rig.z - this.portalPos.z;
    var near = dx * dx + dz * dz < this.data.radius * this.data.radius;
    if (!near) { this.armed = true; return; }
    if (!this.armed) return;
    this.armed = false;

    var key = this.data.goTo, world = WORLDS[key], scene = this.el.sceneEl;
    scene.emit('portalenter', { accent: world.accent });
    // The swap happens under the flash, so the new world is there when it clears.
    setTimeout(function () {
      showWorld(key);
      document.getElementById('rig').object3D.position.set(world.spawn[0], world.spawn[1], world.spawn[2]);
    }, 260);
  },
});

// Sets the first world's fog and labels once the scene is ready.
AFRAME.registerComponent('worlds', {
  init: function () {
    var run = function () { showWorld('map0'); };
    if (this.el.hasLoaded) run(); else this.el.addEventListener('loaded', run);
  },
});

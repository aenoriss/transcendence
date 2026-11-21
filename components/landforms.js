/* global AFRAME, THREE */

// Rideable terrain: kickers, humps and tables that rise out of each world's floor.
//
// They are built the way the worlds themselves are drawn: dark faceted faces with a glowing
// beam along every edge, both taken from the materials of the map they stand in. So a ramp
// reads as part of the landscape, in that world's colour.
//
// A landform's local -z is the direction you ride it. `yaw` turns that in degrees:
// 0 rides toward -z, -90 toward +x, 180 toward +z, 90 toward -x.
var LANDFORMS = {
  map1: [
    { shape: 'kicker', x: 62,  z: 46,  yaw: -90, w: 28, l: 28, h: 6.5 },   // launches toward the first portal
    { shape: 'hump',   x: 30,  z: -30, yaw: 0,   w: 30, l: 34, h: 4.5 },
    { shape: 'table',  x: 45,  z: -8,  yaw: -90, w: 26, l: 38, h: 3.8 },
    { shape: 'kicker', x: 95,  z: 110, yaw: 180, w: 26, l: 26, h: 6 },
  ],
  map2: [
    { shape: 'hump',   x: 0,   z: -20, yaw: -90, w: 30, l: 34, h: 4.5 },
    { shape: 'kicker', x: 60,  z: -5,  yaw: -90, w: 28, l: 28, h: 6.5 },
    { shape: 'table',  x: 110, z: 5,   yaw: -90, w: 26, l: 40, h: 3.8 },
  ],
  map3: [
    { shape: 'kicker', x: 18,  z: -40, yaw: 0,   w: 24, l: 28, h: 6.5 },
    { shape: 'hump',   x: 100, z: 42,  yaw: -90, w: 26, l: 34, h: 4.5 },
  ],
  map4: [
    { shape: 'kicker', x: 10,  z: -45, yaw: -90, w: 28, l: 28, h: 6.5 },
    { shape: 'table',  x: 70,  z: -30, yaw: -90, w: 26, l: 40, h: 3.8 },
    { shape: 'hump',   x: 140, z: -55, yaw: -90, w: 30, l: 34, h: 4.5 },
  ],
};

// Height along the ride direction, 0 at the start and 1 at the far end, as a share of `h`.
var PROFILES = {
  kicker: function (t) { return Math.pow(t, 1.6); },                 // rises to a lip, then drops
  hump: function (t) { return Math.sin(Math.PI * t); },              // up and over
  table: function (t) {                                               // up, flat, down
    var s = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
    return s * s * (3 - 2 * s);
  },
};

// The sides fall away to the floor, so a landform has no walls of its own.
function sideFalloff(u) {
  var a = Math.abs(u);
  if (a < 0.5) return 1;
  var s = 1 - (a - 0.5) / 0.5;
  return s * s * (3 - 2 * s);
}

// A small seeded generator, so the facets are the same on every load.
function seeded(seed) {
  var s = seed * 9301 + 49297;
  return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function buildSurface(spec, rand) {
  // Few, large faces, like the mountains around them.
  var nx = 4, nz = 5, w = spec.w, l = spec.l, h = spec.h;
  var profile = PROFILES[spec.shape];
  var g = new THREE.Geometry();
  var i, j;
  for (j = 0; j <= nz; j++) {
    for (i = 0; i <= nx; i++) {
      var t = j / nz, u = (i / nx) * 2 - 1;
      var x = u * w / 2, z = -t * l;
      var inner = i > 0 && i < nx && j > 0 && j < nz;
      if (inner) {
        // Nudge the inner points off the grid so the faces come out uneven, like the mountains.
        x += (rand() - 0.5) * (w / nx) * 0.5;
        z += (rand() - 0.5) * (l / nz) * 0.5;
      }
      var y = h * profile(t) * sideFalloff(u);
      if (inner && y > 0.2) y *= 0.92 + rand() * 0.16;
      g.vertices.push(new THREE.Vector3(x, y, z));
    }
  }
  var at = function (a, b) { return b * (nx + 1) + a; };
  for (j = 0; j < nz; j++) {
    for (i = 0; i < nx; i++) {
      var a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      if ((i + j) % 2 === 0) { g.faces.push(new THREE.Face3(a, c, b), new THREE.Face3(b, c, d)); }
      else { g.faces.push(new THREE.Face3(a, d, b), new THREE.Face3(a, c, d)); }
    }
  }
  // A kicker ends in a drop. Close it with a face down to the floor behind the lip.
  if (spec.shape === 'kicker') {
    var base = g.vertices.length;
    for (i = 0; i <= nx; i++) {
      var lip = g.vertices[at(i, nz)];
      g.vertices.push(new THREE.Vector3(lip.x, 0, lip.z - 1.2));
    }
    for (i = 0; i < nx; i++) {
      g.faces.push(new THREE.Face3(at(i, nz), base + i, at(i + 1, nz)), new THREE.Face3(at(i + 1, nz), base + i, base + i + 1));
    }
  }
  g.computeFaceNormals();
  return g;
}

// One beam per edge, merged into a single mesh, to match the worlds' thick neon lines.
function buildWires(surface, thickness) {
  var seen = {}, wires = new THREE.Geometry();
  var beam = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, 1));
  var add = function (i, j) {
    var key = i < j ? i + '_' + j : j + '_' + i;
    if (seen[key]) return;
    seen[key] = true;
    var a = surface.vertices[i], b = surface.vertices[j];
    var len = a.distanceTo(b);
    if (len < 0.01) return;
    beam.position.copy(a).add(b).multiplyScalar(0.5);
    beam.lookAt(b);
    beam.scale.set(1, 1, len);
    beam.updateMatrix();
    wires.merge(beam.geometry, beam.matrix);
  };
  surface.faces.forEach(function (f) { add(f.a, f.b); add(f.b, f.c); add(f.c, f.a); });
  return wires;
}

AFRAME.registerSystem('landforms', {
  init: function () {
    this.groups = {};      // map id -> THREE.Group of that world's landforms
    this.rideable = [];    // surfaces of the world that is showing, for the walker's rays
    var self = this;
    // The map entities exist once the scene has loaded. Their models may arrive later still.
    var start = function () {
      Object.keys(LANDFORMS).forEach(function (mapId) {
        var mapEl = document.getElementById(mapId);
        var build = function () { self.build(mapId, mapEl); };
        if (mapEl.getObject3D('mesh')) build(); else mapEl.addEventListener('model-loaded', build);
      });
    };
    if (this.el.hasLoaded) start(); else this.el.addEventListener('loaded', start);
    this.el.addEventListener('worldchange', function (e) { self.current = e.detail.map; self.show(e.detail.map); });
  },

  // The world's own two materials: the dark faces, and the glowing white-based wire.
  materialsOf: function (mapEl) {
    var solid = null, wire = null;
    mapEl.object3D.traverse(function (n) {
      if (!n.isMesh) return;
      if (n.material.color.getHex() === 0xffffff) wire = wire || n.material; else solid = solid || n.material;
    });
    return { solid: solid, wire: wire };
  },

  build: function (mapId, mapEl) {
    if (this.groups[mapId]) return;
    var mats = this.materialsOf(mapEl);
    var solid = mats.solid.clone();
    solid.flatShading = true;
    solid.side = THREE.DoubleSide;
    solid.needsUpdate = true;
    var group = new THREE.Group();
    LANDFORMS[mapId].forEach(function (spec, n) {
      var surface = buildSurface(spec, seeded(n + 1 + mapId.charCodeAt(3) * 7));
      var form = new THREE.Group();
      var faces = new THREE.Mesh(surface, solid);
      faces.userData.rideable = true;
      form.add(faces);
      form.add(new THREE.Mesh(buildWires(surface, 0.16), mats.wire));
      form.position.set(spec.x, 0.02, spec.z);
      form.rotation.y = spec.yaw * Math.PI / 180;
      group.add(form);
    });
    this.el.object3D.add(group);
    this.groups[mapId] = group;
    this.show(this.current || 'map1');
  },

  show: function (mapId) {
    var self = this;
    this.rideable = [];
    Object.keys(this.groups).forEach(function (id) {
      var on = id === mapId;
      self.groups[id].visible = on;
      if (on) {
        self.groups[id].updateMatrixWorld(true);
        self.groups[id].traverse(function (n) { if (n.userData.rideable) self.rideable.push(n); });
      }
    });
  },
});

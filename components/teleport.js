/* global AFRAME, THREE */

// The four worlds. `goTo` on a portal names one of these keys.
// Each has the map it shows, its name, where you land, where the return portal stands, the fog
// and accent colour of its floor, the sigil that stands for it, and the pieces hung in it.
var WORLDS = {
  map0: { map: 'map1', label: 'WORLD 01', name: 'The Threshold',       sigil: 'diamond',  spawn: [0, 3, 0],     fog: '#1a0410', accent: '#ff3df2', artworks: [1, 2, 3] },
  map1: { map: 'map2', label: 'WORLD 02', name: 'The Thought Fields',  sigil: 'circle',   spawn: [-31, 3, -50], back: [-47, 0, -45], backRot: 90,  fog: '#02101a', accent: '#35e6ff', artworks: [4, 5, 6, 7, 8] },
  map2: { map: 'map3', label: 'WORLD 03', name: 'The Grove of Shapes', sigil: 'triangle', spawn: [6, 3, -5],    back: [37, 0, -6],    backRot: 270, fog: '#041a08', accent: '#52ff6e', artworks: [9, 10, 11, 12] },
  map3: { map: 'map4', label: 'WORLD 04', name: 'The Quiet Deep',      sigil: 'hexagon',  spawn: [-26, 3, -42], back: [-54, 0, -42],  backRot: 90,  fog: '#06061c', accent: '#9a86ff', artworks: [13, 14, 15] },
};

// Each world's sigil as points on a unit circle, so the sign and the compass draw the same shape.
var SIGILS = {
  diamond: [[0, -1], [0.72, 0], [0, 1], [-0.72, 0]],
  triangle: [[0, -1], [0.92, 0.72], [-0.92, 0.72]],
  hexagon: [[0, -1], [0.87, -0.5], [0.87, 0.5], [0, 1], [-0.87, 0.5], [-0.87, -0.5]],
  circle: (function () { var p = []; for (var i = 0; i < 28; i++) p.push([Math.sin(i / 28 * Math.PI * 2), -Math.cos(i / 28 * Math.PI * 2)]); return p; })(),
};

// Shows one world and hides the rest: its map, its pieces, its portals and its fog.
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
  scene.emit('worldchange', { key: key, map: world.map, label: world.label, name: world.name, accent: world.accent, artworks: world.artworks });
}

// A soft round dot, shared by the motes of every portal.
var DOT = (function () {
  var c = document.createElement('canvas');
  c.width = c.height = 64;
  var d = c.getContext('2d'), g = d.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  d.fillStyle = g;
  d.fillRect(0, 0, 64, 64);
  return c;
})();

// The sign over a portal: the destination's sigil, number and name, in its colour. It always
// faces the rider.
function portalSign(world) {
  var canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 320;
  var texture = new THREE.CanvasTexture(canvas);
  var draw = function () {
    var c = canvas.getContext('2d');
    c.clearRect(0, 0, 1024, 320);
    // The sigil, on its own above the words.
    var points = SIGILS[world.sigil], r = 44, cx = 512, cy = 62;
    c.beginPath();
    points.forEach(function (pt, i) { if (i) c.lineTo(cx + pt[0] * r, cy + pt[1] * r); else c.moveTo(cx + pt[0] * r, cy + pt[1] * r); });
    c.closePath();
    c.lineWidth = 9; c.strokeStyle = world.accent; c.stroke();
    c.textAlign = 'center';
    c.fillStyle = world.accent;
    c.font = "700 44px 'Space Mono', monospace";
    c.fillText(world.label, 512, 168);
    c.fillStyle = '#ffffff';
    var big = world.name.toUpperCase(), size = 92;
    c.font = "800 " + size + "px 'Syne', sans-serif";
    while (c.measureText(big).width > 990 && size > 40) { size -= 4; c.font = "800 " + size + "px 'Syne', sans-serif"; }
    c.fillText(big, 512, 268);
    texture.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, fog: false, depthWrite: false }));
  sprite.scale.set(40, 12.5, 1);
  return sprite;
}

AFRAME.registerComponent('teleport', {
  schema: {
    goTo: { default: 'map0' },
    radius: { default: 7 },
  },

  init: function () {
    var self = this, world = WORLDS[this.data.goTo], colour = world.accent;
    this.rig = document.getElementById('rig');
    this.portalPos = new THREE.Vector3();
    this.armed = true;
    var additive = function (opacity) {
      return new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, depthWrite: false });
    };

    // Everything that marks a portal is in the colour of the world it leads to: a ring on the
    // floor the size of its trigger, a second ring running outward, a light at its mouth,
    // motes climbing around it, and its sign.
    var ring = new THREE.Mesh(new THREE.RingGeometry(this.data.radius - 0.5, this.data.radius, 64), additive(0.6));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 2.5;
    var wave = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), additive(0));
    wave.rotation.x = -Math.PI / 2;
    wave.position.y = 2.6;
    var light = new THREE.PointLight(colour, 1.2, 60, 1.8);
    light.position.y = 9;
    var sign = portalSign(world);
    // Out in front of the mouth and above it, on the side you arrive from, so neither the
    // rock nor the ray going up from its top stands between you and the name.
    sign.position.set(0, 27, 27);

    // The motes keep outside the rock, which the rider cannot pass either, so none cuts through it.
    var count = 110, positions = new Float32Array(count * 3);
    this.motes = [];
    for (var i = 0; i < count; i++) {
      this.motes.push({ angle: Math.random() * Math.PI * 2, height: Math.random() * 46, radius: 26 + Math.random() * 7, speed: 0.25 + Math.random() * 0.45 });
    }
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    var points = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(DOT), color: colour, size: 0.9, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    points.frustumCulled = false;

    this.el.object3D.add(ring, wave, light, sign, points);
    this.fx = { ring: ring, wave: wave, light: light, points: points };

    // The model takes the same colour. Its rock is tinted, and the ray it sends into the sky,
    // the one tall thin part of it, is that colour outright. The picture inside the mouth is
    // left as the model has it. Each portal gets its own copies of the materials, so tinting
    // one does not repaint the others.
    var tint = function () {
      var c = new THREE.Color(colour), box = new THREE.Box3();
      self.el.object3D.updateMatrixWorld(true);
      self.el.object3D.traverse(function (n) {
        if (!n.isMesh || n.parent === self.el.object3D) return;        // not the effects above
        if (!n.material || !n.material.color) return;
        if (!n.userData.ownMaterial) { n.material = n.material.clone(); n.userData.ownMaterial = true; n.userData.base = n.material.color.clone(); }
        var m = n.material;
        box.setFromObject(n);
        var tall = box.max.y - box.min.y, wide = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
        if (tall > 200 && tall > wide * 6) {
          m.map = null;
          m.color.copy(c);
          if (m.emissive) { m.emissive.copy(c); m.emissiveMap = null; }
          m.fog = false;
          m.needsUpdate = true;
        } else if (!m.map) {
          m.color.copy(n.userData.base).lerp(c, 0.5);
          if (m.emissive) m.emissive.copy(c).multiplyScalar(0.28);
        }
      });
    };
    this.el.addEventListener('model-loaded', tint);
    if (this.el.getObject3D('mesh')) tint();
  },

  tick: function (time, delta) {
    if (!this.el.object3D.visible) return;
    var fx = this.fx, rigPos = this.rig.object3D.position, here = this.el.object3D.position;
    var dx = rigPos.x - here.x, dz = rigPos.z - here.z;
    var away = Math.sqrt(dx * dx + dz * dz);

    // The effects run hotter as the rider comes close.
    var heat = Math.max(0, Math.min(1, 1 - (away - this.data.radius) / 70));   // 0 far off, 1 at the mouth
    var dt = Math.min(delta, 50) / 1000;
    fx.ring.material.opacity = 0.45 + Math.sin(time * (0.003 + heat * 0.006)) * 0.2 + heat * 0.25;
    fx.light.intensity = 1 + heat * 1.4 + Math.sin(time * 0.004) * 0.2;
    var k = (time * 0.0004) % 1;
    var size = this.data.radius * (1 + k * 2.6);
    fx.wave.scale.set(size, size, size);
    fx.wave.material.opacity = (1 - k) * (0.35 + heat * 0.4);
    var arr = fx.points.geometry.attributes.position.array;
    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      m.angle += dt * m.speed * (1 + heat * 1.5);
      m.height += dt * (3 + heat * 6) * m.speed;
      if (m.height > 46) m.height -= 46;
      arr[i * 3] = Math.cos(m.angle) * m.radius;
      arr[i * 3 + 1] = 2 + m.height;
      arr[i * 3 + 2] = Math.sin(m.angle) * m.radius;
    }
    fx.points.geometry.attributes.position.needsUpdate = true;

    // The trigger is measured on the floor plane, so the rig's height does not shrink it.
    if (away >= this.data.radius) { this.armed = true; return; }
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

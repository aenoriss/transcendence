/* global AFRAME, THREE */

// Moves the rig like a rider on a board: held to the ground, stopped by mountains and by
// the rock of a portal, lifted by ramps, carried through the air when the ground falls away,
// with nitro and jumps that both run on one tank of fuel.
//
// movement-controls moves the rig sideways and forwards. This component decides whether each
// of those steps is allowed, and owns the height and the speed.
//
//   Walls      One ray is cast down a little ahead of the rig. Ground standing more than
//              `maxStep` above the rider's feet refuses the step. A refused step is turned
//              along the face, so the rider slides instead of stopping. Landforms are never
//              walls. A portal is solid except for its mouth.
//   Ground     While grounded the rig follows the surface under it, and remembers how fast
//              that surface was carrying it upward.
//   Air        When the surface drops away (the lip of a kicker), the rig leaves it with that
//              upward speed and falls under gravity until it meets the ground again.
//   Momentum   Letting go of the keys does not stop the board. It coasts and slows by friction.
//   Nitro      Space, while held: the speed winds up the longer it is held, and fuel drains.
//   Jump       Shift. Each jump burns a quarter of the tank, and works in the air too.
//   Fuel       One tank for both. It comes back slowly, after a pause without using any.
AFRAME.registerComponent('walker', {
  schema: {
    eye: { default: 3 },         // rig height above its feet
    maxStep: { default: 4.5 },   // ground this much above the rider's feet, `reach` ahead, is a wall
    reach: { default: 3 },
    bound: { default: 285 },     // half-width of a world's floor
    gravity: { default: 26 },    // light: jumps hang, and landings are soft
    pop: { default: 1.7 },       // how much of the climb speed a lip turns into lift
    maxRise: { default: 46 },    // fastest the rig is lifted onto a landform, units per second
    maxLaunch: { default: 26 },  // cap on the speed a lip can throw the rig up at
    speed: { default: 1.0 },
    boost: { default: 2.6 },     // top speed under nitro, as a multiple
    hop: { default: 27 },        // upward speed of a Shift jump: about 14 units high
    hopCost: { default: 0.25 },  // share of the tank each jump burns
    nitroFuel: { default: 6 },   // seconds of nitro in a full tank
    refill: { default: 22 },     // seconds to refill the tank from empty
    refillPause: { default: 1.5 }, // seconds without using fuel before it starts to come back
    nitroTime: { default: 2.4 }, // seconds of Space to reach top speed
    friction: { default: 1.5 },  // how fast a coasting board loses its speed, per second
    portalRock: { default: 21 }, // radius of a portal's solid base
    portalMouth: { default: 42 },// how wide the opening is, in degrees either side of its front
  },

  init: function () {
    var self = this;
    this.maps = ['map1', 'map2', 'map3', 'map4'].map(function (id) { return document.getElementById(id); });
    this.portals = ['portalSpawn', 'portal1', 'portal2', 'portal3'].map(function (id) { return document.getElementById(id); });
    this.head = this.el.querySelector('#head');
    this.avatar = this.el.querySelector('#avatar-pivot');
    this.model = this.el.querySelector('#avatar');
    this.trail = this.el.querySelector('#particles');
    this.trailHot = this.el.querySelector('#particles-hot');
    this.camera = this.el.querySelector('[camera]');
    this.landforms = this.el.sceneEl.systems.landforms;
    this.last = new THREE.Vector3().copy(this.el.object3D.position);
    this.raycaster = new THREE.Raycaster();
    this.origin = new THREE.Vector3();
    this.down = new THREE.Vector3(0, -1, 0);
    this.hits = [];
    this.grids = {};          // map id -> its faces sorted into cells, built on first use
    this.footY = 0;
    this.vy = 0;
    this.climb = 0;
    this.grounded = true;
    this.moving = null;
    this.stillFor = 0;
    this.pitch = 0;
    this.fov = 62;
    this.locked = false;      // set while a piece or the collection is open
    this.spaceDown = false;
    this.shiftDown = false;
    this.boosting = false;
    this.flying = false;
    this.fuel = 1;            // 0 to 1, read by the fuel ring in the compass
    this.nitro = 0;           // 0 to 1, how far Space has wound the speed up
    this.restFor = 99;        // seconds since fuel was last used
    this.carry = new THREE.Vector2();   // the speed the board keeps when the keys are let go
    this.speedMul = 1;
    this.speedSet = 1;
    this.hot = null;          // whether the flame is in its boost colours

    window.addEventListener('keydown', function (e) {
      if (self.locked) return;
      if (e.code === 'Space') { self.spaceDown = true; e.preventDefault(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!e.repeat && !self.shiftDown) self.hopQueued = true;
        self.shiftDown = true;
      }
    });
    window.addEventListener('keyup', function (e) {
      if (e.code === 'Space') self.spaceDown = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') self.shiftDown = false;
    });
    window.addEventListener('blur', function () { self.spaceDown = false; self.shiftDown = false; });
  },

  cast: function (x, z, objects) {
    this.origin.set(x, 400, z);
    this.raycaster.set(this.origin, this.down);
    this.hits.length = 0;
    this.raycaster.intersectObjects(objects, true, this.hits);
    return this.hits.length ? this.hits[0].point.y : -Infinity;
  },

  // A world is about 25,000 triangles, and a step asks for the ground height several times.
  // Casting a ray at the whole mesh each time was the slowest thing in the frame. So each
  // world's solid faces are sorted once into a grid of 12-unit cells, and a lookup only
  // tests the triangles filed under the cell it falls in, a few dozen instead of all of them.
  buildGrid: function (mapEl) {
    var cell = 12, bins = {}, tris = [], v = new THREE.Vector3();
    mapEl.object3D.updateMatrixWorld(true);
    mapEl.object3D.traverse(function (n) {
      if (!n.isMesh || n.material.color.getHex() === 0xffffff) return;     // the wire is not ground
      var pos = n.geometry.attributes.position, index = n.geometry.index;
      var count = index ? index.count : pos.count;
      for (var i = 0; i < count; i += 3) {
        var t = [];
        for (var k = 0; k < 3; k++) {
          var at = index ? index.array[i + k] : i + k;
          v.set(pos.getX(at), pos.getY(at), pos.getZ(at)).applyMatrix4(n.matrixWorld);
          t.push(v.x, v.y, v.z);
        }
        if (Math.max(t[1], t[4], t[7]) < 0.05) continue;                     // flat floor: height 0 anyway
        var id = tris.length;
        tris.push(t);
        var x0 = Math.floor(Math.min(t[0], t[3], t[6]) / cell), x1 = Math.floor(Math.max(t[0], t[3], t[6]) / cell);
        var z0 = Math.floor(Math.min(t[2], t[5], t[8]) / cell), z1 = Math.floor(Math.max(t[2], t[5], t[8]) / cell);
        for (var cx = x0; cx <= x1; cx++) for (var cz = z0; cz <= z1; cz++) {
          var key = cx + ',' + cz;
          (bins[key] || (bins[key] = [])).push(id);
        }
      }
    });
    return { cell: cell, bins: bins, tris: tris };
  },

  // Highest point of the world's faces straight above or below (x, z).
  gridHeight: function (grid, x, z) {
    var list = grid.bins[Math.floor(x / grid.cell) + ',' + Math.floor(z / grid.cell)];
    if (!list) return 0;
    var best = 0;
    for (var i = 0; i < list.length; i++) {
      var t = grid.tris[list[i]];
      // Where (x, z) falls inside the triangle seen from above, as weights of its corners.
      var d = (t[5] - t[8]) * (t[0] - t[6]) + (t[6] - t[3]) * (t[2] - t[8]);
      if (d > -1e-9 && d < 1e-9) continue;                                   // edge-on from above
      var a = ((t[5] - t[8]) * (x - t[6]) + (t[6] - t[3]) * (z - t[8])) / d;
      var b = ((t[8] - t[2]) * (x - t[6]) + (t[0] - t[6]) * (z - t[8])) / d;
      var c = 1 - a - b;
      if (a < 0 || b < 0 || c < 0) continue;
      var y = a * t[1] + b * t[4] + c * t[7];
      if (y > best) best = y;
    }
    return best;
  },

  mapHeight: function (x, z) {
    for (var i = 0; i < this.maps.length; i++) {
      var el = this.maps[i];
      if (!el.object3D.visible) continue;
      if (!this.grids[el.id]) {
        if (!el.getObject3D('mesh')) return 0;                               // model not in yet
        this.grids[el.id] = this.buildGrid(el);
      }
      return this.gridHeight(this.grids[el.id], x, z);
    }
    return 0;
  },

  rampHeight: function (x, z) {
    var list = this.landforms ? this.landforms.rideable : [];
    return list.length ? this.cast(x, z, list) : -Infinity;
  },

  // The height of whatever is under (x, z): floor, foothill, mountain or landform.
  surface: function (x, z) {
    return Math.max(0, this.rampHeight(x, z), this.mapHeight(x, z));
  },

  // A portal is rock all the way round, with one way in: the mouth, on the side it faces.
  // Inside the rock's radius a point is allowed only in front of the mouth.
  inPortalRock: function (x, z) {
    for (var i = 0; i < this.portals.length; i++) {
      var o = this.portals[i].object3D;
      if (!o.visible) continue;
      var dx = x - o.position.x, dz = z - o.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d >= this.data.portalRock || d < 0.001) continue;
      var facing = (dx * Math.sin(o.rotation.y) + dz * Math.cos(o.rotation.y)) / d;   // 1 straight out of the mouth
      if (facing < Math.cos(this.data.portalMouth * Math.PI / 180)) return true;
    }
    return false;
  },

  // A step is refused where the ground `reach` ahead stands more than `maxStep` above the
  // rider's feet, at the edge of the world, and at the rock of a portal.
  blocked: function (fromX, fromZ, toX, toZ) {
    var dx = toX - fromX, dz = toZ - fromZ;
    var len = Math.sqrt(dx * dx + dz * dz) || 1;
    var x = toX + dx / len * this.data.reach, z = toZ + dz / len * this.data.reach;
    if (Math.abs(x) > this.data.bound || Math.abs(z) > this.data.bound) return true;
    if (this.inPortalRock(x, z)) return true;
    var ground = this.mapHeight(x, z);
    if (ground - this.footY <= this.data.maxStep) return false;
    return this.rampHeight(x, z) < ground;                             // a landform is never a wall
  },

  // When a step is refused, the rider turns along the face instead of stopping. The slope's
  // direction comes from four height samples at the face itself, a little ahead, because the
  // ground under the rider is flat.
  slide: function (last, p) {
    var mx = p.x - last.x, mz = p.z - last.z, ml = Math.sqrt(mx * mx + mz * mz) || 1;
    var ax = last.x + mx / ml * this.data.reach, az = last.z + mz / ml * this.data.reach;
    var e = 2.5;
    var gx = this.mapHeight(ax + e, az) - this.mapHeight(ax - e, az);
    var gz = this.mapHeight(ax, az + e) - this.mapHeight(ax, az - e);
    var gl = Math.sqrt(gx * gx + gz * gz);
    if (gl < 0.001) return false;
    var tx = -gz / gl, tz = gx / gl;                        // along the face
    var along = (p.x - last.x) * tx + (p.z - last.z) * tz;   // how much of the step runs that way
    var nx = last.x + tx * along, nz = last.z + tz * along;
    if (Math.abs(along) < 0.0005 || this.blocked(last.x, last.z, nx, nz)) return false;
    p.x = nx; p.z = nz;
    return true;
  },

  tick: function (time, delta) {
    var dt = Math.min(delta, 50) / 1000;
    if (!dt) return;
    var p = this.el.object3D.position, last = this.last, data = this.data;
    // A menu is open: the rider stays exactly where it was, and whatever speed the controls
    // were still carrying is dropped, so it does not coast on underneath.
    if (this.locked) {
      p.x = last.x; p.z = last.z;
      var controls = this.el.components['movement-controls'];
      if (controls && controls.velocity) controls.velocity.set(0, 0, 0);
    }
    var dx = p.x - last.x, dz = p.z - last.z;
    var dist = Math.sqrt(dx * dx + dz * dz);

    // Momentum. The controls stop the rig almost at once when the keys are let go. The board
    // should not: it keeps the speed it had and loses it to friction. `carry` is that speed.
    // While the controls are driving at least as fast, it follows them. When they fall away,
    // it takes over the step and decays.
    if (!this.locked && dist < 20) {
      var carry = this.carry, had = Math.sqrt(carry.x * carry.x + carry.y * carry.y);
      var now = dist / dt;
      if (now >= had * 0.92) {
        carry.x += (dx / dt - carry.x) * Math.min(1, dt * 10);
        carry.y += (dz / dt - carry.y) * Math.min(1, dt * 10);
      } else if (had > 0.6) {
        var keep = Math.exp(-data.friction * dt);
        // Keys still down in another direction steer the coast toward it.
        if (now > 1) { carry.x += (dx / dt - carry.x) * Math.min(1, dt * 3); carry.y += (dz / dt - carry.y) * Math.min(1, dt * 3); }
        carry.x *= keep; carry.y *= keep;
        p.x = last.x + carry.x * dt; p.z = last.z + carry.y * dt;
        dx = p.x - last.x; dz = p.z - last.z;
        dist = Math.sqrt(dx * dx + dz * dz);
      } else {
        carry.set(0, 0);
      }
    } else {
      this.carry.set(0, 0);
    }

    if (dist >= 20) {
      // A portal moved the rig in one jump. Start again on the new world's ground.
      this.footY = 0; this.vy = 0; this.climb = 0; this.grounded = true;
      this.footY = this.surface(p.x, p.z);
    } else if (dist > 0.0005 && this.blocked(last.x, last.z, p.x, p.z)) {
      this.carry.multiplyScalar(0.5);     // hitting something takes the speed out of the board
      if (this.slide(last, p)) { /* turned along the face */ }
      else if (Math.abs(dx) > 0.0005 && !this.blocked(last.x, last.z, p.x, last.z)) p.z = last.z;
      else if (Math.abs(dz) > 0.0005 && !this.blocked(last.x, last.z, last.x, p.z)) p.x = last.x;
      else { p.x = last.x; p.z = last.z; }
    }

    var ground = this.surface(p.x, p.z);

    // One tank for both. Nitro drains it while Space is held and stops when it is empty.
    // It refills slowly, and only after a pause since it was last used, so fuel is something
    // to spend with care.
    var boosting = this.spaceDown && !this.locked && this.fuel > 0;
    this.boosting = boosting;
    if (boosting) { this.fuel = Math.max(0, this.fuel - dt / data.nitroFuel); this.restFor = 0; }
    else this.restFor += dt;
    if (this.restFor > data.refillPause) this.fuel = Math.min(1, this.fuel + dt / data.refill);

    // Shift jumps, and each jump burns a chunk of fuel. It works in the air too, so jumps can
    // be chained for as long as the tank lasts.
    if (this.hopQueued && !this.locked && this.fuel >= data.hopCost) {
      this.fuel -= data.hopCost;
      this.restFor = 0;
      this.vy = data.hop;
      this.grounded = false;
      this.el.sceneEl.emit('hop');
    }
    this.hopQueued = false;

    if (this.grounded) {
      if (ground < this.footY - 0.6) {
        // The ground dropped away: off a lip or an edge. Keep the speed it was lifting us at.
        this.vy = Math.min(data.maxLaunch, Math.max(0, this.climb) * data.pop);
        this.grounded = false;
      } else {
        // A steep face lifts the rig quickly but not in one frame, so nothing snaps.
        var step = Math.min(ground - this.footY, data.maxRise * dt);
        this.climb = this.climb * 0.55 + (step / dt) * 0.45;
        this.footY += step;
      }
    }
    if (!this.grounded) {
      this.vy -= data.gravity * dt;
      this.footY += this.vy * dt;
      if (this.footY <= ground) {
        this.footY = ground; this.vy = 0; this.climb = 0; this.grounded = true;
        this.el.sceneEl.emit('land');
      }
    }
    p.y = this.footY + data.eye;

    // Nitro is progressive: the longer Space is held, the faster, up to the top speed after
    // `nitroTime` seconds. Letting go bleeds it off.
    this.nitro = Math.max(0, Math.min(1, this.nitro + (boosting ? dt / data.nitroTime : -dt * 1.4)));
    this.speedMul = 1 + (data.boost - 1) * this.nitro * (2 - this.nitro);   // quick at first, then easing in
    // Written straight into the controls. Going through setAttribute on every change costs
    // a schema parse per frame while the speed is winding up.
    var drive = this.el.components['movement-controls'];
    if (drive) drive.data.speed = data.speed * this.speedMul;

    // Under nitro the page tints to the colour of the nitro flame.
    var hot = boosting;
    if (hot !== this.hot) {
      this.hot = hot;
      this.el.sceneEl.emit('boost', { on: hot });
    }

    var moved = Math.abs(p.x - last.x) + Math.abs(p.z - last.z) > 0.0005;
    var speed = Math.sqrt((p.x - last.x) * (p.x - last.x) + (p.z - last.z) * (p.z - last.z)) / dt;
    last.copy(p);

    if (this.head && this.avatar) {
      // The avatar turns with the camera, eased, and leans into a turn.
      var rot = this.avatar.object3D.rotation;
      var target = this.head.object3D.rotation.y;
      var diff = Math.atan2(Math.sin(target - rot.y), Math.cos(target - rot.y));
      rot.y += diff * Math.min(1, delta * 0.012);
      rot.z += (Math.max(-0.35, Math.min(0.35, diff * 0.9)) - rot.z) * Math.min(1, delta * 0.01);
      // Nose up on a climb and on the way up, nose down on the way back.
      var rise = this.grounded ? this.climb : this.vy;
      var wantPitch = speed > 1 || !this.grounded ? Math.atan2(rise, Math.max(speed, 8)) : 0;
      this.pitch += (wantPitch - this.pitch) * Math.min(1, delta * 0.012);
      rot.x = this.pitch;
    }

    // The view widens with speed and settles back after.
    if (this.camera) {
      var cam = this.camera.getObject3D('camera');
      var wantFov = 62 + (this.speedMul - 1) * (moved ? 13 : 0);
      if (cam && Math.abs(wantFov - this.fov) > 0.05) {
        this.fov += (wantFov - this.fov) * Math.min(1, delta * 0.006);
        cam.fov = this.fov;
        cam.updateProjectionMatrix();
      }
    }

    // Standing still for a moment switches the flame and the avatar's animation off.
    this.stillFor = moved ? 0 : this.stillFor + delta;
    var moving = this.stillFor < 120;
    if (moving !== this.moving) {
      this.moving = moving;
      if (this.model) this.model.setAttribute('animation-mixer', 'timeScale', moving ? 1 : 0);
    }
    // There are two flames, the ordinary one and the blue nitro one, and only ever one is
    // shown. Changing a particle system's colour or size rebuilds it, which froze the frame
    // for about 170 ms each time nitro started or stopped. Showing and hiding costs nothing.
    if (this.trail) this.trail.object3D.visible = moving && !hot;
    // For the first second the nitro flame is drawn too, so the graphics card compiles it
    // at the start, behind the entry screen's fade, and not on the first press of Space.
    this.warmed = (this.warmed || 0) + delta;
    if (this.trailHot) this.trailHot.object3D.visible = (moving && hot) || this.warmed < 1000;
  },
});

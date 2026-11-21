/* global AFRAME, THREE */

// Moves the rig like a rider on a board: held to the ground, stopped by mountains and by
// the rock of a portal, lifted by ramps, carried through the air when the ground falls away,
// and able to fly for as long as there is fuel.
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
//   Boost      Space, while held: faster.
//   Shift      One key for jumping and flying. A press is a jump. Kept down, and while there
//              is fuel, the jump becomes flight: the board holds a height above whatever is
//              under it and builds up to its top speed. Fuel comes back when Shift is released.
AFRAME.registerComponent('walker', {
  schema: {
    eye: { default: 3 },         // rig height above its feet
    maxStep: { default: 4.5 },   // ground this much above the rider's feet, `reach` ahead, is a wall
    reach: { default: 3 },
    bound: { default: 285 },     // half-width of a world's floor
    gravity: { default: 40 },
    pop: { default: 1.7 },       // how much of the climb speed a lip turns into lift
    maxRise: { default: 46 },    // fastest the rig is lifted onto a landform, units per second
    maxLaunch: { default: 26 },  // cap on the speed a lip can throw the rig up at
    speed: { default: 1.0 },
    boost: { default: 1.7 },
    hop: { default: 13 },        // the jump a press of Shift starts with
    flySpeed: { default: 2.3 },  // speed multiplier at full flight
    flyHeight: { default: 7 },   // height the flight holds above the ground
    flyLift: { default: 20 },    // how hard the board pushes up toward that height
    flyClimb: { default: 7 },    // fastest it rises
    flyFuel: { default: 3.2 },   // seconds of flight in a full tank
    flyRefill: { default: 4 },   // seconds to refill it
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
    this.camera = this.el.querySelector('[camera]');
    this.landforms = this.el.sceneEl.systems.landforms;
    this.last = new THREE.Vector3().copy(this.el.object3D.position);
    this.raycaster = new THREE.Raycaster();
    this.origin = new THREE.Vector3();
    this.down = new THREE.Vector3(0, -1, 0);
    this.hits = [];
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
    this.fuel = 1;            // 0 to 1, read by the fuel bar
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

  mapHeight: function (x, z) {
    for (var i = 0; i < this.maps.length; i++) {
      if (this.maps[i].object3D.visible) return Math.max(0, this.cast(x, z, [this.maps[i].object3D]));
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
    if (this.rampHeight(x, z) >= this.mapHeight(x, z)) return false;   // a landform is never a wall
    return this.mapHeight(x, z) - this.footY > this.data.maxStep;
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

    if (dist >= 20) {
      // A portal moved the rig in one jump. Start again on the new world's ground.
      this.footY = 0; this.vy = 0; this.climb = 0; this.grounded = true;
      this.footY = this.surface(p.x, p.z);
    } else if (dist > 0.0005 && this.blocked(last.x, last.z, p.x, p.z)) {
      if (this.slide(last, p)) { /* turned along the face */ }
      else if (Math.abs(dx) > 0.0005 && !this.blocked(last.x, last.z, p.x, last.z)) p.z = last.z;
      else if (Math.abs(dz) > 0.0005 && !this.blocked(last.x, last.z, last.x, p.z)) p.x = last.x;
      else { p.x = last.x; p.z = last.z; }
    }

    var ground = this.surface(p.x, p.z);

    // Flight lasts as long as Shift is held and the tank is not empty. The tank refills once
    // Shift is let go.
    var flying = this.shiftDown && !this.locked && this.fuel > 0;
    if (flying) this.fuel = Math.max(0, this.fuel - dt / data.flyFuel);
    else if (!this.shiftDown) this.fuel = Math.min(1, this.fuel + dt / data.flyRefill);
    this.flying = flying;
    var boosting = this.spaceDown && !this.locked;
    if (boosting !== this.boosting) { this.boosting = boosting; }

    // Shift is one key for both: pressing it is a jump, and keeping it down turns the jump
    // into flight. A tap is only the jump.
    if (this.hopQueued && !this.locked && this.fuel > 0.05) {
      this.vy = Math.max(this.vy, data.hop);
      this.grounded = false;
    }
    this.hopQueued = false;

    if (flying) {
      // A gentle lift toward a height above whatever is underneath, then holding there.
      this.grounded = false;
      var want = ground + data.flyHeight;
      if (this.footY < want) { if (this.vy < data.flyClimb) this.vy = Math.min(data.flyClimb, this.vy + data.flyLift * dt); }
      else this.vy -= data.gravity * 0.3 * dt;
      this.vy = Math.max(-4, this.vy);
      this.vy *= 1 - Math.min(1, dt * 1.2);            // eased, so it settles instead of bouncing
      this.footY = Math.max(ground, this.footY + this.vy * dt);
    } else if (this.grounded) {
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
    if (!flying && !this.grounded) {
      this.vy -= data.gravity * dt;
      this.footY += this.vy * dt;
      if (this.footY <= ground) {
        this.footY = ground; this.vy = 0; this.climb = 0; this.grounded = true;
        this.el.sceneEl.emit('land');
      }
    }
    p.y = this.footY + data.eye;

    // Speed builds and falls away gradually instead of switching.
    var wantSpeed = flying ? data.flySpeed : boosting ? data.boost : 1;
    this.speedMul += (wantSpeed - this.speedMul) * Math.min(1, dt * (wantSpeed > this.speedMul ? 1.6 : 3));
    if (Math.abs(this.speedMul - this.speedSet) > 0.03) {
      this.speedSet = this.speedMul;
      this.el.setAttribute('movement-controls', 'speed', data.speed * this.speedMul);
    }

    // The flame burns blue and bigger while boosting or flying, and the page tints to match.
    var hot = flying || boosting;
    if (hot !== this.hot) {
      this.hot = hot;
      if (this.trail) {
        this.trail.setAttribute('particle-system', 'color', hot ? '#2bd1ff,#f4fbff' : '#EF0000,#44CC00');
        this.trail.setAttribute('particle-system', 'size', hot ? 2.1 : 1.5);
      }
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
    this.stillFor = moved || flying ? 0 : this.stillFor + delta;
    var moving = this.stillFor < 120;
    if (moving !== this.moving) {
      this.moving = moving;
      if (this.trail) this.trail.setAttribute('particle-system', 'maxAge', moving ? 1 : 0);
      if (this.model) this.model.setAttribute('animation-mixer', 'timeScale', moving ? 1 : 0);
    }
  },
});

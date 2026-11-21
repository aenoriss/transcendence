/* global AFRAME, THREE */

// Moves the rig like a rider on a board: held to the ground, stopped by mountains, lifted by
// ramps and carried through the air when the ground falls away.
//
// movement-controls moves the rig sideways and forwards. This component decides whether each
// of those steps is allowed, and owns the height.
//
//   Walls      One ray is cast down a little ahead of the rig. Mountain ground higher than
//              `maxStep` refuses the step, and so does a landform face that rises too fast.
//              A refused step is retried on each axis alone, so the rig slides along a slope.
//   Ground     While grounded the rig follows the surface under it, and remembers how fast
//              that surface was carrying it upward.
//   Air        When the surface drops away (the lip of a kicker), the rig leaves it with that
//              upward speed and falls under gravity until it meets the ground again.
//              Holding Space pushes harder. Shift hops.
AFRAME.registerComponent('walker', {
  schema: {
    eye: { default: 3 },         // rig height above its feet
    maxStep: { default: 2.5 },   // a rise bigger than this, `reach` ahead, is a wall
    reach: { default: 4 },
    bound: { default: 285 },     // half-width of a world's floor
    gravity: { default: 34 },
    jump: { default: 13 },
    pop: { default: 1.25 },      // how much of the climb speed a lip turns into lift
    speed: { default: 1.0 },
    boost: { default: 1.7 },
  },

  init: function () {
    var self = this;
    this.maps = ['map1', 'map2', 'map3', 'map4'].map(function (id) { return document.getElementById(id); });
    this.head = this.el.querySelector('#head');
    this.avatar = this.el.querySelector('#avatar-pivot');
    this.model = this.el.querySelector('#avatar');
    this.trail = this.el.querySelector('#particles');
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
    this.jumpQueued = false;
    this.moving = null;
    this.stillFor = 0;
    this.pitch = 0;
    this.locked = false;   // set while a piece is open full screen

    // Space held is the boost. Shift is a hop.
    this.boosting = false;
    this.camera = this.el.querySelector('[camera]');
    this.fov = 62;
    var setBoost = function (on) {
      if (on === self.boosting) return;
      self.boosting = on;
      self.el.setAttribute('movement-controls', 'speed', self.data.speed * (on ? self.data.boost : 1));
      if (self.trail) self.trail.setAttribute('particle-system', 'size', on ? 0.55 : 0.4);
      self.el.sceneEl.emit('boost', { on: on });
    };
    window.addEventListener('keydown', function (e) {
      if (self.locked) return;
      if (e.code === 'Space') { setBoost(true); e.preventDefault(); }
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) self.jumpQueued = true;
    });
    window.addEventListener('keyup', function (e) {
      if (e.code === 'Space') setBoost(false);
    });
    window.addEventListener('blur', function () { setBoost(false); });
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

  // The height the rig can stand at here. Mountains only count once you are above them.
  surface: function (x, z) {
    var h = Math.max(0, this.rampHeight(x, z));
    var m = this.mapHeight(x, z);
    if (m <= this.data.maxStep || this.footY >= m - 1) h = Math.max(h, m);
    return h;
  },

  blocked: function (fromX, fromZ, toX, toZ) {
    var dx = toX - fromX, dz = toZ - fromZ;
    var len = Math.sqrt(dx * dx + dz * dz) || 1;
    var x = toX + dx / len * this.data.reach, z = toZ + dz / len * this.data.reach;
    if (Math.abs(x) > this.data.bound || Math.abs(z) > this.data.bound) return true;
    var ramp = this.rampHeight(x, z), map = this.mapHeight(x, z);
    if (map > this.data.maxStep && map > ramp && this.footY < map - 1) return true;   // mountain
    if (ramp - this.footY > this.data.maxStep) return true;                            // too steep a face
    return false;
  },

  tick: function (time, delta) {
    var dt = Math.min(delta, 50) / 1000;
    if (!dt) return;
    var p = this.el.object3D.position, last = this.last, data = this.data;
    var dx = p.x - last.x, dz = p.z - last.z;
    var dist = Math.sqrt(dx * dx + dz * dz);

    if (dist >= 20) {
      // A portal moved the rig in one jump. Start again on the new world's ground.
      this.footY = 0; this.vy = 0; this.climb = 0; this.grounded = true;
      this.footY = this.surface(p.x, p.z);
    } else if (dist > 0.0005 && this.blocked(last.x, last.z, p.x, p.z)) {
      if (Math.abs(dx) > 0.0005 && !this.blocked(last.x, last.z, p.x, last.z)) p.z = last.z;
      else if (Math.abs(dz) > 0.0005 && !this.blocked(last.x, last.z, last.x, p.z)) p.x = last.x;
      else { p.x = last.x; p.z = last.z; }
    }

    var ground = this.surface(p.x, p.z);
    if (this.grounded) {
      if (this.jumpQueued) {
        this.vy = data.jump + Math.max(0, this.climb) * 0.5;
        this.grounded = false;
      } else if (ground < this.footY - 0.6) {
        // The ground dropped away: off a lip or an edge. Keep the speed it was lifting us at.
        this.vy = Math.max(0, this.climb) * data.pop;
        this.grounded = false;
      } else {
        this.climb = this.climb * 0.55 + ((ground - this.footY) / dt) * 0.45;
        this.footY = ground;
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
    this.jumpQueued = false;
    p.y = this.footY + data.eye;

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
      // Nose up on a climb and in the first half of a jump, nose down on the way back.
      var rise = this.grounded ? this.climb : this.vy;
      var want = speed > 1 || !this.grounded ? Math.atan2(rise, Math.max(speed, 8)) : 0;
      this.pitch += (want - this.pitch) * Math.min(1, delta * 0.012);
      rot.x = this.pitch;
    }

    // The view widens while boosting and settles back after.
    if (this.camera) {
      var cam = this.camera.getObject3D('camera');
      var wantFov = this.boosting && moved ? 74 : 62;
      if (cam && Math.abs(wantFov - this.fov) > 0.05) {
        this.fov += (wantFov - this.fov) * Math.min(1, delta * 0.006);
        cam.fov = this.fov;
        cam.updateProjectionMatrix();
      }
    }

    // Standing still for a moment switches the trail and the avatar's animation off.
    this.stillFor = moved ? 0 : this.stillFor + delta;
    var moving = this.stillFor < 120;
    if (moving !== this.moving) {
      this.moving = moving;
      if (this.trail) this.trail.setAttribute('particle-system', 'maxAge', moving ? 1 : 0);
      if (this.model) this.model.setAttribute('animation-mixer', 'timeScale', moving ? 1 : 0);
    }
  },
});

/* global AFRAME */

// An artwork tells the page when the visitor walks up to it and when they leave.
// The page (components/ui.js) draws the caption card.
AFRAME.registerComponent("showinfo", {
  schema: {
    radius: { default: 30 },
  },
  init: function () {

    const player = document.getElementById("rig");
    this.playerPos = player.getAttribute("position");

    this.trigger = this.el;

    this.sw = false;
    this.seen = false;
    this.number = Number(this.el.id.replace("artwork", ""));
    this.baseY = this.el.object3D.position.y;
    this.phase = this.number * 1.7;
    this.grow = 1;
    this.el.sceneEl.addEventListener("loaded", () => this.dress());
    this.el.sceneEl.addEventListener("worldchange", (e) => {
      if (this.accent) this.accent.set(e.detail.accent);
    });

    this.artworks = {
      artwork1: {
        title: "THE CREATOR OF THOUGHTS",
        description: "Everything springs from a thought. A flash, a spark, an impulse that gives rise to the innovative makes its way inside."
      },
      artwork2: {
        title: "PIXELATED WIZARD",
        description: "In charge of universal geometry, he organizes what is in the world. Set every shape in its place with the movements of his hands. His arms stretch to all ends."
      },
      artwork3: {
        title: "THE INITIATE",
        description: "Is the first to know the mysteries of the Transcendence universe creation. Once he understood the mystery, he became the bearer of the community's flame"
      },
      artwork4: {
        title: "ASTONISHMENT IS THE NEW STYLE",
        description: "Amazed and perplexed by the wonder of what was created, she has remained motionless. Such a vision can paralyze us for a moment as it teaches us by showing us what really surrounds us."
      },
      artwork5: {
        title: "THE ANXIETY THAT’S GONE WITH THE WIND",
        description: "The Universe is in constant movement, for some to stay still is to go crazy. Anxiety runs in the blood, a desire pulsates but pushes to make its way in the form of expansion."
      },
      artwork6: {
        title: "PERSPIRATION OF IRONY",
        description: "Shapes are not just what you see with the naked eye. Irony makes us feel uncomfortable but it reveals other dimensions of space-time."
      },
      artwork7: {
        title: "THE QUANTUM HEDGEHOG",
        description: "Some pursue the suspicion that there is something more, sooner or later it is in that search that other dimensions are accessed. Seeing his reflection in a mirror from another dimension awakens the question: who the hell am I?"
      },
      artwork8: {
        title: "SADNESS OF THE GOOD ONE",
        description: "Sadness moves our roots, however at the center of this experience there is an invitation to create something new. Time will bring a smile."
      },
      artwork9: {
        title: "VENOM OF THE TRIPLETS",
        description: "The youngest of the triplets. She carries with it the poison that numbs but does not kill. She prepares the potions that her sisters drink."
      },
      artwork10: {
        title: "THE LAME",
        description: "What about all those things we can't handle? In those moments it is good to have the wisdom of others who have already walked the path."
      },
      artwork11: {
        title: "THE OLD STORY TELLER",
        description: "The old woman who tells stories. Her wisdom is about knowledge of the symbolic world and the fruit of the years. She is the embodiment of the accumulated experience of a community."
      },
      artwork12: {
        title: "THE SMILE THAT DOESN'T LIE",
        description: "His wisdom consists of an eternal smile. His smile and his gaze are beacons for the souls that get lost along the way."
      },
      
      artwork13: {
        title: "THE QUANTUM HEDGEHOG",
        description: "Some pursue the suspicion that there is something more, sooner or later it is in that search that other dimensions are accessed. Seeing his reflection in a mirror from another dimension awakens the question: who the hell am I?"
      },
      artwork14: {
        title: "THE LAME",
        description: "What about all those things we can't handle? In those moments it is good to have the wisdom of others who have already walked the path."
      },
      artwork15: {
        title: "THE OLD STORY TELLER",
        description: "The old woman who tells stories. Her wisdom is about knowledge of the symbolic world and the fruit of the years. She is the embodiment of the accumulated experience of a community."
      },
      
    }
  },

  // What stands around a piece in the world: an aura on the floor under it that shows whether
  // it has been read, and a plate above it with its number and title that always faces the
  // visitor.
  dress: function () {
    const art = this.artworks[this.el.id];
    const pos = this.el.object3D.position;

    // A soft round glow, used for the egg's inner light and for the aura on the floor.
    const glow = document.createElement("canvas");
    glow.width = glow.height = 256;
    const g = glow.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);

    // The piece itself is unlit and unfogged, so it reads at full colour from across a world.
    const plane = this.el.querySelector(".piece");
    if (plane) plane.setAttribute("material", { shader: "flat", transparent: true, alphaTest: 0.05, side: "double", fog: false });
    this.plane = plane;
    if (plane) plane.object3D.visible = false;   // sealed until its egg opens

    // The egg the piece waits in: six-sided and faceted, but lit from inside in warm gold, the
    // one colour none of the four worlds uses, so it shows from a long way off. It hangs, turns
    // slowly, shivers when you come to it out of turn, and bursts when its turn has come.
    const profile = [];
    for (let i = 0; i <= 6; i++) {
      const v = i / 6, y = -14 + v * 28;
      const r = 11.5 * Math.sqrt(Math.max(0, 1 - Math.pow((y + 2) / 15, 2))) * (1 - 0.2 * v);
      profile.push(new THREE.Vector2(i === 0 || i === 6 ? 0.01 : r, y));
    }
    const shell = new THREE.LatheGeometry(profile, 6);
    const eggSolid = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffb938, emissiveIntensity: 0.85, metalness: 0.3, roughness: 0.35, flatShading: true, transparent: true, opacity: 0.96, side: THREE.DoubleSide, fog: false });
    const eggWire = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, fog: false });
    const eggGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glow), color: 0xffc04a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    eggGlow.scale.set(62, 62, 1);
    const egg = new THREE.Group();
    egg.add(new THREE.Mesh(shell, eggSolid), new THREE.LineSegments(new THREE.EdgesGeometry(shell, 1), eggWire), eggGlow);

    // The chains that hold it shut: three rings of links round the egg, one level and two
    // tilted across it, turning against the egg. They fly apart when it opens.
    const link = new THREE.TorusGeometry(1.5, 0.36, 5, 8);
    const links = new THREE.Geometry();
    const one = new THREE.Object3D(), ringFrame = new THREE.Object3D(), placed = new THREE.Matrix4();
    one.rotation.order = "YXZ";
    [[0, 0, 0], [1.05, 0, 0.5], [-1.05, 0, -0.5]].forEach((tilt) => {
      ringFrame.rotation.set(tilt[0], tilt[1], tilt[2]);
      ringFrame.updateMatrix();
      const count = 22, radius = 15.5;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        one.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        // Each link lies along the ring, and every second one is turned a quarter, like a chain.
        one.rotation.set(i % 2 ? Math.PI / 2 : 0, -(a + Math.PI / 2), 0);
        one.updateMatrix();
        placed.multiplyMatrices(ringFrame.matrix, one.matrix);
        links.merge(link, placed);
      }
    });
    const chainMaterial = new THREE.MeshBasicMaterial({ color: 0xd4f1ff, transparent: true, opacity: 1, fog: false });
    const chains = new THREE.Mesh(links, chainMaterial);
    egg.add(chains);
    this.chains = chains; this.chainMaterial = chainMaterial;

    this.eggSize = 0.36;
    egg.scale.set(this.eggSize, this.eggSize, this.eggSize);
    egg.position.set(pos.x, 9, pos.z);
    egg.visible = false;
    this.el.sceneEl.object3D.add(egg);
    this.egg = egg; this.eggSolid = eggSolid; this.eggWire = eggWire; this.eggGlow = eggGlow;
    this.hatchAt = -1; this.shiverAt = -1; this.hatched = false;

    // The aura: a soft disc of light on the floor under the piece. It is the world's colour
    // and breathing while the piece is unread, and settles to a faint white once it is.
    const floorDisc = (radius) => {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 48),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glow), color: 0xff3df2, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(pos.x, 0.5, pos.z);
      m.visible = false;
      this.el.sceneEl.object3D.add(m);
      return m;
    };
    this.ring = floorDisc(15);
    this.accent = new THREE.Color(0xff3df2);
    this.seenColor = new THREE.Color(0xdcdce8);

    // The burst: a ring that runs outward across the floor the first time the piece is read.
    const burst = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, depthWrite: false })
    );
    burst.rotation.x = -Math.PI / 2;
    burst.position.set(pos.x, 0.6, pos.z);
    burst.visible = false;
    this.el.sceneEl.object3D.add(burst);
    this.burst = burst;
    this.burstAt = -1;

    // And a column of light that goes up from it at the same moment, seen from far off.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 5, 220, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, depthWrite: false })
    );
    beam.position.set(pos.x, 110, pos.z);
    beam.visible = false;
    this.el.sceneEl.object3D.add(beam);
    this.beam = beam;
    this.baseRotY = this.el.object3D.rotation.y;

    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    const draw = () => {
      const c = canvas.getContext("2d");
      c.clearRect(0, 0, 1024, 256);
      c.textAlign = "center";
      c.fillStyle = "rgba(244,241,255,0.72)";
      c.font = "700 44px 'Space Mono', monospace";
      c.fillText((this.number < 10 ? "0" : "") + this.number + (this.seen ? "  ·  SEEN" : "  ·  SEALED"), 512, 70);
      // A sealed piece does not give its name away.
      if (this.seen) {
        c.fillStyle = "#ffffff";
        let size = 84;
        c.font = "800 " + size + "px 'Syne', sans-serif";
        while (c.measureText(art.title).width > 980 && size > 34) { size -= 4; c.font = "800 " + size + "px 'Syne', sans-serif"; }
        c.fillText(art.title, 512, 180);
      }
      texture.needsUpdate = true;
    };
    this.drawPlate = draw;
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    const plate = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, fog: false, depthWrite: false }));
    plate.scale.set(22, 5.5, 1);
    plate.position.set(0, 22, 0);
    this.el.object3D.add(plate);
    this.plate = plate;
  },

  tick: function (time, delta) {
    const visible = this.el.object3D.visible;
    // Each piece drifts a little on its own phase, so a wall of them does not move as one.
    this.el.object3D.position.y = this.baseY + Math.sin(time * 0.0009 + this.phase) * 0.6;

    const near = visible &&
      this.playerPos.distanceTo(this.trigger.getAttribute("position")) < this.data.radius;

    // The piece you are standing at grows a little, and its ring brightens and breathes.
    this.grow += ((near ? 1.08 : 1) - this.grow) * Math.min(1, delta * 0.006);
    this.el.object3D.scale.set(this.grow, this.grow, this.grow);
    if (this.ring) {
      this.ring.visible = visible;
      // Unread: the world's colour, breathing. Read: a faint steady white.
      const want = this.seen ? 0.16 : 0.62 + Math.sin(time * 0.0026 + this.phase) * 0.22;
      const ease = Math.min(1, delta * 0.006);
      this.ring.material.opacity += (want - this.ring.material.opacity) * ease;
      this.ring.material.color.lerp(this.seen ? this.seenColor : this.accent, ease);
    }
    if (this.burst && this.burstAt >= 0) {
      // Collected: a ring runs out across the floor, a column of light goes up, and the piece
      // turns once on its axis and swells before settling.
      const k = (time - this.burstAt) / 1400;
      if (k >= 1 || !visible) {
        this.burst.visible = false; this.beam.visible = false; this.burstAt = -1;
        this.el.object3D.rotation.y = this.baseRotY;
      } else {
        const out = 1 - Math.pow(1 - k, 3);
        const size = 4 + out * 60;
        this.burst.visible = true;
        this.burst.scale.set(size, size, size);
        this.burst.material.opacity = (1 - k) * 0.95;
        this.beam.visible = true;
        this.beam.material.opacity = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.55;
        this.beam.scale.set(1 + out * 0.6, 1, 1 + out * 0.6);
        this.el.object3D.rotation.y = this.baseRotY + out * Math.PI * 2;
        const swell = this.grow + Math.sin(Math.min(1, k * 2) * Math.PI) * 0.28;
        this.el.object3D.scale.set(swell, swell, swell);
      }
    }

    // The egg: hanging and turning while sealed, shivering when refused, bursting when opened.
    if (this.egg) {
      const egg = this.egg;
      egg.visible = visible && (!this.hatched || this.hatchAt >= 0);
      if (egg.visible) {
        egg.position.y = 9 + Math.sin(time * 0.0011 + this.phase) * 1.2;
        egg.rotation.y += delta * 0.0005;
        egg.rotation.z = 0;
        this.chains.rotation.y -= delta * 0.0013;
        this.chains.scale.set(1, 1, 1);
        this.chainMaterial.opacity = 1;
        // The light inside breathes.
        const breath = Math.sin(time * 0.003 + this.phase);
        this.eggSolid.emissiveIntensity = 0.85 + breath * 0.3;
        this.eggGlow.material.opacity = 0.6 + breath * 0.22;
        if (this.shiverAt >= 0) {
          const s = (time - this.shiverAt) / 650;
          if (s >= 1) this.shiverAt = -1;
          else egg.rotation.z = Math.sin(s * Math.PI * 9) * 0.09 * (1 - s);
        }
        if (this.hatchAt >= 0) {
          const h = (time - this.hatchAt) / 700;
          if (h >= 1) { this.hatchAt = -1; egg.visible = false; }
          else {
            const e = 1 - Math.pow(1 - h, 2);
            const s2 = this.eggSize * (1 + e * 2.2);
            egg.scale.set(s2, s2, s2);
            egg.rotation.y += delta * 0.012;
            // The chains go first and fastest.
            const snap = Math.min(1, h * 2.4), far = 1 + (1 - Math.pow(1 - snap, 2)) * 2.4;
            this.chains.scale.set(far, far, far);
            this.chains.rotation.y -= delta * 0.02;
            this.chainMaterial.opacity = 1 - snap;
            this.eggSolid.opacity = 0.96 * (1 - e);
            this.eggWire.opacity = 1 - e;
            this.eggGlow.material.opacity = 0.9 * (1 - e);
          }
        }
      }
    }

    if (near && !this.sw && !this.seen) {
      // Sealed. It opens only if it is the piece the compass is pointing at.
      const next = window.TOUR ? window.TOUR.nextPiece() : this.number;
      if (next !== this.number) {
        this.sw = true;
        this.shiverAt = time;
        this.el.sceneEl.emit("artworklocked", { number: this.number, next: next });
        return;
      }
    }

    if (near && !this.sw) {
      this.sw = true;
      const first = !this.seen;
      this.seen = true;
      if (first && this.drawPlate) this.drawPlate();
      if (first) {
        this.hatched = true;
        this.hatchAt = time;
        if (this.plane) this.plane.object3D.visible = true;
      }
      if (first && this.burst) {
        this.burstAt = time;
        this.burst.material.color.copy(this.accent);
        this.beam.material.color.copy(this.accent);
      }
      const image = document.getElementById("art" + this.number);
      this.el.sceneEl.emit("artworknear", {
        number: this.number,
        first: first,
        src: image ? image.getAttribute("src") : "",
        title: this.artworks[this.el.id].title,
        description: this.artworks[this.el.id].description,
      });
    } else if (!near && this.sw) {
      this.sw = false;
      this.el.sceneEl.emit("artworkfar", { number: this.number });
    }
  },
});

// The sky turns very slowly, so standing still is not a frozen picture.
AFRAME.registerComponent("drift", {
  tick: function (time, delta) {
    this.el.object3D.rotation.y += delta * 0.000012;
  },
});
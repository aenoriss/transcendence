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
      if (this.ring) this.ring.material.color.set(e.detail.accent);
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

  // What stands around a piece in the world: a ring on the floor under it, and a plate above
  // it with its number and title that always faces the visitor.
  dress: function () {
    const art = this.artworks[this.el.id];
    const pos = this.el.object3D.position;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(8.4, 9, 64),
      new THREE.MeshBasicMaterial({ color: 0xff3df2, transparent: true, opacity: 0.5, side: THREE.DoubleSide, fog: false, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.45, pos.z);
    ring.visible = false;
    this.el.sceneEl.object3D.add(ring);
    this.ring = ring;

    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    const draw = () => {
      const c = canvas.getContext("2d");
      c.clearRect(0, 0, 1024, 256);
      c.textAlign = "center";
      c.fillStyle = "rgba(244,241,255,0.72)";
      c.font = "700 44px 'Space Mono', monospace";
      c.fillText((this.number < 10 ? "0" : "") + this.number + (this.seen ? "  ·  SEEN" : ""), 512, 70);
      c.fillStyle = "#ffffff";
      let size = 84;
      c.font = "800 " + size + "px 'Syne', sans-serif";
      while (c.measureText(art.title).width > 980 && size > 34) { size -= 4; c.font = "800 " + size + "px 'Syne', sans-serif"; }
      c.fillText(art.title, 512, 180);
      texture.needsUpdate = true;
    };
    this.drawPlate = draw;
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    const plate = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, fog: false, depthWrite: false }));
    plate.scale.set(22, 5.5, 1);
    plate.position.set(0, 13.4, 0);
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
      const pulse = near ? 0.75 + Math.sin(time * 0.005) * 0.2 : this.seen ? 0.18 : 0.45;
      this.ring.material.opacity += (pulse - this.ring.material.opacity) * Math.min(1, delta * 0.01);
    }

    if (near && !this.sw) {
      this.sw = true;
      const first = !this.seen;
      this.seen = true;
      if (first && this.drawPlate) this.drawPlate();
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
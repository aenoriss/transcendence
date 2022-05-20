const { Vector3 } = require("aframe");

AFRAME.registerComponent("teleport", {
  schema: {
    goTo: { default: "map0" },
    portalPos: { default: null },
    playerPos: { default: null },
    mapObj: {},
    spawnPoints: {},
    portals: {},
    returnPos: {}
  },
  init: function () {
    this.currentPortal = this.el;

    const player = document.getElementById("rig");
    this.playerPos = player.getAttribute("position");

    this.mapObj = {
      map0: document.getElementById("map1"),
      map1: document.getElementById("map2"),
      map2: document.getElementById("map3"),
      map3: document.getElementById("map4"),
    }

    this.spawnPoints = {
      map0: new THREE.Vector3(0, 3, 0),
      map1: new THREE.Vector3(-31, 4, -50),
      map2: new THREE.Vector3(6, 4, -5),
      map3: new THREE.Vector3(-26, 4, -42),
    }

    this.portals = {
      portal0: document.getElementById("portalSpawn"),
      portal1: document.getElementById("portal1"),
      portal2: document.getElementById("portal2"),
      portal3: document.getElementById("portal3"),
    }

    this.returnPos = {
      map0: new THREE.Vector3(60, 4, -30),
      map1: new THREE.Vector3(-47, 4, -45),
      map2: new THREE.Vector3(37, 4, -6),
      map3: new THREE.Vector3(-54, 4, -42),
    }

  },
  update: function () { },
  tick: function () {
    // console.log("PORTAL POS", this.data.playerPos.distanceTo(this.data.portalPos))
    // console.log("current player pos", this.data.playerPos);
    if (this.playerPos.distanceTo(this.currentPortal.getAttribute("position")) < 6 && this.currentPortal.getAttribute("visible") == true) {
      // console.log("portal activated", this.data.goTo)
      // console.log("cddd", document.getElementById("portalSpawn"))
      console.log("this.mapObj", this.mapObj)

      for (let key in this.mapObj) {

        if (this.mapObj[key].getAttribute("visible") == true) {
          console.log("this.mapObj", this.mapObj)

          //Change Environment
          this.mapObj[key].setAttribute("visible", false);
          this.mapObj[this.data.goTo].setAttribute("visible", true);

          //Reset Player Position
          // console.log("sadada", this.spawnPoints);
          console.log("KEY ACTIVATEEEED", key)
          this.playerPos.set(this.spawnPoints[this.data.goTo]["x"], this.spawnPoints[this.data.goTo]["y"], this.spawnPoints[this.data.goTo]["z"]);

          console.log("this.portals", this.portals)

          //Changes Portal Spawn
          if (this.data.goTo == "map0") {

            this.portals["portal0"].setAttribute("visible", false)
            this.portals["portal1"].setAttribute("visible", true)
            this.portals["portal2"].setAttribute("visible", true)
            this.portals["portal3"].setAttribute("visible", true)

            document.getElementById("artwork1").setAttribute("visible", false);
            document.getElementById("artwork2").setAttribute("visible", false);
            document.getElementById("artwork3").setAttribute("visible", false);
            document.getElementById("artwork4").setAttribute("visible", false);
            document.getElementById("artwork5").setAttribute("visible", false);
            document.getElementById("artwork6").setAttribute("visible", false);
            document.getElementById("artwork7").setAttribute("visible", false);
            document.getElementById("artwork8").setAttribute("visible", false);
            document.getElementById("artwork9").setAttribute("visible", false);
            document.getElementById("artwork10").setAttribute("visible", false);
            document.getElementById("artwork11").setAttribute("visible", false);
            document.getElementById("artwork12").setAttribute("visible", false);

          } else {
            this.portals["portal0"].setAttribute("visible", true)
            this.portals["portal1"].setAttribute("visible", false)
            this.portals["portal2"].setAttribute("visible", false)
            this.portals["portal3"].setAttribute("visible", false)

            if (this.data.goTo == "map1") {
              console.log("BUILD ARTWORK")
              //Spawning Artwork
              document.getElementById("artwork1").setAttribute("visible", true);
              document.getElementById("artwork2").setAttribute("visible", true);
              document.getElementById("artwork3").setAttribute("visible", true);
              document.getElementById("artwork4").setAttribute("visible", true);
              document.getElementById("artwork5").setAttribute("visible", true);
              document.getElementById("artwork6").setAttribute("visible", true);
              document.getElementById("artwork7").setAttribute("visible", true);
              document.getElementById("artwork8").setAttribute("visible", true);
              document.getElementById("artwork9").setAttribute("visible", true);
              document.getElementById("artwork10").setAttribute("visible", true);
              document.getElementById("artwork11").setAttribute("visible", true);
              document.getElementById("artwork12").setAttribute("visible", true);


            }
          }

          //Place Return Portal
          this.portals["portal0"].setAttribute("position", { x: this.returnPos[this.data.goTo]["x"], y: this.returnPos[this.data.goTo]["y"], z: this.returnPos[this.data.goTo]["z"] });


        }
      }





    }
  },
  remove: function () { },
  pause: function () { },
  play: function () {

  },
});
const { Vector3 } = require("aframe");

AFRAME.registerComponent("teleport", {
  schema: {
    goTo: { default: 0 },
    portalPos: { default: null },
    playerPos: {default: null}
  },
  init: function () {
    let pos = {...this.el.getAttribute("position")}
    this.data.portalPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    


    const player = document.getElementById("rig")
    this.data.playerPos = player.getAttribute("position")
  },
  update: function () {},
  tick: function () {
    // console.log("PORTAL POS", this.data.playerPos.distanceTo(this.data.portalPos))

    // console.log("current player pos", this.data.playerPos);
    if(this.data.playerPos.distanceTo(this.data.portalPos) < 6){
      console.log("portal activated")
    }
  },
  remove: function () { },
  pause: function () { },
  play: function () {

  },
});
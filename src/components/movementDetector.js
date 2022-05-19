AFRAME.registerComponent("movementdetector", {
  schema: {
    newPos: { default: new THREE.Vector3()},
    oldPos: { default: new THREE.Vector3()}

  },
  init: function () {
    this.data.newPos = {...this.el.getAttribute("position")};
    this.data.oldPos = {...this.el.getAttribute("position")};
    let sw = true;

    setInterval( ()=> {
      this.data.oldPos = {...this.data.newPos};
      this.data.newPos = {...this.el.getAttribute("position")};
  
  
      // console.log(this.data.newPos, this.data.oldPos)
  
      // this.data.oldPos.copy(this.data.newPos);
      // this.data.newPos.copy({...this.el.getAttribute("position")});
  
      // this.data.oldPos = this.data.oldPos *2
  
      // console.log("scene", this.data.oldPos, this.data.newPos)
      let particles = document.getElementById("particles");
  
      if(this.data.oldPos["x"] != this.data.newPos["x"] || this.data.oldPos["y"] != this.data.newPos["y"] || this.data.oldPos["z"] != this.data.newPos["z"] ){
        if(sw == false){
          particles.setAttribute("particle-system", "maxAge", 1);
          console.log("STARTED TO MOVE");
          sw = true;
        }

        // console.log("particles", active);
      } else{
        if(sw == true){
          particles.setAttribute("particle-system", "maxAge",0);
          console.log("STOPPED MOVING");
          sw = false;
        }
      }
    } , 100)



    // console.log(pos)

    // this.data.newPos.copy(pos);
    // this.data.oldPos.copy(pos);

    // let scene = document.querySelector('a-scene').object3D;
  },
  update: function () {
  },
  tick: function () {
  
  },
  remove: function () { },
  pause: function () { },
  play: function () {
    
   },
});
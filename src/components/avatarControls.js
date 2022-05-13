AFRAME.registerComponent("avatarcontrols", {
  schema: {},
  init: function () {
    this.el.addEventListener("model-loaded", () => {
      this.el.setAttribute("ammo-shape", "type:mesh");
  });
  },
  update: function () { },
  tick: function () {},
  remove: function () { },
  pause: function () { },
  play: function () { },
});
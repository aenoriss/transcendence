AFRAME.registerComponent("showinfo", {
  schema: {},
  init: function () {

    const player = document.getElementById("rig");
    this.playerPos = player.getAttribute("position");

    this.trigger = this.el;

    this.sw = false;

    // console.log("showInfo")

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

  update: function () { },
  tick: function () {

    // console.log("DISTANCE", this.playerPos.distanceTo(this.trigger.getAttribute("position")));
    let modal = document.getElementById("modal");

    if (this.playerPos.distanceTo(this.trigger.getAttribute("position")) < 25 && this.trigger.getAttribute("visible") == true) {
      console.log("INFO SHOWN")

      this.sw = true;

      //Show Modal
      modal.style.display = "inline";

      //Get id
      let artworkId = this.trigger.id;
      // console.log("THIS IS THE ID: ", artworkId);

      //Get title and description.
      let modalTitle = document.getElementById("info-title");
      let modalDescription = document.getElementById("info-description");

      modalTitle.innerHTML = this.artworks[artworkId].title;
      modalDescription.innerHTML = this.artworks[artworkId].description;

    }else if(this.sw == true){
      //Hide Modal
      this.sw = false;
      modal.style.display = "none";
    }
  },
    remove: function () { },
    pause: function () { },
    play: function () {

    },
  });
/* global AFRAME, THREE, WORLDS, SIGILS */

// Everything drawn over the canvas: the entry screen with its loading bar, the world label,
// the compass with the tour's steps around it, the artwork caption card, the full-screen
// viewer and the flash that covers a portal jump.
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn);
  }
  function two(n) { return (n < 10 ? '0' : '') + n; }

  ready(function () {
    var $ = function (id) { return document.getElementById(id); };
    var scene = document.querySelector('a-scene');
    var assets = document.querySelector('a-assets');
    var root = document.documentElement;
    var intro = $('intro'), enter = $('enter'), bar = $('load-bar');
    var hud = $('hud'), hint = $('hint'), card = $('card'), flash = $('flash');
    var compass = $('compass'), viewer = $('viewer');
    var rig = $('rig');

    // ---- Loading: count the models and images as they arrive.
    var items = Array.prototype.slice.call(assets.querySelectorAll('a-asset-item, img'));
    var done = 0;
    function progress() {
      done++;
      bar.style.transform = 'scaleX(' + Math.min(1, done / items.length) + ')';
    }
    items.forEach(function (item) {
      if (item.tagName === 'IMG') {
        if (item.complete) progress(); else item.addEventListener('load', progress);
      } else {
        item.addEventListener('loaded', progress);
      }
    });
    function loaded() {
      bar.style.transform = 'scaleX(1)';
      intro.classList.add('is-ready');
      enter.disabled = false;
      enter.textContent = 'Enter the gallery';
    }
    if (assets.hasLoaded) loaded(); else assets.addEventListener('loaded', loaded);

    // ---- The entry screen: a figure and a line from its own text, changing every few seconds,
    // and everything shifting a little with the pointer. The lines are the gallery's.
    var LORE = [
      { art: 1, from: 'The Creator of Thoughts', text: 'Everything springs from a thought. A flash, a spark, an impulse that gives rise to the innovative makes its way inside.' },
      { art: 5, from: "The Anxiety That's Gone With the Wind", text: 'The Universe is in constant movement, for some to stay still is to go crazy.' },
      { art: 7, from: 'The Quantum Hedgehog', text: 'Some pursue the suspicion that there is something more, sooner or later it is in that search that other dimensions are accessed.' },
      { art: 6, from: 'Perspiration of Irony', text: 'Shapes are not just what you see with the naked eye.' },
      { art: 3, from: 'The Initiate', text: 'Is the first to know the mysteries of the Transcendence universe creation.' },
    ];
    var loreAt = 0, figure = $('intro-figure'), lore = $('intro-lore');
    var loreTimer = setInterval(function () {
      figure.classList.add('is-changing');
      lore.classList.add('is-changing');
      setTimeout(function () {
        loreAt = (loreAt + 1) % LORE.length;
        figure.src = 'Textures/artwork' + LORE[loreAt].art + '.png';
        $('intro-lore-text').textContent = LORE[loreAt].text;
        $('intro-lore-from').textContent = LORE[loreAt].from;
        figure.classList.remove('is-changing');
        lore.classList.remove('is-changing');
      }, 900);
    }, 6500);

    // The entry screen is a still picture, so the 3D scene behind it is stopped once it has
    // loaded and drawn. It starts again on Enter.
    var stopped = false;
    function stopScene() {
      if (entered || stopped || !scene.renderer || !scene.renderer.animate) return;
      stopped = true;
      scene.pause();
      scene.renderer.animate(null);
    }
    if (assets.hasLoaded) setTimeout(stopScene, 1500);
    else assets.addEventListener('loaded', function () { setTimeout(stopScene, 1500); });

    // ---- Entering is also the click that lets the browser start the soundtrack.
    var entered = false;
    enter.addEventListener('click', function () {
      entered = true;
      startedAt = performance.now();
      if (stopped) { stopped = false; scene.play(); scene.renderer.animate(scene.render.bind(scene)); }
      clearInterval(loreTimer);
      intro.classList.add('is-gone');
      hud.classList.add('is-on');
      compass.classList.add('is-on');
      var music = $('music');
      if (music && music.components.sound) music.components.sound.playSound();
      if (scene.canvas) scene.canvas.focus();
      setTimeout(function () { hint.classList.add('is-gone'); }, 12000);
    });

    // ---- The tour. Every piece and every portal crossing is a step, in one fixed order:
    // the first world's pieces, then for each other world the portal out, its pieces and the
    // portal back. The compass points at the first step not yet done.
    var PORTAL_TO = { map1: 'portal1', map2: 'portal2', map3: 'portal3' };
    var steps = [];
    WORLDS.map0.artworks.forEach(function (n) { steps.push({ kind: 'piece', n: n, world: 'map0' }); });
    ['map1', 'map2', 'map3'].forEach(function (key, i, all) {
      steps.push({ kind: 'out', to: key, world: 'map0' });
      WORLDS[key].artworks.forEach(function (n) { steps.push({ kind: 'piece', n: n, world: key }); });
      if (i < all.length - 1) steps.push({ kind: 'back', from: key, world: key });
    });

    // One tick per step around the dial: a square for a piece, a diamond for a portal.
    var tickGroup = $('compass-ticks');
    steps.forEach(function (step, i) {
      var tick = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      var size = step.kind === 'piece' ? 5 : 6.5;
      tick.setAttribute('x', -size / 2); tick.setAttribute('y', -64 - size / 2 + 2.5);
      tick.setAttribute('width', size); tick.setAttribute('height', size);
      var turn = 'rotate(' + (i * 360 / steps.length) + ')';
      if (step.kind !== 'piece') turn += ' rotate(45 0 -61.5)';
      tick.setAttribute('transform', turn);
      if (step.kind !== 'piece') tick.setAttribute('class', 'is-portal');
      tickGroup.appendChild(tick);
      step.tick = tick;
    });
    function markDone(step) {
      if (step.done) return;
      step.done = true;
      step.tick.setAttribute('class', (step.kind === 'piece' ? '' : 'is-portal ') + 'is-seen');
    }
    function nextStep() { for (var i = 0; i < steps.length; i++) if (!steps[i].done) return steps[i]; return null; }
    // The pieces ask this before opening: an egg opens only when it is the tour's next step.
    window.TOUR = { nextPiece: function () { var s = nextStep(); return s && s.kind === 'piece' ? s.n : null; } };

    // ---- World label, accent colour and the portal flash.
    var world = { key: 'map0', accent: '#ff3df2' };
    scene.addEventListener('worldchange', function (e) {
      var from = world.key;
      world = e.detail;
      $('world-label').textContent = e.detail.name;
      root.style.setProperty('--accent', e.detail.accent);
      closeCard();
      // Crossing a portal is a step of the tour too.
      steps.forEach(function (step) {
        if (step.kind === 'out' && from === 'map0' && step.to === world.key) markDone(step);
        if (step.kind === 'back' && world.key === 'map0' && step.from === from) markDone(step);
      });
    });
    scene.addEventListener('portalenter', function (e) {
      flash.style.background = e.detail.accent;
      flash.classList.add('is-on');
      setTimeout(function () { flash.classList.remove('is-on'); }, 420);
    });

    // ---- Caption card and the full-screen viewer.
    var current = null, seen = {}, sealedAt = null;
    function closeCard() { current = null; sealedAt = null; card.classList.remove('is-on'); }
    // Reaching an egg out of turn: it stays shut, and the card says what comes first.
    scene.addEventListener('artworklocked', function (e) {
      current = null;
      sealedAt = e.detail.number;
      card.classList.remove('is-new');
      card.classList.add('is-locked', 'is-on');
      $('card-number').textContent = two(e.detail.number) + ' / 15';
      $('card-title').textContent = 'Sealed';
      $('card-text').textContent = e.detail.next
        ? 'This egg opens after piece ' + two(e.detail.next) + '. Follow the compass.'
        : 'This egg opens later in the tour. Follow the compass.';
    });
    scene.addEventListener('artworknear', function (e) {
      card.classList.remove('is-locked');
      sealedAt = null;
      current = e.detail;
      seen[e.detail.number] = true;
      $('compass-seen').textContent = two(Object.keys(seen).length) + ' / 15 seen';
      steps.forEach(function (step) { if (step.kind === 'piece' && step.n === e.detail.number) markDone(step); });
      // A piece read for the first time: the card says so, the dial kicks and the view
      // washes with the world's colour.
      card.classList.toggle('is-new', !!e.detail.first);
      if (e.detail.first) {
        var counter = $('compass-seen');
        [counter, compass].forEach(function (el) { el.classList.remove('is-bumped', 'is-collect'); });
        void compass.offsetWidth;
        counter.classList.add('is-bumped');
        compass.classList.add('is-collect');
        flash.style.background = world.accent;
        flash.classList.add('is-soft');
        setTimeout(function () { flash.classList.remove('is-soft'); }, 260);
      }
      $('card-thumb').src = e.detail.src;
      $('card-number').textContent = two(e.detail.number) + ' / 15';
      $('card-title').textContent = e.detail.title;
      $('card-text').textContent = e.detail.description;
      card.classList.add('is-on');
    });
    scene.addEventListener('artworkfar', function (e) {
      if ((current && current.number === e.detail.number) || sealedAt === e.detail.number) closeCard();
    });

    // While a piece or the collection is open, the rider stays put and the mouse does not
    // turn the view.
    function hold(on) {
      rig.setAttribute('movement-controls', 'enabled', !on);
      $('head').setAttribute('look-controls', 'enabled', !on);
      if (rig.components.walker) rig.components.walker.locked = on;
      if (!on && scene.canvas) scene.canvas.focus();
    }

    // `piece` is the one to show: the piece you are standing at, or one picked from the collection.
    function setViewer(open, piece) {
      piece = piece || current;
      if (open && !piece) return;
      viewer.classList.toggle('is-on', open);
      if (open) {
        $('viewer-img').src = piece.src;
        $('viewer-number').textContent = two(piece.number) + ' / 15';
        $('viewer-title').textContent = piece.title;
        $('viewer-desc').textContent = piece.description;
        $('viewer-close').focus();
      }
      hold(open || collection.classList.contains('is-on'));
    }

    // ---- The collection: fifteen slots. An opened piece shows itself and can be looked at
    // again. A sealed one is an egg and a number, nothing more.
    var collection = $('collection'), grid = $('collection-grid'), opened = {}, slots = {};
    var EGG = '<svg viewBox="-30 -34 60 68" aria-hidden="true"><polygon points="0,-28 18,-13 16,13 0,26 -16,13 -18,-13"></polygon><path d="M0,-28 L0,26 M-18,-13 L18,-13 M-16,13 L16,13"></path></svg>';
    for (var n = 1; n <= 15; n++) {
      var slot = document.createElement('li');
      slot.innerHTML = '<button disabled>' + EGG + '<span class="slot-number">' + two(n) + '</span><span class="slot-title">Sealed</span></button>';
      grid.appendChild(slot);
      slots[n] = slot;
    }
    function openSlot(piece) {
      if (opened[piece.number]) return;
      opened[piece.number] = piece;
      var slot = slots[piece.number], button = slot.querySelector('button');
      slot.className = 'is-open';
      button.disabled = false;
      button.innerHTML = '<img alt="" src="' + piece.src + '"><span class="slot-number">' + two(piece.number) + '</span><span class="slot-title"></span>';
      button.querySelector('.slot-title').textContent = piece.title;
      button.addEventListener('click', function () { setViewer(true, piece); });
      $('collection-count').textContent = two(Object.keys(opened).length) + ' / 15 opened';
    }
    function setCollection(open) {
      collection.classList.toggle('is-on', open);
      hold(open);
      if (open) $('collection-close').focus();
    }
    // A new piece does not take the screen. Its picture drops in beside the collection label
    // in the corner for a second, and the ride goes on.
    var peekTimer = null, added = $('added');
    function peek(piece) {
      clearTimeout(peekTimer);
      Object.keys(slots).forEach(function (k) { slots[k].classList.remove('is-fresh'); });
      slots[piece.number].classList.add('is-fresh');     // still marked if the collection is opened next
      $('added-img').src = piece.src;
      $('added-count').textContent = two(Object.keys(opened).length) + ' / 15';
      added.classList.remove('is-on');
      void added.offsetWidth;
      added.classList.add('is-on');
      peekTimer = setTimeout(function () { added.classList.remove('is-on'); }, 1200);
    }
    scene.addEventListener('artworknear', function (e) {
      openSlot(e.detail);
      if (!e.detail.first) return;
      var last = Object.keys(opened).length === 15;
      setTimeout(function () { peek(e.detail); }, 500);
      // The last egg: let its opening play out, then show the end.
      if (last) setTimeout(showWin, 2200);
    });

    // ---- The end: all fifteen figures arrive one after another over the sky, with how long
    // the tour took.
    var win = $('win'), startedAt = 0;
    function showWin() {
      var figures = $('win-figures');
      figures.innerHTML = '';
      for (var n = 1; n <= 15; n++) {
        var li = document.createElement('li'), img = document.createElement('img');
        img.src = opened[n] ? opened[n].src : 'Textures/artwork' + n + '.png';
        img.alt = opened[n] ? opened[n].title : '';
        li.style.animationDelay = (0.25 + n * 0.09) + 's';
        li.appendChild(img);
        figures.appendChild(li);
      }
      var secs = Math.round((performance.now() - startedAt) / 1000);
      $('win-stats').textContent = 'Four worlds, fifteen pieces, ' + Math.floor(secs / 60) + ' min ' + two(secs % 60) + ' s.';
      setViewer(false);
      card.classList.remove('is-on');
      win.classList.add('is-on');
      hold(true);
      $('win-ride').focus();
    }
    window.TOUR.showWin = showWin;
    $('win-ride').addEventListener('click', function () { win.classList.remove('is-on'); hold(false); });
    $('win-collection').addEventListener('click', function () { win.classList.remove('is-on'); setCollection(true); });
    $('collection-close').addEventListener('click', function () { setCollection(false); });
    collection.addEventListener('click', function (e) { if (e.target === collection) setCollection(false); });

    window.addEventListener('keydown', function (e) {
      if (!entered) return;
      if (win.classList.contains('is-on')) return;
      var viewing = viewer.classList.contains('is-on');
      var browsing = collection.classList.contains('is-on');
      if (e.code === 'KeyE' && (viewing || !browsing)) setViewer(!viewing);
      if (e.code === 'KeyC' && !viewing) setCollection(!browsing);
      if (e.code === 'Escape') { if (viewing) setViewer(false); else if (browsing) setCollection(false); }
    });
    $('viewer-close').addEventListener('click', function () { setViewer(false); });
    viewer.addEventListener('click', function (e) { if (e.target === viewer) setViewer(false); });

    scene.addEventListener('boost', function (e) { root.classList.toggle('is-boosting', e.detail.on); });

    // ---- Compass: where the next step of the tour is from here.
    var needle = $('compass-needle'), what = $('compass-what'), distEl = $('compass-dist');
    var forward = new THREE.Vector3(), lastUpdate = 0, sigilFor = null;
    var fuelRing = $('fuel-ring'), fuelText = $('fuel-text'), fuelShown = -1;
    function tickCompass(now) {
      requestAnimationFrame(tickCompass);
      // The fuel band round the dial follows the tank every frame.
      var walker = rig.components && rig.components.walker;
      if (walker && Math.abs(walker.fuel - fuelShown) > 0.004) {
        fuelShown = walker.fuel;
        fuelRing.style.strokeDashoffset = ((1 - fuelShown) * 100).toFixed(2);
        fuelText.textContent = 'Fuel ' + Math.round(fuelShown * 100);
        compass.classList.toggle('is-low-fuel', fuelShown < 0.2);
      }
      if (!entered || now - lastUpdate < 90) return;
      lastUpdate = now;
      var step = nextStep(), target = null, label = '', picture = '', leadsTo = null;
      if (step) {
        if (step.world === world.key) {
          // The step is in this world: the piece itself, or the portal to take.
          if (step.kind === 'piece') {
            target = $('artwork' + step.n);
            label = 'Next piece ' + two(step.n);
            picture = 'egg';   // sealed: the dial shows an egg, never the piece itself
          } else if (step.kind === 'out') {
            target = $(PORTAL_TO[step.to]);
            leadsTo = WORLDS[step.to];
          } else {
            target = $('portalSpawn');
            leadsTo = WORLDS.map0;
          }
        } else if (world.key === 'map0') {
          // The step is in another world: from the first world, its portal leads there.
          target = $(PORTAL_TO[step.world]);
          leadsTo = WORLDS[step.world];
        } else {
          target = $('portalSpawn');
          leadsTo = WORLDS.map0;
        }
      }
      // A portal step shows which portal: the destination's name, its colour and its sigil,
      // the same three things that are on the portal's own sign.
      if (leadsTo) {
        label = 'Take the portal to ' + leadsTo.name;
        if (sigilFor !== leadsTo) {
          sigilFor = leadsTo;
          $('compass-sigil').setAttribute('points', SIGILS[leadsTo.sigil].map(function (pt) { return (pt[0] * 20).toFixed(1) + ',' + (pt[1] * 20).toFixed(1); }).join(' '));
          compass.style.setProperty('--step', leadsTo.accent);
        }
      } else if (sigilFor) {
        sigilFor = null;
        compass.style.removeProperty('--step');
      }
      compass.classList.toggle('is-done', !target);
      compass.classList.toggle('has-egg', !!picture);
      compass.classList.toggle('is-portal-step', !!target && !picture);
      if (!target) { what.textContent = 'All 15 seen'; distEl.textContent = ''; return; }
      var pos = rig.object3D.position, to = target.object3D.position;
      what.textContent = label;
      distEl.textContent = Math.round(Math.hypot(to.x - pos.x, to.z - pos.z)) + ' m';
      // The bearing to the target against where the camera looks, as a turn of the needle.
      var cam = scene.camera;
      if (!cam) return;
      cam.getWorldDirection(forward);
      var heading = Math.atan2(forward.x, forward.z);
      var bearing = Math.atan2(to.x - pos.x, to.z - pos.z);
      needle.style.transform = 'rotate(' + ((heading - bearing) * 180 / Math.PI) + 'deg)';
    }
    requestAnimationFrame(tickCompass);
  });
})();

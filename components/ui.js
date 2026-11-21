/* global AFRAME, THREE */

// Everything drawn over the canvas: the entry screen with its loading bar, the world label
// and seen counter, the compass, the air-time readout, the artwork caption card, the
// full-screen viewer and the flash that covers a portal jump.
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
    var compass = $('compass'), air = $('air'), viewer = $('viewer');
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

    // ---- Entering is also the click that lets the browser start the soundtrack.
    var entered = false;
    enter.addEventListener('click', function () {
      entered = true;
      intro.classList.add('is-gone');
      hud.classList.add('is-on');
      compass.classList.add('is-on');
      var music = $('music');
      if (music && music.components.sound) music.components.sound.playSound();
      if (scene.canvas) scene.canvas.focus();
      setTimeout(function () { hint.classList.add('is-gone'); }, 12000);
    });

    // ---- World label, accent colour and the portal flash.
    var world = { key: 'map0', accent: '#ff3df2' };
    scene.addEventListener('worldchange', function (e) {
      world = e.detail;
      $('world-label').textContent = e.detail.label;
      root.style.setProperty('--accent', e.detail.accent);
      closeCard();
    });
    scene.addEventListener('portalenter', function (e) {
      flash.style.background = e.detail.accent;
      flash.classList.add('is-on');
      setTimeout(function () { flash.classList.remove('is-on'); }, 420);
    });

    // ---- Caption card, seen counter and the full-screen viewer.
    var current = null, seen = {};
    function closeCard() { current = null; card.classList.remove('is-on'); }
    scene.addEventListener('artworknear', function (e) {
      current = e.detail;
      seen[e.detail.number] = true;
      $('seen').textContent = 'SEEN ' + two(Object.keys(seen).length) + ' / 15';
      $('card-thumb').src = e.detail.src;
      $('card-number').textContent = two(e.detail.number) + ' / 15';
      $('card-title').textContent = e.detail.title;
      $('card-text').textContent = e.detail.description;
      card.classList.add('is-on');
    });
    scene.addEventListener('artworkfar', function (e) {
      if (current && current.number === e.detail.number) closeCard();
    });

    function setViewer(open) {
      if (open && !current) return;
      viewer.classList.toggle('is-on', open);
      // While a piece is open the rider stays put and the mouse does not turn the view.
      rig.setAttribute('movement-controls', 'enabled', !open);
      $('head').setAttribute('look-controls', 'enabled', !open);
      if (rig.components.walker) rig.components.walker.locked = open;
      if (open) {
        $('viewer-img').src = current.src;
        $('viewer-number').textContent = two(current.number) + ' / 15';
        $('viewer-title').textContent = current.title;
        $('viewer-desc').textContent = current.description;
        $('viewer-close').focus();
      } else if (scene.canvas) {
        scene.canvas.focus();
      }
    }
    window.addEventListener('keydown', function (e) {
      if (!entered) return;
      var open = viewer.classList.contains('is-on');
      if (e.code === 'KeyE') setViewer(!open);
      if (e.code === 'Escape' && open) setViewer(false);
    });
    $('viewer-close').addEventListener('click', function () { setViewer(false); });
    viewer.addEventListener('click', function (e) { if (e.target === viewer) setViewer(false); });

    // ---- Air time: counted from leaving the ground to landing, shown when it was a real jump.
    var airStart = null, airTimer = null;
    scene.addEventListener('land', function () {
      if (airStart === null) return;
      var secs = (performance.now() - airStart) / 1000;
      airStart = null;
      if (secs < 0.45) return;
      air.textContent = 'AIR ' + secs.toFixed(1) + ' s';
      air.classList.add('is-on');
      clearTimeout(airTimer);
      airTimer = setTimeout(function () { air.classList.remove('is-on'); }, 1600);
    });
    scene.addEventListener('boost', function (e) { root.classList.toggle('is-boosting', e.detail.on); });

    // ---- Compass: the nearest piece not yet read, or a portal when this world has none left.
    var arrow = $('compass-arrow'), what = $('compass-what'), distEl = $('compass-dist');
    var forward = new THREE.Vector3(), lastUpdate = 0;
    function tickCompass(now) {
      requestAnimationFrame(tickCompass);
      var walker = rig.components && rig.components.walker;
      if (walker && airStart === null && !walker.grounded) airStart = performance.now();
      if (!entered || now - lastUpdate < 90) return;
      lastUpdate = now;
      var pos = rig.object3D.position, best = null, bestD = Infinity, label = 'Nearest piece';
      var consider = function (el, name) {
        if (!el.object3D.visible) return;
        var d = Math.hypot(el.object3D.position.x - pos.x, el.object3D.position.z - pos.z);
        if (d < bestD) { bestD = d; best = el; label = name; }
      };
      Array.prototype.forEach.call(document.querySelectorAll('[showinfo]'), function (el) {
        if (!seen[Number(el.id.replace('artwork', ''))]) consider(el, 'Nearest piece');
      });
      if (!best) {
        ['portal1', 'portal2', 'portal3', 'portalSpawn'].forEach(function (id) {
          consider($(id), id === 'portalSpawn' ? 'Portal back' : 'Nearest portal');
        });
      }
      if (!best) { compass.classList.add('is-empty'); return; }
      compass.classList.remove('is-empty');
      // Angle of the target relative to where the camera looks, turned into a screen rotation.
      var cam = scene.camera;
      if (!cam) return;
      cam.getWorldDirection(forward);
      var heading = Math.atan2(forward.x, forward.z);
      var bearing = Math.atan2(best.object3D.position.x - pos.x, best.object3D.position.z - pos.z);
      arrow.style.transform = 'rotate(' + ((heading - bearing) * 180 / Math.PI) + 'deg)';
      what.textContent = label;
      distEl.textContent = Math.round(bestD) + ' m';
    }
    requestAnimationFrame(tickCompass);
  });
})();

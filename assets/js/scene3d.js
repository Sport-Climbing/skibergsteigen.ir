(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function initHeroDepth() {
    var hero = document.querySelector("[data-hero-3d]");
    if (!hero) return;
    var media = hero.querySelector("[data-hero-media]");
    var canvas = hero.querySelector("[data-hero-snow]");
    if (!media) return;

    if (reduceMotion) {
      hero.classList.add("is-flat");
      return;
    }

    hero.classList.add("is-live");
    var targetX = 0;
    var targetY = 0;
    var currentX = 0;
    var currentY = 0;
    var ticking = false;

    function apply() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      media.style.setProperty("--tilt-x", currentY.toFixed(3) + "deg");
      media.style.setProperty("--tilt-y", currentX.toFixed(3) + "deg");
      media.style.setProperty("--shift-x", (currentX * -2.4).toFixed(3) + "px");
      media.style.setProperty("--shift-y", (currentY * -2.4).toFixed(3) + "px");
      ticking = false;
    }

    function onMove(clientX, clientY) {
      var rect = hero.getBoundingClientRect();
      var nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      var ny = ((clientY - rect.top) / rect.height) * 2 - 1;
      targetX = clamp(nx, -1, 1) * 5.5;
      targetY = clamp(ny, -1, 1) * -4;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    }

    hero.addEventListener("pointermove", function (event) {
      onMove(event.clientX, event.clientY);
    }, { passive: true });

    hero.addEventListener("pointerleave", function () {
      targetX = 0;
      targetY = 0;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    });

    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var flakes = [];
    var width = 0;
    var height = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var flakeCount = 48;

    function resize() {
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = [];
      for (var i = 0; i < flakeCount; i += 1) {
        flakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.6 + Math.random() * 1.8,
          s: 0.25 + Math.random() * 0.7,
          a: 0.18 + Math.random() * 0.35,
          drift: (Math.random() - 0.5) * 0.35
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < flakes.length; i += 1) {
        var flake = flakes[i];
        flake.y += flake.s;
        flake.x += flake.drift + currentX * 0.02;
        if (flake.y > height + 4) {
          flake.y = -4;
          flake.x = Math.random() * width;
        }
        if (flake.x < -4) flake.x = width + 4;
        if (flake.x > width + 4) flake.x = -4;
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 252, 248, " + flake.a + ")";
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    requestAnimationFrame(draw);
  }

  function initTheater() {
    var root = document.querySelector("[data-theater]");
    if (!root) return;

    var ring = root.querySelector("[data-theater-ring]");
    var stage = root.querySelector("[data-theater-stage]");
    var panels = Array.prototype.slice.call(root.querySelectorAll("[data-theater-panel]"));
    var dots = Array.prototype.slice.call(root.querySelectorAll("[data-theater-dot]"));
    var caption = root.querySelector("[data-theater-caption]");
    var location = root.querySelector("[data-theater-location]");
    var prev = root.querySelector("[data-theater-prev]");
    var next = root.querySelector("[data-theater-next]");
    var count = panels.length;
    if (!ring || count < 1) return;

    var index = 0;
    var angle = 0;
    var autoplay = !reduceMotion;
    var dragging = false;
    var dragStartX = 0;
    var dragStartAngle = 0;
    var lastDragX = 0;
    var velocity = 0;
    var raf = 0;

    function stepAngle() {
      return 360 / count;
    }

    function normalizeIndex(value) {
      var n = ((value % count) + count) % count;
      return n;
    }

    function setIndex(nextIndex, animate) {
      index = normalizeIndex(nextIndex);
      angle = -index * stepAngle();
      ring.style.transition = animate === false || reduceMotion ? "none" : "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)";
      ring.style.setProperty("--angle", angle + "deg");
      panels.forEach(function (panel, i) {
        var active = i === index;
        panel.classList.toggle("is-active", active);
        panel.setAttribute("aria-hidden", active ? "false" : "true");
      });
      dots.forEach(function (dot, i) {
        var active = i === index;
        dot.classList.toggle("is-active", active);
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      var activePanel = panels[index];
      if (caption) caption.textContent = activePanel.getAttribute("data-caption") || "";
      if (location) location.textContent = activePanel.getAttribute("data-location") || "";
    }

    function go(delta) {
      setIndex(index + delta, true);
    }

    setIndex(0, false);

    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        setIndex(Number(dot.getAttribute("data-index") || 0), true);
      });
    });

    if (stage) {
      stage.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          go(1);
        }
      });

      stage.addEventListener("pointerdown", function (event) {
        if (event.button !== 0) return;
        if (event.target.closest("button.theater__open")) return;
        dragging = true;
        autoplay = false;
        dragStartX = event.clientX;
        lastDragX = event.clientX;
        dragStartAngle = angle;
        velocity = 0;
        ring.style.transition = "none";
        stage.setPointerCapture(event.pointerId);
      });

      stage.addEventListener("pointermove", function (event) {
        if (!dragging) return;
        var dx = event.clientX - dragStartX;
        velocity = event.clientX - lastDragX;
        lastDragX = event.clientX;
        angle = dragStartAngle + dx * 0.18;
        ring.style.setProperty("--angle", angle + "deg");
      });

      function endDrag(event) {
        if (!dragging) return;
        dragging = false;
        try { stage.releasePointerCapture(event.pointerId); } catch (e) {}
        if (Math.abs(velocity) > 8) {
          go(velocity > 0 ? -1 : 1);
        } else {
          var nearest = Math.round(-angle / stepAngle());
          setIndex(nearest, true);
        }
      }

      stage.addEventListener("pointerup", endDrag);
      stage.addEventListener("pointercancel", endDrag);
    }

    if (!reduceMotion) {
      var last = performance.now();
      function tick(now) {
        var dt = (now - last) / 1000;
        last = now;
        if (autoplay && !dragging && !root.matches(":hover") && document.visibilityState === "visible") {
          angle -= dt * 8;
          var nearest = Math.round(-angle / stepAngle());
          var snapped = -nearest * stepAngle();
          if (Math.abs(snapped - angle) < 0.35) {
            setIndex(nearest, false);
          } else {
            ring.style.transition = "none";
            ring.style.setProperty("--angle", angle + "deg");
          }
        }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
      root.addEventListener("pointerdown", function () { autoplay = false; }, { once: true });
    }

    window.addEventListener("beforeunload", function () {
      if (raf) cancelAnimationFrame(raf);
    });
  }

  function initDestTilt() {
    if (reduceMotion) return;
    var items = document.querySelectorAll(".dest-item__media");
    items.forEach(function (media) {
      media.addEventListener("pointermove", function (event) {
        var rect = media.getBoundingClientRect();
        var nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        var ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        media.style.setProperty("--rx", (-ny * 4).toFixed(2) + "deg");
        media.style.setProperty("--ry", (nx * 5).toFixed(2) + "deg");
      });
      media.addEventListener("pointerleave", function () {
        media.style.setProperty("--rx", "0deg");
        media.style.setProperty("--ry", "0deg");
      });
    });
  }

  initHeroDepth();
  initTheater();
  initDestTilt();
})();

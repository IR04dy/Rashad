(function () {
  var canvas = document.getElementById('sovereign-neural-map');
  if (!canvas) return;

  var host = canvas.closest('.hero-map') || canvas.parentElement;
  var ctx = canvas.getContext('2d');
  if (!ctx || !host) return;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var width = 0;
  var height = 0;
  var rafId = 0;
  var lastTs = 0;
  var pulseTimer = 0;

  var state = {
    nodes: [],
    edges: [],
    pulses: [],
    center: { x: 0, y: 0 },
    mouse: {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      active: false
    }
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function rgba(hex, alpha) {
    var h = hex.replace('#', '');
    var bigint = parseInt(h, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function resize() {
    var rect = host.getBoundingClientRect();
    width = Math.max(320, Math.floor(rect.width));
    height = Math.max(280, Math.floor(rect.height));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    state.center.x = width * 0.5;
    state.center.y = height * 0.52;

    generateGraph();
  }

  function generateGraph() {
    state.nodes = [];
    state.edges = [];

    var targetNodes = clamp(Math.round((width * height) / 14000), 54, 120);
    var cols = Math.round(Math.sqrt(targetNodes * (width / height)));
    var rows = Math.round(targetNodes / cols);

    var marginX = width * 0.08;
    var marginY = height * 0.1;
    var stepX = (width - marginX * 2) / Math.max(1, cols - 1);
    var stepY = (height - marginY * 2) / Math.max(1, rows - 1);

    var id = 0;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (id >= targetNodes) break;

        var jx = (Math.random() - 0.5) * stepX * 0.62;
        var jy = (Math.random() - 0.5) * stepY * 0.62;

        state.nodes.push({
          id: id,
          x: marginX + stepX * x + jx,
          y: marginY + stepY * y + jy,
          phase: Math.random() * Math.PI * 2,
          depth: 0.45 + Math.random() * 1.1,
          size: 1.15 + Math.random() * 1.5,
          glow: 0,
          pulse: 0,
          rx: 0,
          ry: 0
        });

        id++;
      }
    }

    var maxEdgeDist = clamp(Math.min(width, height) * 0.24, 95, 170);
    var seen = {};

    for (var i = 0; i < state.nodes.length; i++) {
      var a = state.nodes[i];
      var nearest = [];

      for (var j = 0; j < state.nodes.length; j++) {
        if (i === j) continue;
        var b = state.nodes[j];
        var d = dist(a.x, a.y, b.x, b.y);
        if (d <= maxEdgeDist) {
          nearest.push({ idx: j, d: d });
        }
      }

      nearest.sort(function (m, n) { return m.d - n.d; });
      nearest = nearest.slice(0, 3);

      for (var k = 0; k < nearest.length; k++) {
        var jdx = nearest[k].idx;
        var min = Math.min(i, jdx);
        var max = Math.max(i, jdx);
        var key = min + ':' + max;
        if (seen[key]) continue;
        seen[key] = true;

        state.edges.push({
          a: i,
          b: jdx,
          base: nearest[k].d,
          energy: 0
        });
      }
    }
  }

  function spawnPulse() {
    state.pulses.push({
      r: 0,
      speed: Math.max(width, height) * 0.34,
      alpha: 0.42,
      max: Math.hypot(width, height) * 0.58
    });
  }

  function update(dt, t) {
    state.mouse.x = lerp(state.mouse.x, state.mouse.tx, 0.09);
    state.mouse.y = lerp(state.mouse.y, state.mouse.ty, 0.09);

    pulseTimer += dt;
    if (pulseTimer > 3.7) {
      spawnPulse();
      pulseTimer = 0;
    }

    for (var p = state.pulses.length - 1; p >= 0; p--) {
      var pulse = state.pulses[p];
      pulse.r += pulse.speed * dt;
      pulse.alpha *= 0.992;
      if (pulse.r > pulse.max || pulse.alpha < 0.04) {
        state.pulses.splice(p, 1);
      }
    }

    var nx = state.mouse.active ? ((state.mouse.x / Math.max(1, width)) - 0.5) * 2 : 0;
    var ny = state.mouse.active ? ((state.mouse.y / Math.max(1, height)) - 0.5) * 2 : 0;

    var proximityRadius = Math.min(width, height) * 0.18;

    for (var i = 0; i < state.nodes.length; i++) {
      var node = state.nodes[i];
      var driftX = Math.sin((t * 0.00042) + node.phase) * 6 * node.depth;
      var driftY = Math.cos((t * 0.00035) + node.phase * 1.2) * 5 * node.depth;
      var parallaxX = nx * 16 * node.depth;
      var parallaxY = ny * 10 * node.depth;

      node.rx = node.x + driftX + parallaxX;
      node.ry = node.y + driftY + parallaxY;

      var near = 0;
      if (state.mouse.active) {
        var md = dist(state.mouse.x, state.mouse.y, node.rx, node.ry);
        near = clamp(1 - (md / proximityRadius), 0, 1);
      }

      var pulseEnergy = 0;
      var centerDist = dist(node.rx, node.ry, state.center.x, state.center.y);
      for (var q = 0; q < state.pulses.length; q++) {
        var pr = state.pulses[q].r;
        var wave = Math.exp(-Math.pow((centerDist - pr) / 42, 2)) * state.pulses[q].alpha;
        if (wave > pulseEnergy) pulseEnergy = wave;
      }

      node.glow = near;
      node.pulse = pulseEnergy;
    }
  }

  function drawBackground() {
    var grad = ctx.createRadialGradient(
      width * 0.55,
      height * 0.45,
      20,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.78
    );
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.07)');
    grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.22)');
    grad.addColorStop(1, 'rgba(10, 10, 10, 0.92)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawPulseRings() {
    for (var i = 0; i < state.pulses.length; i++) {
      var pulse = state.pulses[i];
      ctx.beginPath();
      ctx.arc(state.center.x, state.center.y, pulse.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba('#10B981', pulse.alpha * 0.8);
      ctx.lineWidth = 1.15;
      ctx.stroke();
    }
  }

  function drawEdges() {
    for (var i = 0; i < state.edges.length; i++) {
      var edge = state.edges[i];
      var a = state.nodes[edge.a];
      var b = state.nodes[edge.b];

      var activity = Math.max(a.glow, b.glow, a.pulse * 1.25, b.pulse * 1.25);
      var alpha = 0.15 + activity * 0.65;
      var lineColor = activity > 0.14 ? '#10B981' : '#334155';

      ctx.beginPath();
      ctx.moveTo(a.rx, a.ry);
      ctx.lineTo(b.rx, b.ry);
      ctx.strokeStyle = rgba(lineColor, alpha);
      ctx.lineWidth = 0.75 + activity * 1.4;
      ctx.stroke();
    }
  }

  function drawNodes() {
    for (var i = 0; i < state.nodes.length; i++) {
      var node = state.nodes[i];
      var energy = Math.max(node.glow, node.pulse);

      if (energy > 0.08) {
        ctx.beginPath();
        ctx.arc(node.rx, node.ry, node.size * (3.4 + energy * 1.8), 0, Math.PI * 2);
        ctx.fillStyle = rgba('#10B981', 0.08 + energy * 0.2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.rx, node.ry, node.size + energy * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = energy > 0.12 ? rgba('#10B981', 0.8) : rgba('#1E293B', 0.92);
      ctx.fill();
    }
  }

  function drawCenterCore() {
    var pulseStrength = 0;
    for (var i = 0; i < state.pulses.length; i++) {
      pulseStrength = Math.max(pulseStrength, state.pulses[i].alpha);
    }

    var boxW = Math.min(210, width * 0.35);
    var boxH = 70;
    var x = state.center.x - boxW / 2;
    var y = state.center.y - boxH / 2;

    ctx.fillStyle = rgba('#0A192F', 0.94);
    ctx.strokeStyle = rgba('#10B981', 0.28 + pulseStrength * 0.38);
    ctx.lineWidth = 1;

  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawPulseRings();
    drawEdges();
    drawNodes();
    drawCenterCore();
  }

  function animate(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.04);
    lastTs = ts;

    update(dt, ts);
    drawFrame();

    rafId = window.requestAnimationFrame(animate);
  }

  function onPointerMove(e) {
    var rect = canvas.getBoundingClientRect();
    state.mouse.tx = e.clientX - rect.left;
    state.mouse.ty = e.clientY - rect.top;
    state.mouse.active = true;
  }

  function onPointerLeave() {
    state.mouse.active = false;
    state.mouse.tx = width * 0.5;
    state.mouse.ty = height * 0.5;
  }

  function start() {
    resize();
    state.mouse.tx = width * 0.5;
    state.mouse.ty = height * 0.5;
    state.mouse.x = state.mouse.tx;
    state.mouse.y = state.mouse.ty;
    spawnPulse();

    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', resize);

    rafId = window.requestAnimationFrame(animate);
  }

  function stop() {
    if (rafId) window.cancelAnimationFrame(rafId);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('resize', resize);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
      lastTs = 0;
    } else if (!rafId) {
      rafId = window.requestAnimationFrame(animate);
    }
  });

  window.addEventListener('beforeunload', stop);
  start();
})();

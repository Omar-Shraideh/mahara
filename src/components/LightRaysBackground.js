import { html, useEffect, useRef } from "../lib/core.js";

// Soft beams of light sweep slowly down from the top-left corner behind the landing page,
// with small specks of light drifting up. Based on Superdesign's "Light Rays Background" idea,
// drawn on a 2D canvas in Mahara's cream. Pauses when the tab is hidden and draws a single
// still frame when the system asks for reduced motion.
var CREAM = "255, 251, 240";

export function LightRaysBackground() {
  var ref = useRef(null);
  useEffect(function () {
    var canvas = ref.current;
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var w = 0, h = 0, raf = 0, t0 = performance.now(), last = t0, specks = [];

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function seed() {
      var n = Math.round(Math.min(70, Math.max(24, (w * h) / 19000)));
      specks = [];
      for (var i = 0; i < n; i++) specks.push({ x: rnd(0, w), y: rnd(0, h), v: rnd(6, 16), p: rnd(0, 6.28), r: rnd(1, 2.2) });
    }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduce) draw(6, 0);
    }

    function draw(t, dt) {
      ctx.clearRect(0, 0, w, h);
      var ox = w * 0.06, oy = -h * 0.35, len = Math.max(w, h) * 1.8;
      for (var i = 0; i < 7; i++) {
        var a = 0.42 + i * 0.16 + 0.05 * Math.sin(t * 0.25 + i * 1.3);
        var spread = 0.035 + 0.02 * Math.sin(t * 0.4 + i);
        var g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len * 0.6, oy + Math.sin(a) * len * 0.6);
        g.addColorStop(0, "rgba(" + CREAM + ", 0.42)");
        g.addColorStop(1, "rgba(" + CREAM + ", 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len);
        ctx.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len);
        ctx.closePath();
        ctx.fill();
      }
      specks.forEach(function (p) {
        p.y -= p.v * dt;
        p.x += Math.sin(t * 0.5 + p.p) * 0.15;
        if (p.y < -5) { p.y = h + 5; p.x = rnd(0, w); }
        ctx.fillStyle = "rgba(" + CREAM + ", " + (0.35 + 0.35 * Math.sin(t * 1.5 + p.p)) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw((now - t0) / 1000, dt);
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf && !reduce && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function onVis() { if (document.hidden) stop(); else start(); }

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return function () {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return html`<canvas ref=${ref} className="rays-bg" aria-hidden="true"></canvas>`;
}

import { html, useEffect, useRef } from "../lib/core.js";

// Animated grid of squares that drifts diagonally behind the landing page; the cell under the
// pointer fills with the brand gold. Idea from Superdesign's "Squares Background" (ReactBits),
// rebuilt here on a 2D canvas. Draws grid lines (not one rect per cell) so it stays cheap,
// pauses when the tab is hidden, and holds still when the system asks for reduced motion.
export function SquaresBackground(props) {
  var ref = useRef(null);
  useEffect(function () {
    var canvas = ref.current;
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var size = props.size || 44;
    var speed = props.speed || 0.22;
    var line = props.lineColor || "rgba(11, 43, 66, 0.13)";
    var fill = props.hoverColor || "rgba(240, 206, 140, 0.85)";
    var fade = props.fadeColor || "142, 207, 238";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var w = 0, h = 0, ox = 0, oy = 0, raf = 0, hover = null;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var sx = ox % size, sy = oy % size;
      if (hover) {
        // cell under the pointer, in the moving grid's coordinates
        var cx = Math.floor((hover.x - sx) / size), cy = Math.floor((hover.y - sy) / size);
        ctx.fillStyle = fill;
        ctx.fillRect(sx + cx * size, sy + cy * size, size, size);
      }
      ctx.beginPath();
      for (var x = sx - size; x <= w + size; x += size) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
      for (var y = sy - size; y <= h + size; y += size) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.stroke();
      // soft vignette: the grid fades out toward the edges of the screen
      var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, "rgba(" + fade + ", 0)");
      g.addColorStop(1, "rgba(" + fade + ", 0.85)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    function tick() {
      ox = (ox + speed) % size;
      oy = (oy + speed) % size;
      draw();
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf && !reduce && !document.hidden) raf = requestAnimationFrame(tick); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function onVis() { if (document.hidden) stop(); else start(); }
    function onMove(e) { var r = canvas.getBoundingClientRect(); hover = { x: e.clientX - r.left, y: e.clientY - r.top }; if (reduce) draw(); }
    function onLeave() { hover = null; if (reduce) draw(); }

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return function () {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return html`<canvas ref=${ref} className="squares-bg" aria-hidden="true"></canvas>`;
}

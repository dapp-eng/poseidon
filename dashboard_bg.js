/* dashboard background canvas */
(function () {
  'use strict';

  const dashView = document.getElementById('view-dashboard');
  if (!dashView) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'dashBgCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0;opacity:0.42;';

  dashView.insertBefore(canvas, dashView.firstChild);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  function handleResize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => setTimeout(handleResize, 150));

  /* cursor ripple */
  let mouse = { x: -1000, y: -1000 };
  let ripples = [];

  window.addEventListener('mousemove', (e) => {
    if (!dashView.classList.contains('is-active')) return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    if (Math.random() < 0.2) {
      ripples.push({
        x: mouse.x,
        y: mouse.y,
        r: 2,
        maxR: 35 + Math.random() * 25,
        alpha: 0.7,
        speed: 1.2 + Math.random() * 0.8
      });
    }
  });

  /* foam particles */
  const foams = [];
  const NUM_FOAM = 35;
  for (let i = 0; i < NUM_FOAM; i++) {
    foams.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 2 + Math.random() * 5,
      speedX: 0.3 + Math.random() * 0.6,
      speedY: (Math.random() - 0.5) * 0.3,
      alpha: 0.15 + Math.random() * 0.45
    });
  }

  let time = 0;
  function drawShorelineOcean() {
    time += 0.015;
    ctx.clearRect(0, 0, width, height);

    /* caustic grid */
    ctx.save();
    ctx.strokeStyle = 'rgba(102, 217, 232, 0.08)';
    ctx.lineWidth = 1.2;

    const cols = 26;
    const rows = 16;
    const cellW = width / cols;
    const cellH = height / rows;

    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      for (let j = 0; j <= rows; j++) {
        const x = i * cellW + Math.sin(time + j * 0.4 + i * 0.2) * 12;
        const y = j * cellH + Math.cos(time * 0.8 + i * 0.3 + j * 0.2) * 10;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    /* ocean waves */
    ctx.save();
    ctx.strokeStyle = 'rgba(102, 217, 232, 0.12)';
    ctx.lineWidth = 2;

    for (let w = 0; w < 4; w++) {
      ctx.beginPath();
      const baseY = (height / 5) * (w + 1);
      for (let x = 0; x <= width; x += 20) {
        const y = baseY + Math.sin(time * 1.2 + x * 0.006 + w * 1.5) * 18 + Math.cos(time * 0.6 + w) * 12;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    /* foam bubbles */
    foams.forEach(f => {
      f.x += f.speedX;
      f.y += f.speedY + Math.sin(time + f.x * 0.01) * 0.2;

      if (f.x > width + 20) f.x = -20;
      if (f.y < -20) f.y = height + 20;
      if (f.y > height + 20) f.y = -20;

      ctx.save();
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(238, 245, 249, ${f.alpha * 0.5})`;
      ctx.strokeStyle = `rgba(102, 217, 232, ${f.alpha})`;
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    /* ripple effect */
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += r.speed;
      r.alpha -= 0.018;

      if (r.alpha <= 0 || r.r >= r.maxR) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(102, 217, 232, ${r.alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  function animate() {
    if (dashView.classList.contains('is-active')) {
      drawShorelineOcean();
    }
    requestAnimationFrame(animate);
  }

  animate();
})();

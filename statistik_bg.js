/* marine biome background canvas */
(function () {
  'use strict';

  const statView = document.getElementById('view-statistik');
  if (!statView) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'statBgCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0;opacity:0.45;';

  statView.insertBefore(canvas, statView.firstChild);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  function handleResize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => setTimeout(handleResize, 150));

  /* tropical fish population */
  const numFish = 5;
  const fishes = [];
  const tropicalColors = ['#66D9E8', '#FFB347', '#FF6B45', '#4ADE80', '#9B7EDE'];

  for (let i = 0; i < numFish; i++) {
    fishes.push({
      x: Math.random() * width,
      y: height * (0.2 + Math.random() * 0.6),
      length: 22 + Math.random() * 16,
      speed: 0.65 + Math.random() * 0.7,
      tailPhase: Math.random() * Math.PI * 2,
      tailSpeed: 0.14 + Math.random() * 0.06,
      direction: i % 2 === 0 ? 1 : -1,
      color: tropicalColors[i % tropicalColors.length],
      depthAlpha: 0.35 + Math.random() * 0.3
    });
  }

  /* sea turtles */
  const turtles = [
    { x: width * 0.18, y: height * 0.35, size: 34, speed: 0.45, direction: 1, flipperPhase: 0 },
    { x: width * 0.82, y: height * 0.72, size: 40, speed: 0.38, direction: -1, flipperPhase: Math.PI }
  ];

  /* manta ray */
  const manta = {
    x: width * 0.5,
    y: height * 0.48,
    size: 55,
    speed: 0.42,
    direction: 1,
    wingPhase: 0
  };

  /* starfish */
  const starfishList = [
    { x: width * 0.12, y: height * 0.82, r: 16, pulse: 0, color: '#FF6B45' },
    { x: width * 0.76, y: height * 0.28, r: 14, pulse: 1.5, color: '#FFB347' },
    { x: width * 0.48, y: height * 0.88, r: 18, pulse: 3.0, color: '#66D9E8' }
  ];

  /* water drops */
  const drops = [];
  function addRandomDrop() {
    if (drops.length < 8) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2,
        maxR: 45 + Math.random() * 35,
        alpha: 0.6,
        speed: 1.1 + Math.random() * 0.6
      });
    }
  }

  function drawStarfish(cx, cy, spikes, outerRadius, innerRadius, color, alpha) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = alpha * 1.2;
    ctx.fill();

    ctx.restore();
  }

  let time = 0;
  function drawDiverseMarineLife() {
    time += 0.016;
    ctx.clearRect(0, 0, width, height);

    if (Math.random() < 0.035) addRandomDrop();

    ctx.save();
    ctx.lineWidth = 1.2;
    for (let w = 0; w < 4; w++) {
      ctx.beginPath();
      const baseY = (height / 5) * (w + 1);
      for (let x = 0; x <= width; x += 25) {
        const y = baseY + Math.sin(time * 1.2 + x * 0.006 + w * 1.4) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(102, 217, 232, ${0.07 + w * 0.02})`;
      ctx.stroke();
    }
    ctx.restore();

    /* render starfish */
    starfishList.forEach(sf => {
      sf.pulse += 0.02;
      const alpha = 0.3 + (Math.sin(sf.pulse) * 0.5 + 0.5) * 0.35;
      drawStarfish(sf.x, sf.y, 5, sf.r, sf.r * 0.4, sf.color, alpha);
    });

    /* render manta ray */
    manta.x += manta.speed * manta.direction;
    manta.y += Math.sin(time * 0.5) * 0.3;
    manta.wingPhase += 0.03;

    if (manta.direction === 1 && manta.x > width + 80) manta.x = -80;
    if (manta.direction === -1 && manta.x < -80) manta.x = width + 80;

    ctx.save();
    ctx.translate(manta.x, manta.y);
    if (manta.direction === -1) ctx.scale(-1, 1);

    const wingFlap = Math.sin(manta.wingPhase) * (manta.size * 0.25);

    ctx.beginPath();
    ctx.moveTo(manta.size * 0.6, 0);
    ctx.quadraticCurveTo(0, -manta.size * 0.6 + wingFlap, -manta.size * 0.5, 0);
    ctx.quadraticCurveTo(0, manta.size * 0.6 - wingFlap, manta.size * 0.6, 0);
    ctx.fillStyle = 'rgba(20, 119, 184, 0.32)';
    ctx.strokeStyle = 'rgba(102, 217, 232, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-manta.size * 0.4, 0);
    ctx.quadraticCurveTo(-manta.size * 0.8, Math.sin(time * 2) * 6, -manta.size * 1.1, Math.sin(time * 1.5) * 8);
    ctx.strokeStyle = 'rgba(102, 217, 232, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    /* render tropical fish */
    fishes.forEach(f => {
      f.x += f.speed * f.direction;
      f.y += Math.sin(time * 0.8 + f.x * 0.004) * 0.4;
      f.tailPhase += f.tailSpeed;

      if (f.direction === 1 && f.x > width + 40) f.x = -40;
      if (f.direction === -1 && f.x < -40) f.x = width + 40;

      ctx.save();
      ctx.translate(f.x, f.y);
      if (f.direction === -1) ctx.scale(-1, 1);

      ctx.beginPath();
      ctx.moveTo(f.length * 0.5, 0);
      ctx.quadraticCurveTo(0, -f.length * 0.35, -f.length * 0.4, -f.length * 0.15);
      ctx.lineTo(-f.length * 0.4, f.length * 0.15);
      ctx.quadraticCurveTo(0, f.length * 0.35, f.length * 0.5, 0);
      ctx.fillStyle = f.color;
      ctx.globalAlpha = f.depthAlpha;
      ctx.fill();

      const tailX = -f.length * 0.4;
      const tailY = Math.sin(f.tailPhase) * 6;

      ctx.beginPath();
      ctx.moveTo(tailX, 0);
      ctx.lineTo(tailX - f.length * 0.3, tailY - f.length * 0.25);
      ctx.lineTo(tailX - f.length * 0.3, tailY + f.length * 0.25);
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.globalAlpha = f.depthAlpha;
      ctx.fill();

      ctx.restore();
    });

    /* render sea turtles */
    turtles.forEach(t => {
      t.x += t.speed * t.direction;
      t.y += Math.sin(time * 0.5 + t.x * 0.003) * 0.25;
      t.flipperPhase += 0.035;

      if (t.direction === 1 && t.x > width + 60) t.x = -60;
      if (t.direction === -1 && t.x < -60) t.x = width + 60;

      ctx.save();
      ctx.translate(t.x, t.y);
      if (t.direction === -1) ctx.scale(-1, 1);

      const flipperAngle = Math.sin(t.flipperPhase) * 0.4;

      ctx.beginPath();
      ctx.ellipse(0, 0, t.size * 0.5, t.size * 0.38, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 124, 107, 0.45)';
      ctx.strokeStyle = '#66D9E8';
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(t.size * 0.55, 0, t.size * 0.15, t.size * 0.12, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 124, 107, 0.5)';
      ctx.fill();

      ctx.save();
      ctx.translate(t.size * 0.25, -t.size * 0.25);
      ctx.rotate(-0.4 + flipperAngle);
      ctx.beginPath();
      ctx.ellipse(0, -t.size * 0.3, t.size * 0.1, t.size * 0.35, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 124, 107, 0.5)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(t.size * 0.25, t.size * 0.25);
      ctx.rotate(0.4 - flipperAngle);
      ctx.beginPath();
      ctx.ellipse(0, t.size * 0.3, t.size * 0.1, t.size * 0.35, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 124, 107, 0.5)';
      ctx.fill();
      ctx.restore();

      ctx.restore();
    });

    /* render water drops */
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.r += d.speed;
      d.alpha -= 0.012;

      if (d.alpha <= 0 || d.r >= d.maxR) {
        drops.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(102, 217, 232, ${d.alpha * 0.5})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function animate() {
    if (statView.classList.contains('is-active')) {
      drawDiverseMarineLife();
    }
    requestAnimationFrame(animate);
  }

  animate();
})();

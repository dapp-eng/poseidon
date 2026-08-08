/* ocean hero animation */
(function () {
  'use strict';

  const heroBand = document.querySelector('.band-hero');
  if (!heroBand) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'oceanCanvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;z-index:1;';

  const heroInner = heroBand.querySelector('.hero-inner');
  heroBand.insertBefore(canvas, heroInner);

  const ctx = canvas.getContext('2d');

  let width = (canvas.width = heroBand.offsetWidth);
  let height = (canvas.height = heroBand.offsetHeight);

  const isMobile = () => window.innerWidth <= 768;

  function handleResize() {
    if (!heroBand) return;
    width = canvas.width = heroBand.offsetWidth;
    height = canvas.height = heroBand.offsetHeight;
    initSeagulls();
    initBreeze();
    initDolphins();
  }
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => setTimeout(handleResize, 150));

  let mouse = { x: -1000, y: -1000 };
  let ripples = [];

  heroBand.addEventListener('mousemove', (e) => {
    const rect = heroBand.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    if (Math.random() < 0.35) {
      ripples.push({
        x: mouse.x,
        y: mouse.y,
        r: 3,
        maxR: 40 + Math.random() * 30,
        alpha: 0.8,
        speed: 1.4 + Math.random() * 0.9
      });
    }
  });

  heroBand.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  const getRadarCenter = () => {
    const sweepEl = heroBand.querySelector('.sweep');
    if (sweepEl) {
      const sRect = sweepEl.getBoundingClientRect();
      const hRect = heroBand.getBoundingClientRect();
      return {
        x: sRect.left - hRect.left + sRect.width / 2,
        y: sRect.top - hRect.top + sRect.height / 2
      };
    }
    return { x: width * 0.82, y: height * 0.5 };
  };

  const getRadarRadius = () => Math.min(width * 0.45, 360);

  let radarAngle = 0;
  let time = 0;
  let lastTime = 0;

  function drawOceanSurface(frameScale) {
    time += 0.018 * frameScale;
    const rc = getRadarCenter();

    const grad = ctx.createRadialGradient(
      rc.x, rc.y, 10,
      width * 0.5, height * 0.5, Math.max(width, height)
    );
    grad.addColorStop(0, 'rgba(13, 58, 92, 0.75)');
    grad.addColorStop(0.5, 'rgba(6, 28, 45, 0.88)');
    grad.addColorStop(1, 'rgba(2, 14, 23, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = 'rgba(102, 217, 232, 0.06)';
    ctx.lineWidth = 1;

    const cols = isMobile() ? 16 : 32;
    const rows = isMobile() ? 12 : 20;
    const cellW = width / cols;
    const cellH = height / rows;

    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      for (let j = 0; j <= rows; j++) {
        const x = i * cellW + Math.sin(time + j * 0.4 + i * 0.2) * 9;
        const y = j * cellH + Math.cos(time * 0.8 + i * 0.3 + j * 0.2) * 7;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += r.speed * frameScale;
      r.alpha -= 0.018 * frameScale;

      if (r.alpha <= 0 || r.r >= r.maxR) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(102, 217, 232, ${r.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  const allVessels = [
    {
      id: 'v_patrol',
      x: -120, y: height * 0.62,
      targetX: width + 120, targetY: height * 0.42,
      speed: 0.8, len: 38, type: 'patrol', color: '#66D9E8', wake: [], mobileShow: true
    },
    {
      id: 'v_fishing',
      x: width * 0.15, y: height + 80,
      targetX: width * 0.72, targetY: -80,
      speed: 0.5, len: 34, type: 'fishing', color: '#FFB347', wake: [], mobileShow: true,
      isFishing: false, fishingTimer: 4, netProgress: 0
    },
    {
      id: 'v_dark',
      x: width * 0.58, y: height * 0.88,
      targetX: width * 0.38, targetY: height * 0.12,
      speed: 0.6, len: 32, type: 'dark', color: '#FF6B45', wake: [], mobileShow: true
    },
    {
      id: 'v_cargo',
      x: width + 120, y: height * 0.22,
      targetX: -120, targetY: height * 0.52,
      speed: 0.4, len: 62, type: 'cargo', color: '#1477B8', wake: [], mobileShow: false
    },
    {
      id: 'v_passenger',
      x: -100, y: height * 0.35,
      targetX: width + 100, targetY: height * 0.78,
      speed: 0.65, len: 46, type: 'passenger', color: '#4ADE80', wake: [], mobileShow: false
    },
    {
      id: 'v_tanker',
      x: width + 100, y: height * 0.75,
      targetX: -100, targetY: height * 0.28,
      speed: 0.45, len: 52, type: 'tanker', color: '#F472B6', wake: [], mobileShow: false
    }
  ];

  function getActiveVessels() {
    if (isMobile()) {
      return allVessels.filter(v => v.mobileShow);
    }
    return allVessels;
  }

  function updateVessels(frameScale, dt) {
    const list = getActiveVessels();
    list.forEach(v => {
      if (v.type === 'fishing') {
        v.fishingTimer -= dt;
        if (v.fishingTimer <= 0) {
          v.isFishing = !v.isFishing;
          v.fishingTimer = v.isFishing ? (7 + Math.random() * 5) : (9 + Math.random() * 6);
        }

        if (v.isFishing) {
          v.netProgress = Math.min(1, v.netProgress + 0.04 * frameScale);
        } else {
          v.netProgress = Math.max(0, v.netProgress - 0.05 * frameScale);
        }
      }

      const currentSpeed = (v.type === 'fishing' && v.isFishing) ? 0 : v.speed;

      const dx = v.targetX - v.x;
      const dy = v.targetY - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        if (v.x > width * 0.5) {
          v.x = -100; v.y = height * (0.15 + Math.random() * 0.7);
        } else {
          v.x = width + 100; v.y = height * (0.15 + Math.random() * 0.7);
        }
        v.wake = [];
        if (v.type === 'fishing') {
          v.isFishing = false;
          v.netProgress = 0;
        }
      } else {
        const vx = (dx / dist) * currentSpeed * frameScale;
        const vy = (dy / dist) * currentSpeed * frameScale;
        v.x += vx;
        v.y += vy;
        v.angle = Math.atan2(dy, dx);

        if (currentSpeed > 0 && Math.random() < (isMobile() ? 0.25 : 0.45)) {
          v.wake.push({
            x: v.x - Math.cos(v.angle) * (v.len * 0.5),
            y: v.y - Math.sin(v.angle) * (v.len * 0.5),
            r: 3,
            alpha: 0.65
          });
        }
      }
    });
  }

  function drawVessels(frameScale) {
    const rc = getRadarCenter();
    const radR = getRadarRadius();
    const list = getActiveVessels();

    list.forEach(v => {
      for (let i = v.wake.length - 1; i >= 0; i--) {
        const wk = v.wake[i];
        wk.r += 0.45 * frameScale;
        wk.alpha -= 0.009 * frameScale;

        if (wk.alpha <= 0) {
          v.wake.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(wk.x, wk.y, wk.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(238, 245, 249, ${wk.alpha * 0.28})`;
        ctx.fill();
        ctx.restore();
      }

      const vDistFromRadar = Math.hypot(v.x - rc.x, v.y - rc.y);
      const vAngleFromRadar = (Math.atan2(v.y - rc.y, v.x - rc.x) + Math.PI * 2) % (Math.PI * 2);
      const angleDiff = Math.abs(vAngleFromRadar - radarAngle);
      const isHitByRadar = vDistFromRadar <= radR && (angleDiff < 0.22 || angleDiff > Math.PI * 2 - 0.22);

      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);

      if (v.type === 'fishing') {
        const p = v.netProgress || 0;
        if (p > 0.01) {
          ctx.save();
          const netW = v.len * 2.2 * p;
          const netH = v.len * 1.6 * p;

          ctx.strokeStyle = `rgba(255, 179, 71, ${0.45 * p})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(-v.len * 0.8, 0, netW * 0.5, netH * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(255, 179, 71, ${0.08 * p})`;
          ctx.fill();

          ctx.strokeStyle = `rgba(102, 217, 232, ${0.35 * p})`;
          ctx.lineWidth = 0.8;
          const gridCount = 5;
          for (let g = 1; g < gridCount; g++) {
            const gx = -v.len * 0.8 + (-netW * 0.5 + (g / gridCount) * netW);
            ctx.beginPath();
            ctx.moveTo(gx, -netH * 0.4);
            ctx.lineTo(gx, netH * 0.4);
            ctx.stroke();
          }

          for (let b = 0; b < 8; b++) {
            const angleFloat = (b / 8) * Math.PI * 2 + time * 2;
            const fx = -v.len * 0.8 + Math.cos(angleFloat) * (netW * 0.5);
            const fy = Math.sin(angleFloat) * (netH * 0.5);
            ctx.beginPath();
            ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FF6B45';
            ctx.fill();
          }

          ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 179, 71, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-v.len * 0.2, -v.len * 0.45);
        ctx.lineTo(-v.len * 0.2, v.len * 0.45);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(102, 217, 232, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-v.len * 0.2, -v.len * 0.45);
        ctx.quadraticCurveTo(-v.len * 1.3, -v.len * 0.8 + Math.sin(time * 3) * 3, -v.len * 1.6, -v.len * 0.2);
        ctx.moveTo(-v.len * 0.2, v.len * 0.45);
        ctx.quadraticCurveTo(-v.len * 1.3, v.len * 0.8 + Math.cos(time * 3) * 3, -v.len * 1.6, v.len * 0.2);
        ctx.stroke();

        for (let b = 0; b < 5; b++) {
          const bx = -v.len * 0.6 - b * (v.len * 0.22);
          const by = Math.sin(time * 4 + b) * 3;
          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFB347';
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.beginPath();
      if (v.type === 'cargo' || v.type === 'tanker') {
        ctx.moveTo(v.len * 0.5, 0);
        ctx.lineTo(v.len * 0.35, -v.len * 0.25);
        ctx.lineTo(-v.len * 0.45, -v.len * 0.25);
        ctx.lineTo(-v.len * 0.5, 0);
        ctx.lineTo(-v.len * 0.45, v.len * 0.25);
        ctx.lineTo(v.len * 0.35, v.len * 0.25);
      } else if (v.type === 'passenger') {
        ctx.moveTo(v.len * 0.5, 0);
        ctx.lineTo(v.len * 0.3, -v.len * 0.2);
        ctx.lineTo(-v.len * 0.48, -v.len * 0.18);
        ctx.lineTo(-v.len * 0.48, v.len * 0.18);
        ctx.lineTo(v.len * 0.3, v.len * 0.2);
      } else {
        ctx.moveTo(v.len * 0.5, 0);
        ctx.lineTo(-v.len * 0.4, -v.len * 0.22);
        ctx.lineTo(-v.len * 0.5, 0);
        ctx.lineTo(-v.len * 0.4, v.len * 0.22);
      }
      ctx.closePath();

      ctx.fillStyle = v.color;
      ctx.shadowColor = v.color;
      ctx.shadowBlur = isHitByRadar ? 26 : 8;
      ctx.fill();

      if (v.type === 'cargo') {
        const colors = ['#E63946', '#1D3557', '#F4A261', '#457B9D'];
        for (let c = 0; c < 3; c++) {
          ctx.fillStyle = colors[c % colors.length];
          ctx.fillRect(-v.len * 0.3 + c * (v.len * 0.2), -v.len * 0.16, v.len * 0.16, v.len * 0.32);
        }
      } else if (v.type === 'passenger') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-v.len * 0.2, -v.len * 0.12, v.len * 0.45, v.len * 0.24);
        ctx.fillStyle = '#FFF3B0';
        for (let w = 0; w < 4; w++) {
          ctx.fillRect(-v.len * 0.15 + w * 7, -v.len * 0.08, 4, 3);
          ctx.fillRect(-v.len * 0.15 + w * 7, v.len * 0.04, 4, 3);
        }
      } else if (v.type === 'tanker') {
        ctx.fillStyle = '#D9D9D9';
        for (let t = 0; t < 2; t++) {
          ctx.beginPath();
          ctx.arc(-v.len * 0.2 + t * (v.len * 0.35), 0, v.len * 0.14, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (v.type === 'patrol') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-v.len * 0.1, -v.len * 0.1, v.len * 0.25, v.len * 0.2);
        ctx.fillStyle = Math.sin(time * 10) > 0 ? '#66D9E8' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-v.len * 0.1, -v.len * 0.1, v.len * 0.25, v.len * 0.2);
      }

      ctx.restore();

      if (isHitByRadar) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.len * 1.3, 0, Math.PI * 2);
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = v.color;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  let dolphins = [];
  function initDolphins() {
    dolphins = [];
    const count = isMobile() ? 1 : 3;
    for (let i = 0; i < count; i++) {
      dolphins.push({
        x: width * (0.2 + Math.random() * 0.6),
        baseY: height * (0.45 + Math.random() * 0.35),
        speed: 1.2 + Math.random() * 0.8,
        jumpProgress: -Math.random() * 2,
        jumpDuration: 1.4 + Math.random() * 0.4,
        jumpHeight: 45 + Math.random() * 35,
        size: 26 + Math.random() * 8,
        direction: Math.random() < 0.5 ? 1 : -1,
        cooldown: 1 + Math.random() * 4
      });
    }
  }
  initDolphins();

  function updateDrawDolphins(frameScale, dt) {
    const list = isMobile() ? dolphins.slice(0, 1) : dolphins;
    list.forEach(d => {
      if (d.cooldown > 0) {
        d.cooldown -= dt;
        d.x += d.speed * d.direction * frameScale * 0.5;
        if (d.direction === 1 && d.x > width + 100) d.x = -100;
        if (d.direction === -1 && d.x < -100) d.x = width + 100;
        return;
      }

      d.jumpProgress += dt / d.jumpDuration;

      if (d.jumpProgress >= 0 && d.jumpProgress <= 1) {
        const p = d.jumpProgress;
        const arcY = -Math.sin(p * Math.PI) * d.jumpHeight;
        const currX = d.x + (p * 110 * d.direction);
        const currY = d.baseY + arcY;

        const dy = -Math.cos(p * Math.PI) * d.jumpHeight * Math.PI;
        const dx = 110 * d.direction;
        const angle = Math.atan2(dy, dx);

        if (p < 0.06 || p > 0.94) {
          if (Math.random() < 0.4) {
            ripples.push({
              x: currX,
              y: d.baseY,
              r: 2,
              maxR: 32 + Math.random() * 15,
              alpha: 0.75,
              speed: 1.2
            });
          }
        }

        ctx.save();
        ctx.translate(currX, currY);
        ctx.rotate(angle);
        if (d.direction === -1) ctx.scale(1, -1);

        ctx.fillStyle = '#66D9E8';
        ctx.shadowColor = '#66D9E8';
        ctx.shadowBlur = 14;

        ctx.beginPath();
        ctx.moveTo(d.size * 0.6, 0);
        ctx.quadraticCurveTo(d.size * 0.2, -d.size * 0.35, -d.size * 0.4, 0);
        ctx.quadraticCurveTo(-d.size * 0.65, -d.size * 0.25, -d.size * 0.85, -d.size * 0.35);
        ctx.lineTo(-d.size * 0.7, 0);
        ctx.lineTo(-d.size * 0.85, d.size * 0.35);
        ctx.quadraticCurveTo(-d.size * 0.65, d.size * 0.25, -d.size * 0.4, 0);
        ctx.quadraticCurveTo(d.size * 0.2, d.size * 0.25, d.size * 0.6, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-d.size * 0.05, -d.size * 0.25);
        ctx.quadraticCurveTo(-d.size * 0.2, -d.size * 0.55, -d.size * 0.38, -d.size * 0.3);
        ctx.lineTo(-d.size * 0.15, -d.size * 0.2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(d.size * 0.4, -d.size * 0.05, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (d.jumpProgress > 1) {
        d.x += 110 * d.direction;
        d.jumpProgress = 0;
        d.cooldown = 2.5 + Math.random() * 5;
        d.baseY = height * (0.35 + Math.random() * 0.45);
        if (d.direction === 1 && d.x > width + 100) d.x = -100;
        if (d.direction === -1 && d.x < -100) d.x = width + 100;
      }
    });
  }

  let seagulls = [];
  function initSeagulls() {
    seagulls = [];
    const numBirds = isMobile() ? 6 : 16;
    for (let i = 0; i < numBirds; i++) {
      seagulls.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.6),
        vx: 1.3 + Math.random() * 1.3,
        vy: (Math.random() - 0.5) * 0.4,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 0.16 + Math.random() * 0.1,
        size: 10 + Math.random() * 6
      });
    }
  }
  initSeagulls();

  function updateDrawSeagulls(frameScale) {
    seagulls.forEach(b => {
      b.x += b.vx * frameScale;
      b.y += (b.vy + Math.sin(time * 2 + b.wingPhase) * 0.2) * frameScale;
      b.wingPhase += b.wingSpeed * frameScale;

      if (b.x > width + 40) b.x = -40;
      if (b.y < 0) b.y = height * 0.5;
      if (b.y > height * 0.7) b.y = height * 0.2;

      const wingY = Math.sin(b.wingPhase) * (b.size * 0.4);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 45, b.size * 0.6, b.size * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(2, 14, 23, 0.28)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.strokeStyle = 'rgba(238, 245, 249, 0.88)';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(-b.size, wingY);
      ctx.quadraticCurveTo(-b.size * 0.5, -b.size * 0.3 + wingY, 0, 0);
      ctx.quadraticCurveTo(b.size * 0.5, -b.size * 0.3 + wingY, b.size, wingY);
      ctx.stroke();

      ctx.restore();
    });
  }

  let particles = [];
  function initBreeze() {
    particles = [];
    const maxP = isMobile() ? 18 : 50;
    for (let i = 0; i < maxP; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2.2,
        vx: 0.9 + Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: 0.2 + Math.random() * 0.55
      });
    }
  }
  initBreeze();

  function updateDrawBreeze(frameScale) {
    particles.forEach(p => {
      p.x += p.vx * frameScale;
      p.y += p.vy * frameScale;

      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(102, 217, 232, ${p.alpha})`;
      ctx.shadowColor = '#66D9E8';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();
    });
  }

  function animate(now) {
    if (!lastTime) lastTime = now;
    const deltaMs = now - lastTime;
    lastTime = now;

    const dt = Math.min(deltaMs / 1000, 0.1);
    const frameScale = dt / 0.016667;

    radarAngle = (radarAngle + 0.014 * frameScale) % (Math.PI * 2);

    drawOceanSurface(frameScale);
    updateVessels(frameScale, dt);
    drawVessels(frameScale);
    updateDrawDolphins(frameScale, dt);
    updateDrawBreeze(frameScale);
    updateDrawSeagulls(frameScale);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();

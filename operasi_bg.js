/* dual satellite background canvas */
(function () {
  'use strict';

  const opView = document.getElementById('view-operasi');
  if (!opView) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'operasiBgCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0;opacity:0.42;';

  opView.insertBefore(canvas, opView.firstChild);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  function handleResize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => setTimeout(handleResize, 150));

  /* dual satellite orbit config */
  const satellites = [
    {
      name: 'Sentinel-1A',
      angle: 0,
      speed: 0.008,
      rx: () => width * 0.42,
      ry: () => height * 0.28,
      tilt: -Math.PI * 0.08,
      color: '#66D9E8',
      beamColor: 'rgba(102, 217, 232, 0.32)'
    },
    {
      name: 'Sentinel-1B',
      angle: Math.PI * 0.95,
      speed: 0.0095,
      rx: () => width * 0.38,
      ry: () => height * 0.24,
      tilt: Math.PI * 0.12,
      color: '#FFB347',
      beamColor: 'rgba(255, 179, 71, 0.32)'
    }
  ];

  /* surface scan pulses */
  const scanPulses = [];
  function addScanPulse(x, y, color) {
    if (scanPulses.length < 8) {
      scanPulses.push({
        x: x,
        y: y,
        r: 4,
        maxR: 110 + Math.random() * 70,
        alpha: 0.7,
        color: color
      });
    }
  }

  let time = 0;
  function drawDualSatellites() {
    time += 0.015;
    ctx.clearRect(0, 0, width, height);

    const centerX = width * 0.5;
    const centerY = height * 0.45;

    /* hydrographic grid */
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 119, 184, 0.07)';
    ctx.lineWidth = 1;

    const step = 90;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    /* satellite radar cone */
    satellites.forEach(sat => {
      sat.angle = (sat.angle + sat.speed) % (Math.PI * 2);

      /* orbit path */
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, sat.rx(), sat.ry(), sat.tilt, 0, Math.PI * 2);
      ctx.strokeStyle = sat.color;
      ctx.globalAlpha = 0.14;
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      /* satellite position */
      const cosA = Math.cos(sat.angle);
      const sinA = Math.sin(sat.angle);
      const unrotatedX = cosA * sat.rx();
      const unrotatedY = sinA * sat.ry();

      const satX = centerX + unrotatedX * Math.cos(sat.tilt) - unrotatedY * Math.sin(sat.tilt);
      const satY = centerY + unrotatedX * Math.sin(sat.tilt) + unrotatedY * Math.cos(sat.tilt);

      const groundX = satX + Math.sin(time * 1.5) * 35;
      const groundY = satY + 150 + Math.cos(time * 0.9) * 25;

      if (Math.random() < 0.08) addScanPulse(groundX, groundY, sat.color);

      /* radar beam cone */
      ctx.save();
      const beamGrad = ctx.createLinearGradient(satX, satY, groundX, groundY + 70);
      beamGrad.addColorStop(0, sat.beamColor);
      beamGrad.addColorStop(0.6, sat.beamColor.replace('0.32', '0.12'));
      beamGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(groundX - 70, groundY + 80);
      ctx.lineTo(groundX + 70, groundY + 80);
      ctx.closePath();
      ctx.fillStyle = beamGrad;
      ctx.fill();

      /* radar beam edges */
      ctx.strokeStyle = sat.color;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(groundX - 70, groundY + 80);
      ctx.moveTo(satX, satY);
      ctx.lineTo(groundX + 70, groundY + 80);
      ctx.stroke();
      ctx.restore();

      /* satellite icon */
      ctx.save();
      ctx.translate(satX, satY);

      ctx.fillStyle = '#1477B8';
      ctx.fillRect(-22, -4, 12, 8);
      ctx.fillRect(10, -4, 12, 8);

      ctx.fillStyle = sat.color;
      ctx.shadowColor = sat.color;
      ctx.shadowBlur = 12;
      ctx.fillRect(-6, -6, 12, 12);

      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      ctx.restore();
    });

    /* surface target scan pulses */
    for (let i = scanPulses.length - 1; i >= 0; i--) {
      const p = scanPulses[i];
      p.r += 1.2;
      p.alpha -= 0.014;

      if (p.alpha <= 0 || p.r >= p.maxR) {
        scanPulses.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.65;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function animate() {
    if (opView.classList.contains('is-active')) {
      drawDualSatellites();
    }
    requestAnimationFrame(animate);
  }

  animate();
})();

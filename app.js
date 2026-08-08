/* poseidon web operations */
'use strict';

const DATA = 'data';
const S = { meta:null, metrics:null, passes:[], top10:[], seizures:[], grid:null,
            passIdx:0, detCache:new Map(), catsOff:new Set(), det:null,
            filters:{minLen:0, minFish:0, zone:'all'}, isPlaying:false, playTimer:null, isFirstMapLoad:true };

const CAT = {
  unmatched:{c:'#FF6B45', label:'Tanpa AIS'},
  fishing  :{c:'#FFB347', label:'Kapal ikan'},
  cargo    :{c:'#1477B8', label:'Kargo'},
  bunker   :{c:'#9B7EDE', label:'Bunker'},
  carrier  :{c:'#66D9E8', label:'Carrier'},
  passenger:{c:'#4ADE80', label:'Penumpang'},
  tanker   :{c:'#F472B6', label:'Tanker'},
  other    :{c:'#8FA6B4', label:'Lainnya'}
};
const CAT_ICONS = {
  unmatched: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 22h20L12 2z" fill="#FF6B45" stroke="#FFFFFF" stroke-width="1.2"/><circle cx="12" cy="14" r="2" fill="#FFFFFF"/></svg>`,
  fishing:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 16l3 3h14l3-3v-4H2v4z" fill="#FFB347" stroke="#FFFFFF" stroke-width="1.2"/><path d="M6 12V7l4-3 4 3v5" fill="#FFB347"/><circle cx="17" cy="7" r="2" fill="#FFB347"/></svg>`,
  cargo:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 17l2 3h16l2-3v-4H2v4z" fill="#1477B8" stroke="#FFFFFF" stroke-width="1.2"/><rect x="5" y="7" width="5" height="6" fill="#1477B8" stroke="#FFFFFF" stroke-width="1"/><rect x="11" y="7" width="5" height="6" fill="#1477B8" stroke="#FFFFFF" stroke-width="1"/></svg>`,
  bunker:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 17l2 3h14l2-3v-4H3v4z" fill="#9B7EDE" stroke="#FFFFFF" stroke-width="1.2"/><ellipse cx="12" cy="8" rx="5" ry="3" fill="#9B7EDE" stroke="#FFFFFF" stroke-width="1"/><line x1="7" y1="8" x2="7" y2="13" stroke="#FFFFFF" stroke-width="1.2"/><line x1="17" y1="8" x2="17" y2="13" stroke="#FFFFFF" stroke-width="1.2"/></svg>`,
  carrier:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 17l3 3h14l3-3v-5H2v5z" fill="#66D9E8" stroke="#FFFFFF" stroke-width="1.2"/><path d="M5 12V6l6-3 6 3v6" fill="#66D9E8" stroke="#FFFFFF" stroke-width="1"/></svg>`,
  passenger: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 18l3 3h14l3-3v-4H2v4z" fill="#4ADE80" stroke="#FFFFFF" stroke-width="1.2"/><path d="M4 14V9h16v5" fill="#4ADE80"/><path d="M7 9V5h10v4" fill="#4ADE80"/></svg>`,
  tanker:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 17l2 3h16l2-3v-4H2v4z" fill="#F472B6" stroke="#FFFFFF" stroke-width="1.2"/><circle cx="7" cy="9" r="3.5" fill="#F472B6" stroke="#FFFFFF" stroke-width="1"/><circle cx="15" cy="9" r="3.5" fill="#F472B6" stroke="#FFFFFF" stroke-width="1"/></svg>`,
  other:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 16l3 3h12l3-3v-4H3v4z" fill="#8FA6B4" stroke="#FFFFFF" stroke-width="1.2"/><polygon points="8 12 12 5 16 12" fill="#8FA6B4"/></svg>`
};
const catOf = k => CAT[k] || CAT.other;

const N  = (v,d=2) => (v===null||v===undefined||Number.isNaN(v)) ? '—' : Number(v).toFixed(d);
const NF = v => (v===null||v===undefined) ? '—' : Number(v).toLocaleString('id-ID');
const el = (t,c,h) => { const e=document.createElement(t); if(c)e.className=c; if(h!==undefined)e.innerHTML=h; return e; };
const coord = (la,lo) => (la===null||la===undefined||lo===null||lo===undefined) ? '—' : `${Math.abs(la).toFixed(4)}°${la<0?'S':'N'}  ${Math.abs(lo).toFixed(4)}°${lo<0?'W':'E'}`;
const tierNum = t => t && (t.includes('SIAGA 1') || t.includes('VERIFIKASI')) ? 1 : t && (t.includes('SIAGA 2') || t.includes('TERARAH')) ? 2 : 3;

function getSiaga1P70Threshold() {
  if (S._p70Threshold !== undefined) return S._p70Threshold;
  if (!S.top10 || !S.top10.length) return 0.022538;
  const s1Scores = S.top10
    .filter(t => t.tier && (t.tier.includes('SIAGA 1') || t.tier.includes('VERIFIKASI')))
    .map(t => t.score)
    .sort((a, b) => a - b);
  if (!s1Scores.length) return 0.022538;
  const p70Idx = Math.floor(s1Scores.length * 0.7);
  S._p70Threshold = s1Scores[p70Idx];
  return S._p70Threshold;
}

const isP70S1 = t => t && t.tier && (t.tier.includes('SIAGA 1') || t.tier.includes('VERIFIKASI')) && t.score > getSiaga1P70Threshold();

const IDN_MONTH = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
function fmtDate(iso){
  if (!iso) return '—';
  const clean = String(iso).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length < 3) return iso;
  const [y,m,d] = parts.map(Number);
  return `${d} ${IDN_MONTH[m-1]} ${y}`;
}

/* auth session */
const AUTH = {
  KEY: 'poseidon_session_v1',
  
  getSession() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() >= data.expiresAt) {
        this.logout();
        return null;
      }
      return data;
    } catch(e) {
      return null;
    }
  },

  isLoggedIn() {
    return this.getSession() !== null;
  },

  setSession(user, token, expiresAt) {
    const session = { user, token, expiresAt };
    localStorage.setItem(this.KEY, JSON.stringify(session));
    this.updateUI();
  },

  logout() {
    localStorage.removeItem(this.KEY);
    this.updateUI();
    checkProtectedViews();
  },

  getAuthHeader() {
    const session = this.getSession();
    return session && session.token ? { 'Authorization': `Bearer ${session.token}` } : {};
  },

  updateUI() {
    const session = this.getSession();
    const badge = document.getElementById('navAuthBadge');
    const loginBtn = document.getElementById('btnHeaderLogin');
    const userChip = document.getElementById('authUserChip');
    const timerChip = document.getElementById('authTimerChip');

    if (session) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (badge) badge.style.display = 'inline-flex';
      const isSim = session.user.toLowerCase() === 'simulasi';
      if (userChip) {
        userChip.textContent = isSim ? 'SIMULASI' : session.user.toUpperCase();
        userChip.title = isSim ? 'Mode Simulasi (2023–2025)' : `Akun: ${session.user.toUpperCase()}`;
      }

      const remMs = session.expiresAt - Date.now();
      const remMins = Math.max(0, Math.ceil(remMs / 60000));
      if (timerChip) timerChip.textContent = `${remMins}m`;
    } else {
      if (badge) badge.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'inline-flex';
    }
    repositionNavAuth();
  }
};

function repositionNavAuth() {
  const isMobile = window.innerWidth <= 960;
  const authContainer = document.getElementById('navAuthContainer');
  const navTabs = document.querySelector('.nav-tabs');
  const navMetaGroup = document.getElementById('navMetaGroup');

  if (!authContainer || !navTabs || !navMetaGroup) return;

  if (isMobile) {
    if (authContainer.parentElement !== navTabs) {
      navTabs.appendChild(authContainer);
    }
  } else {
    if (authContainer.parentElement !== navMetaGroup) {
      const navToggle = document.getElementById('navToggle');
      if (navToggle) {
        navMetaGroup.insertBefore(authContainer, navToggle);
      } else {
        navMetaGroup.appendChild(authContainer);
      }
    }
  }
}

/* protected data fetcher */
async function fetchDataset(fileName) {
  const session = AUTH.getSession();
  const isSimulation = session && session.user && session.user.toLowerCase() === 'simulasi';
  const isNetlify = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const headers = AUTH.getAuthHeader();
  
  if (isNetlify) {
    try {
      const res = await fetch(`/.netlify/functions/data?file=${encodeURIComponent(fileName)}`, { headers });
      if (res.ok) return await res.json();
    } catch(e) {
      console.warn(`Netlify data function fetch failed for ${fileName}, trying static fallback.`);
    }
  }

  try {
    const res = await fetch(`${DATA}/${fileName}`);
    if (res.ok) return await res.json();
  } catch(e) {
    console.error(`Failed to fetch ${fileName}:`, e);
  }
  return null;
}

/* auth gate & blur */
function checkProtectedViews(tabName) {
  const currentTab = tabName || document.querySelector('.tab.is-active')?.dataset?.tab || 'platform';
  const protectedTabs = ['dashboard', 'operasi'];
  const isProtected = protectedTabs.includes(currentTab);
  const isLoggedIn = AUTH.isLoggedIn();

  const overlay = document.getElementById('authLockOverlay');

  document.querySelectorAll('.view').forEach(v => {
    const isThisViewProtected = protectedTabs.includes(v.id.replace('view-', ''));
    if (isThisViewProtected && !isLoggedIn) {
      v.classList.add('is-blurred');
    } else {
      v.classList.remove('is-blurred');
    }
  });

  if (isProtected && !isLoggedIn) {
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  } else {
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
  AUTH.updateUI();
}

/* auth form events */
function initAuthEvents() {
  const form = document.getElementById('authLoginForm');
  const btnToggle = document.getElementById('authPwdToggle');
  const btnLogout = document.getElementById('btnLogout');
  const btnHeaderLogin = document.getElementById('btnHeaderLogin');
  const inputPwd = document.getElementById('authPassword');

  if (btnHeaderLogin) {
    btnHeaderLogin.onclick = () => {
      switchTab('dashboard');
      const navTabsEl = document.querySelector('.nav-tabs');
      const navToggleBtn = document.getElementById('navToggle');
      if (navTabsEl) navTabsEl.classList.remove('is-open');
      if (navToggleBtn) navToggleBtn.classList.remove('is-open');
      const inputUser = document.getElementById('authUsername');
      if (inputUser) setTimeout(() => inputUser.focus(), 150);
    };
  }

  const btnQuickFill = document.getElementById('btnSimQuickFill');
  if (btnQuickFill) {
    btnQuickFill.onclick = () => {
      const uInp = document.getElementById('authUsername');
      const pInp = document.getElementById('authPassword');
      if (uInp) uInp.value = 'simulasi';
      if (pInp) pInp.value = 'simulasi123';
    };
  }

  if (btnToggle && inputPwd) {
    btnToggle.onclick = () => {
      const isPwd = inputPwd.type === 'password';
      inputPwd.type = isPwd ? 'text' : 'password';
      const eyeIcon = document.getElementById('authPwdEyeIcon');
      if (eyeIcon) {
        eyeIcon.innerHTML = isPwd
          ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
          : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
      }
    };
  }

  if (btnLogout) {
    btnLogout.onclick = () => {
      const navTabsEl = document.querySelector('.nav-tabs');
      const navToggleBtn = document.getElementById('navToggle');
      if (navTabsEl) navTabsEl.classList.remove('is-open');
      if (navToggleBtn) navToggleBtn.classList.remove('is-open');
      AUTH.logout();
    };
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const userInp = document.getElementById('authUsername').value.trim();
      const passInp = document.getElementById('authPassword').value;
      const alertBox = document.getElementById('authAlert');
      const submitBtn = document.getElementById('authSubmitBtn');

      if (!userInp || !passInp) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Memverifikasi...</span>';
      alertBox.style.display = 'none';

      let result = null;
      try {
        const res = await fetch('/.netlify/functions/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userInp, password: passInp })
        });
        result = await res.json();
      } catch(err) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          try {
            const envText = await fetch('/.env').then(r => r.ok ? r.text() : '');
            const envVars = {};
            envText.split(/\r?\n/).forEach(line => {
              const parts = line.split('=');
              if (parts.length >= 2) {
                const k = parts[0].trim();
                const v = parts.slice(1).join('=').trim();
                if (k && v) envVars[k] = v;
              }
            });
            const u1 = envVars.USER1_NAME, p1 = envVars.USER1_PASS;
            const u2 = envVars.USER2_NAME, p2 = envVars.USER2_PASS;
            const uSim = envVars.SIMULATION_USER || 'simulasi';
            const pSim = envVars.SIMULATION_PASS || 'simulasi123';

            if ((userInp === uSim && passInp === pSim) || (u1 && p1 && userInp === u1 && passInp === p1) || (u2 && p2 && userInp === u2 && passInp === p2)) {
              result = { success: true, user: userInp, token: 'simulasi_token', expiresAt: Date.now() + 3600000 };
            } else {
              result = { success: false, message: 'Username atau Password salah.' };
            }
          } catch(e) {
            result = { success: false, message: 'Gagal terhubung ke server autentikasi.' };
          }
        }
      }

      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Login</span>';

      if (result && result.success) {
        AUTH.setSession(result.user, result.token, result.expiresAt);
        checkProtectedViews();
        boot();
      } else {
        alertBox.textContent = result ? result.message : 'Gagal terhubung ke server autentikasi Netlify.';
        alertBox.style.display = 'block';
      }
    };
  }
}

/* Boot */
async function boot(){
  try{
    AUTH.updateUI();

    if (!window._authTimerInit) {
      window._authTimerInit = true;
      setInterval(() => {
        if (AUTH.isLoggedIn()) {
          AUTH.updateUI();
        } else {
          checkProtectedViews();
        }
      }, 15000);
      initAuthEvents();
    }

    const [meta, metrics, passes] = await Promise.all([
      fetchDataset('meta.json'),
      fetchDataset('metrics.json'),
      fetchDataset('passes.json')
    ]);
    S.meta = meta; S.metrics = metrics; S.passes = (passes && passes.passes) ? passes.passes : [];

    const soft = async (f, fb) => {
      const data = await fetchDataset(f);
      return data || fb;
    };
    S.top10    = (await soft('top10_2025.json', {items:[]})).items || [];
    S.seizures = (await soft('seizures.json',   {items:[]})).items || [];
    S.grid     =  await soft('fishing_grid.json', null);

    renderPlatform();
    initDashboard();
    renderOperasi();
    renderStatistik();
    initReveal();

    if (S.meta && S.meta.data) {
      const d = S.meta.data;
      document.getElementById('navMeta').textContent =
        `${NF(d.total_detections)} deteksi · ${d.n_passes} siklus`;
      document.getElementById('footMeta').textContent =
        `Data ${d.date_start.slice(0,10)} — ${d.date_end.slice(0,10)} · dibangkitkan ${(S.meta.generated_at||'').slice(0,10)}`;
    }

    const curActive = document.querySelector('.tab.is-active');
    if (curActive) updateNavBoatSlider(null, curActive);

    if (!window._listenersInit) {
      window._listenersInit = true;
      window.addEventListener('resize', () => {
        if(MAP) MAP.invalidateSize();
        const current = document.querySelector('.tab.is-active');
        if (current) updateNavBoatSlider(null, current);
        repositionNavAuth();
      });
      window.addEventListener('orientationchange', () => {
        if(MAP) setTimeout(() => MAP.invalidateSize(), 200);
        const current = document.querySelector('.tab.is-active');
        if (current) updateNavBoatSlider(null, current);
        repositionNavAuth();
      });
    }

    repositionNavAuth();

    checkProtectedViews();
  }catch(err){
    document.body.insertAdjacentHTML('afterbegin',
      `<div style="padding:120px 32px;text-align:center;font-family:monospace">
        Data belum termuat.<br><br>Pastikan folder <b>data/</b> berisi meta.json, metrics.json, passes.json
        dan berada di samping index.html.<br><br><small>${err.message}</small></div>`);
    console.error(err);
  }
}

const navToggleBtn = document.getElementById('navToggle');
const navTabsEl = document.querySelector('.nav-tabs');

if (navToggleBtn && navTabsEl) {
  navToggleBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = navTabsEl.classList.toggle('is-open');
    navToggleBtn.classList.toggle('is-open', isOpen);
  });
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]');
  if (t) { e.preventDefault(); switchTab(t.dataset.tab); }
  const sc = e.target.closest('[data-scroll]');
  if (sc) document.querySelector(sc.dataset.scroll).scrollIntoView({ behavior: 'smooth' });

  if (navTabsEl && navToggleBtn && !e.target.closest('.nav')) {
    navTabsEl.classList.remove('is-open');
    navToggleBtn.classList.remove('is-open');
  }
});

function createSailParticles(sliderEl, direction) {
  const container = sliderEl.querySelector('.boat-particle-container');
  if (!container) return;
  
  for (let i = 0; i < 16; i++) {
    setTimeout(() => {
      const p = document.createElement('span');
      p.className = 'sail-water-particle';
      const offset = (Math.random() - 0.5) * 14;
      const startX = direction === 'right' ? 12 : sliderEl.offsetWidth - 12;
      p.style.left = `${startX + offset}px`;
      p.style.bottom = `${4 + Math.random() * 8}px`;
      const size = 3 + Math.random() * 3.5;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      const vx = direction === 'right' ? -(14 + Math.random() * 18) : (14 + Math.random() * 18);
      const vy = (Math.random() - 0.5) * 10;
      p.style.setProperty('--p-vx', `${vx}px`);
      p.style.setProperty('--p-vy', `${vy}px`);
      container.appendChild(p);
      setTimeout(() => p.remove(), 650);
    }, i * 28);
  }
}

function updateNavBoatSlider(prevTabEl, newTabEl) {
  const slider = document.getElementById('navBoatSlider');
  if (!slider || !newTabEl) return;
  const navTabs = newTabEl.parentElement;
  if (!navTabs) return;
  const navRect = navTabs.getBoundingClientRect();
  const tabRect = newTabEl.getBoundingClientRect();
  const left = tabRect.left - navRect.left;
  const width = tabRect.width;

  if (prevTabEl) {
    const prevRect = prevTabEl.getBoundingClientRect();
    let dir = 'right';
    if (tabRect.left > prevRect.left) {
      dir = 'right';
      slider.classList.add('sailing-right');
      slider.classList.remove('sailing-left');
    } else if (tabRect.left < prevRect.left) {
      dir = 'left';
      slider.classList.add('sailing-left');
      slider.classList.remove('sailing-right');
    }
    createSailParticles(slider, dir);
    setTimeout(() => {
      slider.classList.remove('sailing-right', 'sailing-left');
    }, 500);
  }

  slider.style.transform = `translateX(${left}px)`;
  slider.style.width = `${width}px`;
}

function switchTab(name) {
  const prevActive = document.querySelector('.tab.is-active');
  const targetTab = document.querySelector(`.tab[data-tab="${name}"]`);

  if (navTabsEl) navTabsEl.classList.remove('is-open');
  if (navToggleBtn) navToggleBtn.classList.remove('is-open');

  document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-active', v.id === `view-${name}`));
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === name));

  checkProtectedViews(name);

  if (targetTab) updateNavBoatSlider(prevActive, targetTab);

  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.dispatchEvent(new Event('resize'));
  if (name === 'dashboard' && MAP) {
    setTimeout(() => MAP.invalidateSize(), 80);
    setTimeout(() => MAP.invalidateSize(), 300);
    setTimeout(() => centerActiveSparklineBar(), 100);
    setTimeout(() => centerActiveSparklineBar(), 350);
  }
  if (name === 'operasi') {
    setTimeout(() => {
      if (S.passes && S.passes[S.passIdx]) highlightSiaga1ChartBar(S.passes[S.passIdx].id);
    }, 80);
    setTimeout(() => {
      if (S.passes && S.passes[S.passIdx]) highlightSiaga1ChartBar(S.passes[S.passIdx].id);
    }, 250);
  }
}

/* Platform */
function renderPlatform(){
  const d = S.meta.data, m = S.meta.model;

  const lblTotalDet = document.getElementById('lblTotalDet');
  if (lblTotalDet) lblTotalDet.textContent = NF(d.total_detections);
  const lblLabelP = document.getElementById('lblLabelP');
  if (lblLabelP) lblLabelP.textContent = NF(d.label_P);
  const lblLabelU = document.getElementById('lblLabelU');
  if (lblLabelU) lblLabelU.textContent = NF(d.label_U);

  const lblLimitP = document.getElementById('lblLimitP');
  if (lblLimitP) lblLimitP.textContent = d.label_P;
  const lblLimitSeizTotal = document.getElementById('lblLimitSeizTotal');
  if (lblLimitSeizTotal) lblLimitSeizTotal.textContent = d.n_seizure_total;
  const lblLimitSeizUnmatched = document.getElementById('lblLimitSeizUnmatched');
  if (lblLimitSeizUnmatched) lblLimitSeizUnmatched.textContent = d.n_seizure_total - d.n_seizure_matched;
  const lblLimitYears = document.getElementById('lblLimitYears');
  if (lblLimitYears) lblLimitYears.textContent = `${d.date_start.slice(0,4)}–${d.date_end.slice(0,4)}`;
  const lblHeroYears = document.getElementById('lblHeroYears');
  if (lblHeroYears) lblHeroYears.textContent = `${d.date_start.slice(0,4)}–${d.date_end.slice(0,4)}`;

  const topYears = [...new Set(S.top10.map(t=>t.pass.slice(0,4)))].sort();
  const lblDashOpYear = document.getElementById('lblDashOpYear');
  if (lblDashOpYear && topYears.length > 0) lblDashOpYear.textContent = topYears.join('–');

  document.getElementById('heroStats').innerHTML = [
    [NF(d.total_detections), 'Deteksi radar'],
    [d.n_passes, 'Siklus satelit'],
    [d.label_P, 'Kasus terkonfirmasi'],
    [m.n_features, 'Fitur · 4 dimensi']
  ].map(([b,s])=>`<div class="hs"><b>${b}</b><span>${s}</span></div>`).join('');

  document.getElementById('problemStats').innerHTML = [
    [NF(d.label_U), 'Kapal berstatus tidak diketahui'],
    [NF(d.label_RN), 'Kapal niaga teridentifikasi'],
    [d.label_P, 'Kapal terkonfirmasi ilegal'],
    [`1 : ${Math.round(d.label_U/Math.max(d.label_P,1)).toLocaleString('id-ID')}`, 'Rasio kasus terhadap data']
  ].map(([b,s])=>`<div><b>${b}</b><span>${s}</span></div>`).join('');

  const DIM_ICONS = {
    A: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sonar)" stroke-width="2"><path d="M4.9 19.1C1.4 15.6 1.4 10 4.9 6.5"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9c3.5 3.5 3.5 9.1 0 12.6"/></svg>`,
    B: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--kelp)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    C: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><path d="M6.5 12c.94-2.07 3.08-3.5 5.5-3.5 2.43 0 4.56 1.43 5.5 3.5-1 2.07-3.13 3.5-5.5 3.5-2.42 0-4.56-1.43-5.5-3.5z"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/></svg>`,
    D: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--flare)" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20" stroke-width="3"/></svg>`
  };

  document.getElementById('dimGrid').innerHTML = S.meta.dimensions.map(x=>`
    <div class="dim-card reveal">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="dim-code">${x.code}</div>
        <div>${DIM_ICONS[x.code]||''}</div>
      </div>
      <h4>${x.name}</h4><p>${x.desc}</p>
      <div class="dim-feats">${x.features.map(f=>`<span>${f}</span>`).join('')}</div>
    </div>`).join('');

  document.getElementById('pipelineList').innerHTML = S.meta.pipeline.map(p=>`
    <li class="reveal"><div class="p-step">${p.step}</div>
      <div><h4>${p.title}</h4><p>${p.desc}</p></div></li>`).join('');

  const cmp = S.metrics.comparison || [];
  const pos = cmp.find(r=>r.Model.includes('POSEIDON'));
  const sup = cmp.find(r=>r.Model.includes('Supervised'));
  if(pos) document.getElementById('compareMini').innerHTML = `
    <div class="is-poseidon"><b>${N(pos['AUC-ROC'],4)}</b><span>AUC POSEIDON</span></div>
    <div><b>${sup?N(sup['AUC-ROC'],4):'—'}</b><span>AUC tanpa PU Learning</span></div>
    <div class="is-poseidon"><b>${N(pos['Alert Eff (Top10/cycle)']*100,1)}%</b><span>Kasus tertangkap sepuluh besar</span></div>
    <div><b>${sup?N(sup['Alert Eff (Top10/cycle)']*100,1)+'%':'—'}</b><span>Pembanding konvensional</span></div>`;

  const g = document.getElementById('sweepDots');
  let dots = '';
  for(let i=0;i<26;i++){
    const a = Math.random()*Math.PI*2, r = 40 + Math.random()*240;
    const hot = Math.random() < .18;
    dots += `<circle cx="${(300+Math.cos(a)*r).toFixed(1)}" cy="${(300+Math.sin(a)*r).toFixed(1)}" r="4"
      class="${hot?'hot':''}" style="animation-delay:${((a/(Math.PI*2))*7).toFixed(2)}s"/>`;
  }
  g.innerHTML = dots;
}

function initReveal(){
  const io = new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
  },{threshold:.1});
  document.querySelectorAll('.reveal').forEach(n=>io.observe(n));
}

/* Dashboard */
let MAP = null;
let LAYER_DET = null, LAYER_FISH = null, LAYER_SEIZ = null, LAYER_WPP = null, LAYER_TOP = null;

function initDashboard(){
  if (MAP) return;
  MAP = L.map('map', {
    zoomControl: false,
    scrollWheelZoom: true,
    touchZoom: true,
    dragging: true,
    doubleClickZoom: true,
    zoomSnap: 0.1,
    zoomDelta: 0.5,
    minZoom: 5,
    maxZoom: 12,
    attributionControl: false
  }).setView([2.5, 107.5], 7);

  let currentBasemap = 'voyager';
  let tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 12,
    subdomains: 'abcd'
  }).addTo(MAP);

  const btnBase = document.getElementById('mapBasemapBtn');
  if (btnBase) {
    btnBase.onclick = () => {
      if (currentBasemap === 'voyager') {
        currentBasemap = 'satellite';
        MAP.removeLayer(tileLayer);
        tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 12
        }).addTo(MAP);
        btnBase.classList.add('is-satellite');
      } else {
        currentBasemap = 'voyager';
        MAP.removeLayer(tileLayer);
        tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 12,
          subdomains: 'abcd'
        }).addTo(MAP);
        btnBase.classList.remove('is-satellite');
      }
    };
  }

  const zoomSlider = document.getElementById('mapZoomSlider');
  const zoomInBtn = document.getElementById('mapZoomInBtn');
  const zoomOutBtn = document.getElementById('mapZoomOutBtn');
  const zoomBadge = document.getElementById('mapZoomLevelVal');

  function updateZoomUI() {
    if (!MAP) return;
    const z = MAP.getZoom();
    if (z === undefined || z === null) return;
    if (zoomSlider) zoomSlider.value = z;
    if (zoomBadge) zoomBadge.textContent = `${Number(z).toFixed(1)}×`;
  }

  if (zoomSlider) {
    zoomSlider.oninput = e => {
      if (MAP) MAP.setZoom(+e.target.value);
    };
  }
  if (zoomInBtn) zoomInBtn.onclick = () => { if (MAP) MAP.zoomIn(); };
  if (zoomOutBtn) zoomOutBtn.onclick = () => { if (MAP) MAP.zoomOut(); };

  MAP.on('zoom zoomend', updateZoomUI);
  updateZoomUI();

  const scrollHint = document.getElementById('mapScrollHint');
  if (scrollHint) {
    scrollHint.onclick = () => {
      if (window.scrollY > 200) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const dashBottom = document.querySelector('.dash-bottom');
        if (dashBottom) dashBottom.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('scroll', () => {
      if (window.scrollY > 200) {
        scrollHint.classList.add('is-scrolled');
        const textEl = scrollHint.querySelector('.hint-text');
        if (textEl) textEl.textContent = 'Kembali ke Peta Operasional';
      } else {
        scrollHint.classList.remove('is-scrolled');
        const textEl = scrollHint.querySelector('.hint-text');
        if (textEl) textEl.textContent = 'Detail Operasional & Prioritas Patroli';
      }
    });
  }

  LAYER_FISH = L.layerGroup();
  LAYER_SEIZ = L.layerGroup();
  LAYER_DET = L.layerGroup().addTo(MAP);
  LAYER_TOP = L.layerGroup();
  LAYER_WPP = L.layerGroup().addTo(MAP);

  const fallbackPoly = [
    [105.5, -4.25], [106.0, -4.25], [107.0, -3.8], [108.0, -3.5], [110.5, -3.3],
    [110.5, -2.0], [109.8, -1.0], [109.5, 0.5], [109.0, 1.8], [109.8, 2.5],
    [110.0, 3.5], [109.8, 4.5], [108.5, 5.8], [107.8, 5.8], [105.8, 5.5],
    [105.2, 5.1], [104.5, 3.8], [104.5, 2.2], [104.2, 1.5], [103.0, 0.5],
    [103.2, -0.8], [104.0, -1.3], [104.7, -2.5], [105.5, -4.25]
  ];

  fetch(`${DATA}/wpp711_polygon.json`)
    .then(r => r.json())
    .catch(() => fetch(`${DATA}/wpp711_geojson.json`).then(r => r.json()))
    .then(geoData => {
      L.geoJSON(geoData, {
        style: {
          color: '#66D9E8',
          weight: 2.2,
          fillColor: '#1477B8',
          fillOpacity: 0.08,
          dashArray: '6 4'
        }
      }).addTo(LAYER_WPP);
    })
    .catch(() => {
      const latLngs = fallbackPoly.map(c => [c[1], c[0]]);
      L.polygon(latLngs, {
        color: '#66D9E8', weight: 2.2, fillColor: '#1477B8', fillOpacity: 0.08, dashArray: '6 4'
      }).addTo(LAYER_WPP);
    });

  /* legend kategori vessel */
  document.getElementById('catLegend').innerHTML = Object.entries(CAT).map(([k,v])=>`
    <label><input type="checkbox" data-cat="${k}" checked>
      <span class="cat-icon-wrap">${CAT_ICONS[k]||''}</span><span>${v.label}</span>
      <span class="cnt" data-cnt="${k}">0</span></label>`).join('');
  document.getElementById('catLegend').addEventListener('change', e=>{
    const k = e.target.dataset.cat; if(!k) return;
    e.target.checked ? S.catsOff.delete(k) : S.catsOff.add(k);
    drawDetections();
  });
  document.getElementById('catAll').onclick = ()=>{
    S.catsOff.clear();
    document.querySelectorAll('#catLegend input').forEach(i=>i.checked=true);
    drawDetections();
  };

  /* filter parameter */
  const filterLen = document.getElementById('filterMinLen');
  const filterFish = document.getElementById('filterMinFish');
  const filterZone = document.getElementById('filterZone');
  if(filterLen && filterFish && filterZone){
    filterLen.oninput = e => {
      S.filters.minLen = +e.target.value;
      document.getElementById('filterMinLenVal').textContent = S.filters.minLen > 0 ? `${S.filters.minLen} m` : 'Semua';
      drawDetections();
    };
    filterFish.oninput = e => {
      S.filters.minFish = +e.target.value;
      document.getElementById('filterMinFishVal').textContent = S.filters.minFish > 0 ? `≥ ${S.filters.minFish}` : 'Semua';
      drawDetections();
    };
    filterZone.onchange = e => {
      S.filters.zone = e.target.value;
      drawDetections();
    };
  }

  /* toggle layer */
  document.getElementById('layFishing').onchange = e => {
    e.target.checked ? LAYER_FISH.addTo(MAP) : MAP.removeLayer(LAYER_FISH);
    document.getElementById('fishLegend').classList.toggle('is-on', e.target.checked);
  };
  document.getElementById('laySeizure').onchange = e =>
    e.target.checked ? LAYER_SEIZ.addTo(MAP) : MAP.removeLayer(LAYER_SEIZ);
  document.getElementById('layWpp').onchange = e =>
    e.target.checked ? LAYER_WPP.addTo(MAP) : MAP.removeLayer(LAYER_WPP);
  document.getElementById('layTop10').onchange = e =>
    e.target.checked ? LAYER_TOP.addTo(MAP) : MAP.removeLayer(LAYER_TOP);

  /* pass controls & auto-play */
  const slider = document.getElementById('passSlider');
  slider.max = S.passes.length-1;
  slider.oninput = e=>selectPass(+e.target.value);
  document.getElementById('passPrev').onclick = ()=>selectPass(S.passIdx-1);
  document.getElementById('passNext').onclick = ()=>selectPass(S.passIdx+1);
  document.getElementById('passPlay').onclick = toggleAutoPlay;

  /* map search */
  document.getElementById('mapSearchBtn').onclick = searchMap;
  document.getElementById('mapSearchInput').onkeyup = e=>{ if(e.key==='Enter') searchMap(); };

  /* export data */
  document.getElementById('exportDashGeoJSON').onclick = () => exportPassData(S.passes[S.passIdx].id, 'geojson');
  document.getElementById('exportDashCSV').onclick = () => exportPassData(S.passes[S.passIdx].id, 'csv');

  if (!S.passes || !S.passes.length) return;
  const years = [...new Set(S.passes.map(p => p.year))].sort();
  const yearSel = document.getElementById('jumpYear');
  if (yearSel) {
    yearSel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    yearSel.onchange = () => { fillJumpPass(+yearSel.value); selectPass(+document.getElementById('jumpPass').value); };
  }
  const jumpPassEl = document.getElementById('jumpPass');
  if (jumpPassEl) {
    jumpPassEl.onchange = e => selectPass(+e.target.value);
  }

  const first2025 = S.passes.findIndex(p => p.year === 2025);
  const start = first2025 >= 0 ? first2025 : 0;
  if (S.passes[start] && yearSel) {
    yearSel.value = S.passes[start].year;
    fillJumpPass(S.passes[start].year);
    renderTimelineSparkline();
    selectPass(start);
  }

  buildSeizureLayer();
  buildFishingLayer();
}

function toggleAutoPlay(){
  const btn = document.getElementById('passPlay');
  if(S.isPlaying){
    clearInterval(S.playTimer);
    S.isPlaying = false;
    btn.textContent = '▶';
  } else {
    S.isPlaying = true;
    btn.textContent = '⏸';
    S.playTimer = setInterval(()=>{
      let next = S.passIdx + 1;
      if(next >= S.passes.length) next = 0;
      selectPass(next);
    }, 1500);
  }
}

function highlightVesselMarker(targetId, lat, lon) {
  if (!MAP) return;

  if (S.searchHighlightMarker) {
    MAP.removeLayer(S.searchHighlightMarker);
    S.searchHighlightMarker = null;
  }

  MAP.setView([lat, lon], 10, { animate: true, duration: 0.8 });

  const highlightIcon = L.divIcon({
    className: 'search-target-highlight-wrap',
    html: `
      <div class="search-target-ring"></div>
      <div class="search-target-core"></div>
    `,
    iconSize: [64, 64],
    iconAnchor: [32, 32]
  });

  S.searchHighlightMarker = L.marker([lat, lon], {
    icon: highlightIcon,
    interactive: false,
    zIndexOffset: 5000
  }).addTo(MAP);

  if (targetId && S.markerMap && S.markerMap.has(targetId)) {
    const m = S.markerMap.get(targetId);
    if (m) {
      m.openTooltip();
      if (typeof m.getElement === 'function') {
        const el = m.getElement();
        if (el) {
          el.classList.add('is-highlighted-node');
          setTimeout(() => el.classList.remove('is-highlighted-node'), 5000);
        }
      }
    }
  }

  setTimeout(() => {
    if (S.searchHighlightMarker) {
      MAP.removeLayer(S.searchHighlightMarker);
      S.searchHighlightMarker = null;
    }
  }, 6000);
}

async function searchMap(){
  const q = document.getElementById('mapSearchInput').value.trim();
  if(!q) return;
  if(q.includes(',')){
    const [la, lo] = q.split(',').map(Number);
    if(!isNaN(la) && !isNaN(lo)){
      highlightVesselMarker(null, la, lo);
      return;
    }
  }
  const targetId = parseInt(q.replace('#',''), 10);
  if(!isNaN(targetId)){
    if(S.det){
      const C = S.det.columns, ix = k => C.indexOf(k);
      const [iId,iLa,iLo,iLen,iCat,iAis,iFs,iMs,iFlag,iVv,iVh,iSnr,iMpa,iEez,iPort,iHour] =
        ['row_id','lat','lon','length_m','cat','ais','fscore','mscore','flag','vv','vh','snr','mpa','eez','port','hour'].map(ix);
      const row = S.det.rows.find(r => r[iId] === targetId);
      if(row){
        highlightVesselMarker(row[iId], row[iLa], row[iLo]);
        showDetail({
          id:row[iId], lat:row[iLa], lon:row[iLo], len:row[iLen], cat:(row[iAis]===0?'unmatched':(CAT[row[iCat]]?row[iCat]:'other')), rawCat:row[iCat],
          ais:row[iAis], fs:row[iFs], ms:row[iMs], flag:row[iFlag], vv:row[iVv], vh:row[iVh],
          snr:row[iSnr], mpa:row[iMpa], eez:row[iEez], port:row[iPort], hour:row[iHour]
        });
        return;
      }
    }
    const topMatch = S.top10.find(t => t.row_id === targetId);
    if(topMatch){
      const passIdx = S.passes.findIndex(p => p.id === topMatch.pass);
      if(passIdx >= 0){
        await selectPass(passIdx);
        highlightVesselMarker(topMatch.row_id, topMatch.lat, topMatch.lon);
        showDetail({
          id:topMatch.row_id, lat:topMatch.lat, lon:topMatch.lon, len:topMatch.length_m, cat:topMatch.cat, rawCat:topMatch.cat,
          ais:topMatch.ais, fs:topMatch.fishing_score, ms:topMatch.matching_score, flag:topMatch.flag, vv:topMatch.vv, vh:topMatch.vh,
          snr:topMatch.snr, mpa:topMatch.mpa, eez:topMatch.eez, port:topMatch.port, hour:topMatch.hour
        });
        return;
      }
    }
    alert(`Deteksi #${targetId} tidak ditemukan pada siklus ini atau daftar prioritas.`);
  }
}

function fillJumpPass(year){
  document.getElementById('jumpPass').innerHTML = S.passes
    .map((p,i)=>({p,i})).filter(o=>o.p.year===year)
    .map(o=>`<option value="${o.i}">${fmtDate(o.p.id)} · ${o.p.n} deteksi</option>`).join('');
}

async function selectPass(i){
  if(i<0||i>=S.passes.length) return;
  S.passIdx = i;
  const p = S.passes[i];
  document.getElementById('passSlider').value = i;
  document.getElementById('passSeq').textContent  = `PASS ${String(p.seq).padStart(3,'0')} / ${S.passes.length}`;
  document.getElementById('passDate').textContent = fmtDate(p.id);
  document.getElementById('passSub').textContent  = `${p.time} UTC · ${p.n} deteksi · ${p.n_dark} tanpa AIS`;

  const warnContainer = document.getElementById('passWarningContainer');
  if (warnContainer) {
    if (p.n < 50) {
      warnContainer.innerHTML = `
        <div class="pass-warning-badge" id="passWarningBadge" tabindex="0" onmouseleave="this.blur()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFB347" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Cakupan Sempit</span>
          <div class="pass-warning-tooltip">
            <strong>⚠️ Cakupan Satelit Terbatas</strong>
            <p>Pada perlintasan tanggal ini, cakupan wilayah pencitraan radar satelit Sentinel-1 relatif sempit di area WPP 711, sehingga total kapal yang terdeteksi (${p.n} kapal) lebih sedikit dibandingkan perlintasan normal.</p>
          </div>
        </div>
      `;
    } else {
      warnContainer.innerHTML = '';
    }
  }

  document.getElementById('jumpYear').value = p.year;
  fillJumpPass(p.year);
  document.getElementById('jumpPass').value = i;

  const box = document.getElementById('timelineSparkline');
  if (box) {
    const prevBar = box.querySelector('.sparkline-bar.is-active');
    if (prevBar) prevBar.classList.remove('is-active');
    const newBar = box.querySelector(`[data-pass-idx="${i}"]`);
    if (newBar) {
      newBar.classList.add('is-active');
      if (box.offsetWidth > 0) {
        box.scrollLeft = newBar.offsetLeft - (box.offsetWidth / 2) + (newBar.offsetWidth / 2);
      }
    }
  }

  document.getElementById('mapBadge').textContent = 'memuat siklus…';
  let d = S.detCache.get(p.id);
  if(!d){
    try{ d = await fetchDataset(`detections/${p.id}.json`); }
    catch(e){ d = {columns:[],rows:[]}; }
    if (!d) d = {columns:[],rows:[]};
    S.detCache.set(p.id, d);
    if(S.detCache.size>28) S.detCache.delete(S.detCache.keys().next().value);
  }
  S.det = d;
  drawDetections();
  drawTop10ForPass(p.id);
  renderTopStrip(p.id);

  const selOp = document.getElementById('opCycle');
  if (selOp && selOp.value !== p.id) {
    selOp.value = p.id;
    const tierBtn = document.querySelector('#opTierFilter .is-on');
    if (tierBtn) drawOpList(p.id, tierBtn.dataset.tier, document.getElementById('opConformal').checked);
  }
  if (typeof highlightSiaga1ChartBar === 'function') highlightSiaga1ChartBar(p.id);
}

function drawDetections(){
  LAYER_DET.clearLayers();
  S.markerMap = new Map();
  if(!S.det || !MAP) return;

  const C = S.det.columns, ix = k => C.indexOf(k);
  const [iId,iLa,iLo,iLen,iCat,iAis,iFs,iMs,iFlag,iVv,iVh,iSnr,iMpa,iEez,iPort,iHour] =
    ['row_id','lat','lon','length_m','cat','ais','fscore','mscore','flag','vv','vh','snr','mpa','eez','port','hour'].map(ix);

  const counts = {}; let shown = 0;
  const bounds = [];

  S.det.rows.forEach(r => {
    const key = (r[iAis]===0) ? 'unmatched' : (CAT[r[iCat]] ? r[iCat] : 'other');
    counts[key] = (counts[key] || 0) + 1;

    if(S.catsOff && S.catsOff.has(key)) return;
    if(S.filters && S.filters.minLen && r[iLen] < S.filters.minLen) return;
    if(S.filters && S.filters.minFish && r[iFs] < S.filters.minFish) return;
    if(S.filters && S.filters.zone === 'eez50' && r[iEez] > 50) return;
    if(S.filters && S.filters.zone === 'mpa30' && r[iMpa] > 30) return;

    shown++;
    bounds.push([r[iLa], r[iLo]]);

    const col = (r[iAis]===0) ? '#FF6B45' : (CAT[r[iCat]] ? CAT[r[iCat]].c : '#8FA6B4');
    const shapeSVG = CAT_ICONS[key] || CAT_ICONS.other;

    const icon = L.divIcon({
      className: 'vessel-pin-badge-wrap',
      html: `
        <div class="vessel-pin-badge" style="--v-col: ${col};">
          <div class="v-pin-icon" style="border-color:${col};color:${col};background:#0B1E2D">
            ${shapeSVG}
          </div>
        </div>
      `,
      iconSize: [24, 28],
      iconAnchor: [12, 28]
    });

    const tipHtml = `
      <div class="v-tip-head">
        <span class="v-tip-id">Deteksi #${r[iId]}</span>
        <span class="v-tip-cat" style="color:${col}">${catOf(key).label}</span>
      </div>
      <div class="v-tip-body">
        <span>Koordinat: <b style="color:var(--foam);font-family:var(--f-mono)">${coord(r[iLa], r[iLo])}</b></span>
        <span>Waktu UTC: <b>${r[iHour]}</b></span>
        <span>Panjang Kapal: <b>${N(r[iLen],1)} m</b></span>
        <span>Radar VV/VH: <b>${N(r[iVv],1)} / ${N(r[iVh],1)} dB</b></span>
        <span>Kesesuaian Sinyal: <b style="color:${r[iAis]? '#4ADE80':'#FF6B45'}">${r[iAis]? 'AIS Cocok':'Tanpa Sinyal AIS'}</b></span>
      </div>
    `;

    const marker = L.marker([r[iLa], r[iLo]], { icon: icon, riseOnHover: true })
      .bindTooltip(tipHtml, { direction: 'top', offset: [0, -22], opacity: 1, className: 'vessel-pin-tooltip-popup' })
      .on('click', () => {
        highlightVesselMarker(r[iId], r[iLa], r[iLo]);
        showDetail({
          id:r[iId], lat:r[iLa], lon:r[iLo], len:r[iLen], cat:key, rawCat:r[iCat],
          ais:r[iAis], fs:r[iFs], ms:r[iMs], flag:r[iFlag], vv:r[iVv], vh:r[iVh],
          snr:r[iSnr], mpa:r[iMpa], eez:r[iEez], port:r[iPort], hour:r[iHour]
        });
      })
      .addTo(LAYER_DET);

    S.markerMap.set(r[iId], marker);
  });

  if(S.isFirstMapLoad && shown > 0 && bounds.length > 0 && MAP){
    S.isFirstMapLoad = false;
    MAP.fitBounds(bounds, {
      padding: [80, 80],
      maxZoom: 7.2,
      animate: false
    });
  }

  Object.keys(CAT).forEach(k => {
    const n = document.querySelector(`[data-cnt="${k}"]`);
    if(n) n.textContent = counts[k] ? counts[k].toLocaleString('id-ID') : '0';
  });
  document.getElementById('mapBadge').textContent =
    `${shown.toLocaleString('id-ID')} dari ${S.det.rows.length.toLocaleString('id-ID')} deteksi ditampilkan`;
}

function showDetail(v){
  const c = catOf(v.cat);
  const pctVV = Math.min(100, Math.max(5, ((v.vv + 30) / 40) * 100));
  const pctVH = Math.min(100, Math.max(5, ((v.vh + 30) / 40) * 100));
  const pctSNR = Math.min(100, Math.max(5, (v.snr / 40) * 100));
  const estRCS = Math.round(Math.pow(10, (v.vv + 35) / 15) * 2.2);

  document.getElementById('railDetail').innerHTML = `
    <div class="rail-head">
      <span class="rail-head-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Detail deteksi
      </span>
    </div>
    <p class="det-title">Deteksi #${v.id}</p>
    <span class="det-chip" style="background:${c.c}22;color:${c.c}">${c.label}</span>
    <dl class="kv">
      <dt>Koordinat</dt><dd>${coord(v.lat,v.lon)}</dd>
      <dt>Waktu</dt><dd>${v.hour} UTC</dd>
      <dt>Panjang</dt><dd>${N(v.len,1)} m</dd>
      <dt>Status AIS</dt><dd>${v.ais? 'Cocok':'Tidak cocok'}</dd>
      <dt>Bendera</dt><dd>${v.flag||'—'}</dd>
      <dt>Skor cocok</dt><dd>${N(v.ms,3)}</dd>
      <dt>Skor ikan</dt><dd>${N(v.fs,3)}</dd>
      <dt>VV / VH</dt><dd>${N(v.vv,1)} / ${N(v.vh,1)} dB</dd>
      <dt>Estimasi RCS</dt><dd>${estRCS.toLocaleString('id-ID')} m²</dd>
      <dt>SNR</dt><dd>${N(v.snr,1)} dB</dd>
      <dt>Jarak MPA</dt><dd>${N(v.mpa,1)} km</dd>
      <dt>Jarak ZEE</dt><dd>${N(v.eez,1)} km</dd>
      <dt>Jarak pelabuhan</dt><dd>${N(v.port,1)} km</dd>
    </dl>

    <div class="radar-profile">
      <h5>Profil Spektrogram Radar SAR</h5>
      <div class="radar-gauge-row">
        <span>Intensitas VV</span>
        <div class="radar-gauge-track"><div class="radar-gauge-fill" style="width:${pctVV}%"></div></div>
        <span>${N(v.vv,1)} dB</span>
      </div>
      <div class="radar-gauge-row">
        <span>Intensitas VH</span>
        <div class="radar-gauge-track"><div class="radar-gauge-fill" style="width:${pctVH}%;background:var(--amber)"></div></div>
        <span>${N(v.vh,1)} dB</span>
      </div>
      <div class="radar-gauge-row">
        <span>Signal SNR</span>
        <div class="radar-gauge-track"><div class="radar-gauge-fill" style="width:${pctSNR}%;background:var(--kelp)"></div></div>
        <span>${N(v.snr,1)} dB</span>
      </div>
    </div>`;
}



function buildFishingLayer(){
  LAYER_FISH.clearLayers();
  if(!S.grid || !MAP) return;
  const cs = S.grid.cell_size || .25;
  S.grid.rows.forEach(([la,lo,fs]) => {
    const col = fs>.7 ? '#0E7C6B' : fs>=.3 ? '#3FA796' : '#1B4B57';
    L.rectangle([[la,lo],[la+cs,lo+cs]], {
      color: col, weight: 0, fillColor: col, fillOpacity: fs>.7?.42: fs>=.3?.26:.12
    }).bindPopup(`<b>Potensi lokasi ikan</b><br>skor rata-rata ${N(fs,3)}`).addTo(LAYER_FISH);
  });
}

function buildSeizureLayer(){
  LAYER_SEIZ.clearLayers();
  if(!S.seizures || !MAP) return;
  const seizSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  S.seizures.forEach(s => {
    const col = s.matched ? '#FF6B45' : '#1477B8';
    const seizIcon = L.divIcon({
      className: 'vessel-pin-badge-wrap',
      html: `
        <div class="vessel-pin-badge" style="--v-col: ${col};">
          <div class="v-pin-icon" style="border-color:${col};color:${col};background:#0B1E2D">
            ${seizSVG}
          </div>
          <div class="v-pin-tooltip">
            <div class="v-tip-head">
              <span class="v-tip-id">Penindakan Patroli</span>
              <span class="v-tip-cat" style="color:${col}">${fmtDate(s.date)}</span>
            </div>
            <div class="v-tip-body">
              <span>Koordinat: <b style="color:var(--foam);font-family:var(--f-mono)">${coord(s.lat, s.lon)}</b></span>
              <span>Bendera: <b>${s.flag}</b></span>
              <span>Jenis: <b>${s.type}</b></span>
              ${s.gt?`<span>Bobot: <b>GT ${N(s.gt,0)}</b></span>`:''}
              <span>Radar SAR: <b style="color:${s.matched?'#4ADE80':'#FF6B45'}">${s.matched?'Tercocokkan':'Tanpa AIS'}</b></span>
            </div>
          </div>
        </div>
      `,
      iconSize: [24, 28],
      iconAnchor: [12, 28]
    });

    L.marker([s.lat, s.lon], { icon: seizIcon, riseOnHover: true, zIndexOffset: 1500 })
      .on('click', () => MAP.setView([s.lat, s.lon], 9))
      .addTo(LAYER_SEIZ);
  });
}

function drawTop10ForPass(passId){
  LAYER_TOP.clearLayers();
  if(!MAP) return;
  S.top10.filter(t => t.pass === passId).forEach(t => {
    const col = t.rank <= 3 ? '#FFB347' : t.rank <= 6 ? '#66D9E8' : '#1477B8';
    const topIcon = L.divIcon({
      className: 'vessel-pin-badge-wrap',
      html: `
        <div class="vessel-pin-badge" style="--v-col: ${col}; width:28px; height:34px;">
          <div class="v-pin-icon" style="width:28px;height:28px;border-color:${col};color:${col};background:#071B2A;font-family:var(--f-mono);font-weight:800;font-size:12.5px;box-shadow:0 0 12px ${col}66">
            ${t.rank}
          </div>
          <div class="v-pin-tooltip">
            <div class="v-tip-head">
              <span class="v-tip-id">Prioritas #${t.rank}</span>
              <span class="v-tip-cat" style="color:${col}">${t.tier ? t.tier.split(' (')[0] : 'Siaga'}</span>
            </div>
            <div class="v-tip-body">
              <span>Koordinat: <b style="color:var(--foam);font-family:var(--f-mono)">${coord(t.lat, t.lon)}</b></span>
              <span>Skor Prioritas: <b>${N(t.score, 5)}</b></span>
              <span>Tingkat Risiko: <b>${t.tier || 'Siaga Patroli'}</b></span>
              <span>Jaminan Conformal: <b style="color:${t.conformal ? '#4ADE80' : '#8FA6B4'}">${t.conformal ? 'Lolos (90%)' : 'Standar'}</b></span>
            </div>
          </div>
        </div>
      `,
      iconSize: [28, 34],
      iconAnchor: [14, 34]
    });

    L.marker([t.lat, t.lon], { icon: topIcon, riseOnHover: true, zIndexOffset: 3000 })
      .on('click', () => MAP.setView([t.lat, t.lon], 9.5))
      .addTo(LAYER_TOP);
  });
}

function renderTopStrip(passId){
  const items = S.top10.filter(t=>t.pass===passId).sort((a,b)=>a.rank-b.rank);
  document.getElementById('topCycleLabel').textContent = fmtDate(passId);
  const box = document.getElementById('topStrip');
  if(!items.length){
    box.innerHTML = `<p class="rail-empty" style="color:var(--ink-2)">
      Siklus ini di luar rentang keluaran operasional. Prioritas patroli dihasilkan untuk siklus tahun 2025.</p>`;
    return;
  }
  box.innerHTML = items.map(t=>{
    const p70 = isP70S1(t);
    return `
    <div class="top-card ${p70 ? 'is-p70-card' : ''}" data-goto="${t.lat},${t.lon}" data-rowid="${t.row_id}">
      <div class="rank">PRIORITAS ${String(t.rank).padStart(2,'0')}</div>
      <div class="score ${p70 ? 'is-p70-score' : ''}">${N(t.score,5)}</div>
      <div class="coord">${coord(t.lat,t.lon)}</div>
      <div class="chip-row">
        <span class="tier-chip t${tierNum(t.tier)}">${t.tier.split(' (')[0]}</span>
        ${p70 ? '<span class="tier-chip t-p70">⚡ PRIORITAS UTAMA</span>' : ''}
        ${t.conformal ? '<span class="tier-chip t3">CONFORMAL 90%</span>' : ''}
      </div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-goto]').forEach(c=>c.onclick=()=>{
    const [la,lo] = c.dataset.goto.split(',').map(Number);
    const rId = c.dataset.rowid ? parseInt(c.dataset.rowid, 10) : null;
    document.getElementById('layTop10').checked = true; LAYER_TOP.addTo(MAP);
    highlightVesselMarker(rId, la, lo);
    document.querySelector('.map-wrap').scrollIntoView({behavior:'smooth',block:'center'});
  });

  renderDashExtraPanels(passId);
}

function renderDashExtraPanels(passId){
  const items = S.top10.filter(t=>t.pass===passId).sort((a,b)=>a.rank-b.rank);
  const elSummary = document.getElementById('dashExtraSummary');
  const elMatrix  = document.getElementById('dashRiskMatrix');
  const elTable   = document.getElementById('dashTablePanel');

  if(!items.length){
    if(elSummary) elSummary.innerHTML = '';
    if(elMatrix) elMatrix.innerHTML = '';
    if(elTable) elTable.innerHTML = '';
    return;
  }

  const avgScore = items.reduce((a,b)=>a+b.score,0)/items.length;
  const threatLabel = avgScore >= 0.7 ? 'SIAGA TINGGI' : avgScore >= 0.4 ? 'SIAGA SEDANG' : 'SIAGA NORMAL';
  const s1Count = items.filter(t=>tierNum(t.tier)===1).length;
  const s2Count = items.filter(t=>tierNum(t.tier)===2).length;
  const s3Count = items.filter(t=>tierNum(t.tier)===3).length;
  const confCount = items.filter(t=>t.conformal===1).length;
  const avgLen = items.reduce((a,b)=>a+(b.length_m||0),0)/items.length;
  const meanLat = items.reduce((a,b)=>a+b.lat,0)/items.length;
  const meanLon = items.reduce((a,b)=>a+b.lon,0)/items.length;

  if(elSummary){
    elSummary.innerHTML = `
      <div class="dash-summary-grid">
        <div class="dash-summary-item"><b>${threatLabel}</b><span>Status Ancaman Siklus</span></div>
        <div class="dash-summary-item"><b>${s1Count} S1 · ${s2Count} S2 · ${s3Count} S3</b><span>Komposisi Siaga</span></div>
        <div class="dash-summary-item"><b>${confCount} / 10 Kapal</b><span>Sertifikasi Conformal 90%</span></div>
        <div class="dash-summary-item"><b>${N(avgLen,1)} m</b><span>Rata-Rata Panjang Kapal</span></div>
        <div class="dash-summary-item"><b>${coord(meanLat,meanLon)}</b><span>Pusat Klaster Ancaman (Centroid)</span></div>
      </div>`;
  }

  const eezCount = items.filter(t => (t.eez||999) <= 50).length;
  const mpaCount = items.filter(t => (t.mpa||999) <= 30).length;
  const fishCount = items.filter(t => (t.fscore||0) >= 0.5).length;
  const darkCount = items.filter(t => t.ais === 0).length;

  if(elMatrix){
    elMatrix.innerHTML = `
      <div class="dash-matrix-box">
        <h4>Matriks Analisis Indikator Risiko Siklus</h4>
        <div class="dash-matrix-grid">
          <div class="dash-matrix-card">
            <h5>Kedekatan Garis ZEE</h5>
            <p>${eezCount} dari 10 kapal prioritas berjarak kurang dari 50 km dari garis batas ZEE Indonesia.</p>
            <div class="dash-matrix-bar"><div class="dash-matrix-fill" style="width:${eezCount*10}%"></div></div>
          </div>
          <div class="dash-matrix-card">
            <h5>Zona Perikanan Aktif</h5>
            <p>${fishCount} dari 10 kapal terdeteksi di area berpotensi ikan tinggi (Skor Aktivitas ≥ 0.5).</p>
            <div class="dash-matrix-bar"><div class="dash-matrix-fill" style="width:${fishCount*10}%;background:var(--amber)"></div></div>
          </div>
          <div class="dash-matrix-card">
            <h5>Potensi Kawasan Konservasi</h5>
            <p>${mpaCount} dari 10 kapal terdeteksi dalam jangkauan 30 km dari Kawasan Konservasi Perairan (MPA).</p>
            <div class="dash-matrix-bar"><div class="dash-matrix-fill" style="width:${mpaCount*10}%;background:var(--kelp)"></div></div>
          </div>
          <div class="dash-matrix-card">
            <h5>Kapal Tanpa AIS</h5>
            <p>${darkCount} dari 10 kapal prioritas merupakan kapal yang tidak memancarkan sinyal AIS resmi.</p>
            <div class="dash-matrix-bar"><div class="dash-matrix-fill" style="width:${darkCount*10}%;background:var(--flare)"></div></div>
          </div>
        </div>
      </div>`;
  }

  if(elTable){
    const rowsHtml = items.map(t => `
      <tr>
        <td><b>PRIORITAS ${String(t.rank).padStart(2,'0')}</b></td>
        <td>#${t.row_id}</td>
        <td><span class="tier-chip t${tierNum(t.tier)}">${t.tier.split(' (')[0]}</span> ${t.conformal?'<span class="tier-chip t3">CONFORMAL</span>':''}</td>
        <td>${coord(t.lat,t.lon)}</td>
        <td><b>${N(t.score,5)}</b></td>
        <td>${N(t.length_m,1)} m</td>
        <td>${N(t.fscore,3)}</td>
        <td>${N(t.eez,1)} km</td>
        <td>${N(t.mpa,1)} km</td>
        <td>${N(t.port,1)} km</td>
        <td><button class="btn btn-sm" data-goto="${t.lat},${t.lon}">Fokus Peta</button></td>
      </tr>`).join('');

    elTable.innerHTML = `
      <div class="panel" style="margin-top:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
          <h3 style="margin:0">Tabel Komparasi Operasional Kapal Prioritas</h3>
          <span class="mono" style="font-size:12.5px;color:var(--ink-2)">Sepuluh Target Utama Siklus Ini</span>
        </div>
        <div class="table-scroll">
          <table class="tbl">
            <thead>
              <tr>
                <th>Target</th>
                <th>ID Deteksi</th>
                <th>Status Siaga</th>
                <th>Koordinat</th>
                <th>Skor Risiko</th>
                <th>Panjang</th>
                <th>Skor Ikan</th>
                <th>Jarak ZEE</th>
                <th>Jarak MPA</th>
                <th>Jarak Pelabuhan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>`;

    elTable.querySelectorAll('[data-goto]').forEach(c=>c.onclick=()=>{
      const [la,lo] = c.dataset.goto.split(',').map(Number);
      document.getElementById('layTop10').checked = true; LAYER_TOP.addTo(MAP);
      MAP.setView([la,lo], 9);
      document.querySelector('.map-wrap').scrollIntoView({behavior:'smooth',block:'center'});
    });
  }
}

/* operasi */
function renderOperasi(){
  const cycles = [...new Set(S.top10.map(t=>t.pass))].sort();
  const sel = document.getElementById('opCycle');
  sel.innerHTML = cycles.map(c=>`<option value="${c}">${fmtDate(c)}</option>`).join('');

  renderSiaga1BarChart();

  const draw = ()=>{
    const tierBtn = document.querySelector('#opTierFilter .is-on');
    drawOpList(sel.value, tierBtn.dataset.tier, document.getElementById('opConformal').checked);
    highlightSiaga1ChartBar(sel.value);
  };

  sel.onchange = () => {
    const pIdx = S.passes.findIndex(p => p.id === sel.value);
    if (pIdx >= 0 && pIdx !== S.passIdx) {
      selectPass(pIdx);
    } else {
      draw();
    }
  };

  document.getElementById('opConformal').onchange = draw;
  document.querySelectorAll('#opTierFilter .seg-btn').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#opTierFilter .seg-btn').forEach(x=>x.classList.remove('is-on'));
    b.classList.add('is-on'); draw();
  });
  document.getElementById('opExportGeoJSON').onclick = () => exportPassData(sel.value, 'geojson');
  document.getElementById('opExportCSV').onclick = () => exportPassData(sel.value, 'csv');
  if(cycles.length) draw();
  else document.getElementById('opList').innerHTML =
    '<p class="loading">Data prioritas belum tersedia (top10_2025.json).</p>';
}

function showGlobalBarTooltip(e, html) {
  const tip = document.getElementById('globalBarTooltip');
  if (!tip) return;
  tip.innerHTML = html;
  const rect = e.currentTarget.getBoundingClientRect();
  tip.style.left = `${rect.left + rect.width / 2}px`;
  tip.style.top = `${rect.top}px`;
  tip.classList.add('is-active');
}

function hideGlobalBarTooltip() {
  const tip = document.getElementById('globalBarTooltip');
  if (tip) tip.classList.remove('is-active');
}

function renderSiaga1BarChart(){
  const chartBox = document.getElementById('opSiaga1BarChart');
  if (!chartBox) return;

  const passes2025 = S.passes.filter(p => p.year === 2025);
  if (!passes2025.length) {
    chartBox.innerHTML = '<span class="note">Distribusi tidak tersedia.</span>';
    return;
  }

  const p70Thresh = getSiaga1P70Threshold();
  const passStats = passes2025.map(p => {
    const s1Items = S.top10.filter(t => t.pass === p.id && t.tier && (t.tier.includes('SIAGA 1') || t.tier.includes('VERIFIKASI')));
    const maxScore = s1Items.length ? Math.max(...s1Items.map(x => x.score)) : 0;
    return { pass: p, s1Count: s1Items.length, maxScore };
  });

  const overallMax = Math.max(...passStats.map(s => s.maxScore), 0.001);

  chartBox.innerHTML = passStats.map(s => {
    const heightPct = Math.min(100, Math.max(6, (s.maxScore / overallMax) * 100));
    const isP70 = s.maxScore > p70Thresh;
    const globalIdx = S.passes.findIndex(p => p.id === s.pass.id);
    return `
      <div class="op-bar-item ${isP70 ? 'is-p70' : ''}" data-pass-id="${s.pass.id}" data-pass-idx="${globalIdx}" data-date="${fmtDate(s.pass.id)}" data-score="${N(s.maxScore, 4)}" data-p70="${isP70}">
        <div class="op-bar-fill" style="height:${heightPct.toFixed(1)}%"></div>
      </div>
    `;
  }).join('');

  chartBox.querySelectorAll('.op-bar-item').forEach(item => {
    item.onclick = () => {
      const idx = +item.dataset.passIdx;
      if (idx >= 0) selectPass(idx);
    };
    item.onmouseenter = e => {
      const date = item.dataset.date;
      const score = item.dataset.score;
      const isP70 = item.dataset.p70 === 'true';
      const html = `<div style="font-weight:700;color:#FFF;font-size:11px">${date}</div>
                    <div style="font-size:10.5px;color:rgba(238,245,249,0.85);margin-top:2px">Skor Siaga 1: <b style="color:var(--sonar)">${score}</b> ${isP70 ? '⚡' : ''}</div>`;
      showGlobalBarTooltip(e, html);
    };
    item.onmouseleave = hideGlobalBarTooltip;
  });

  if (S.passes && S.passes[S.passIdx]) {
    highlightSiaga1ChartBar(S.passes[S.passIdx].id);
  }
}

function highlightSiaga1ChartBar(passId){
  const chartBox = document.getElementById('opSiaga1BarChart');
  const labelActive = document.getElementById('opChartActiveLabel');
  if (!chartBox) return;

  let activeBar = null;
  chartBox.querySelectorAll('.op-bar-item').forEach(bar => {
    if (bar.dataset.passId === passId) {
      bar.classList.add('is-active');
      activeBar = bar;
    } else {
      bar.classList.remove('is-active');
    }
  });

  if (activeBar) {
    const doCenter = () => {
      const cWidth = chartBox.clientWidth;
      if (cWidth > 0) {
        const barLeft = activeBar.offsetLeft;
        const barWidth = activeBar.offsetWidth;
        const targetLeft = barLeft - (cWidth / 2) + (barWidth / 2);
        chartBox.scrollLeft = Math.max(0, targetLeft);
      }
    };
    doCenter();
    requestAnimationFrame(doCenter);
    setTimeout(doCenter, 40);
    setTimeout(doCenter, 150);
  }

  if (labelActive) {
    const s1Items = S.top10.filter(t => t.pass === passId && t.tier && (t.tier.includes('SIAGA 1') || t.tier.includes('VERIFIKASI')));
    const maxScore = s1Items.length ? Math.max(...s1Items.map(x => x.score)) : 0;
    labelActive.textContent = `${fmtDate(passId)} · Skor Siaga 1: ${N(maxScore, 4)}`;
  }
}

function drawOpList(pass, tier, onlyConf){
  let items = S.top10.filter(t=>t.pass===pass);
  if(tier!=='all') items = items.filter(t=>tierNum(t.tier)===+tier);
  if(onlyConf) items = items.filter(t=>t.conformal===1);
  items.sort((a,b)=>a.rank-b.rank);

  const box = document.getElementById('opList');
  if(!items.length){ box.innerHTML = '<p class="loading">Tidak ada kapal yang cocok dengan filter ini.</p>'; return; }

  box.innerHTML = items.map(t=>{
    const shap = (t.shap||[]).map(s=>{
      const m = s.match(/kontribusi ([+-][\d.]+)/);
      const val = m ? parseFloat(m[1]) : 0;
      const widthPct = Math.min(100, Math.max(6, (Math.abs(val) / 2.2) * 100));
      const col = val > 0 ? '#FF6B45' : '#1477B8';
      return `<div class="shap-row"><div>${s.split(' (')[0]}
        <div class="shap-bar"><i style="width:${widthPct.toFixed(1)}%;background:${col}"></i></div></div>
        <span class="mono" style="color:${col}">${val>0?'+':''}${val.toFixed(4)}</span></div>`;
    }).join('');
    const p70 = isP70S1(t);
    return `<div class="op-item ${p70 ? 'is-p70-item' : ''}">
      <div class="op-rank ${p70 ? 'is-p70-rank' : ''}">${String(t.rank).padStart(2,'0')}</div>
      <div class="op-main">
        <h4>Deteksi #${t.row_id} · ${catOf(t.ais===0?'unmatched':t.cat).label}</h4>
        <div class="op-coord">${coord(t.lat,t.lon)} · ${new Date(t.ts).toISOString().slice(0,16).replace('T',' ')} UTC
          · panjang ${N(t.length_m,1)} m</div>
        <div class="chip-row">
          <span class="tier-chip t${tierNum(t.tier)}">${t.tier}</span>
          ${p70 ? '<span class="tier-chip t-p70">⚡ PRIORITAS UTAMA</span>' : ''}
          ${t.conformal ? '<span class="tier-chip t3">LOLOS CONFORMAL 90%</span>' : ''}
        </div>
        <div class="shap-list">${shap || '<span class="note">Penjelasan tidak tersedia.</span>'}</div>
      </div>
      <div class="op-side">
        <div class="op-score ${p70 ? 'is-p70-score' : ''}">${N(t.score,5)}<small>SKOR RISIKO</small></div>
        <dl class="kv" style="margin-top:16px;color:var(--ink)">
          <dt style="color:var(--ink-2)">Skor ikan</dt><dd>${N(t.fscore,3)}</dd>
          <dt style="color:var(--ink-2)">Jarak MPA</dt><dd>${N(t.mpa,1)} km</dd>
          <dt style="color:var(--ink-2)">Jarak ZEE</dt><dd>${N(t.eez,1)} km</dd>
          <dt style="color:var(--ink-2)">Jarak pelabuhan</dt><dd>${N(t.port,1)} km</dd>
        </dl>
      </div>
    </div>`;
  }).join('');
}

/* statistik */
function renderStatistik(){
  const M = S.metrics || {};
  const p = M.poseidon || null;
  const cmp = M.comparison || [];
  const pos = cmp.find(r => r && r.Model && r.Model.includes('POSEIDON'));
  const d = S.meta ? S.meta.data : null;

  const lblPassCount = document.getElementById('lblPassCount');
  if(lblPassCount && d) lblPassCount.textContent = `${d.n_passes}`;
  const lblTimeSeriesYears = document.getElementById('lblTimeSeriesYears');
  if(lblTimeSeriesYears && d) lblTimeSeriesYears.textContent = `${d.date_start.slice(0,4)}–${d.date_end.slice(0,4)}`;

  if(p) document.getElementById('kpiRow').innerHTML = `
    <div class="kpi"><b>${N(p.auc,4)}</b><span>AUC-ROC</span><small>0,5 = tebakan acak</small></div>
    <div class="kpi"><b>${N(p.auprc,5)}</b><span>AUPRC</span><small>dasar ${N(p.baseline_rate,6)}</small></div>
    <div class="kpi"><b>${N(p.lift,1)}×</b><span>Lift</span><small>terhadap pemilihan acak</small></div>
    <div class="kpi"><b>${pos?N(pos['Alert Eff (Top10/cycle)']*100,1)+'%':'—'}</b><span>Alert Efficiency</span><small>recall sepuluh besar per siklus</small></div>
    <div class="kpi"><b>${p.rank.in_top_1pct}/${p.n_positive}</b><span>Kasus di 1% teratas</span><small>median peringkat ${NF(p.rank.median)}</small></div>`;

  if(cmp.length){
    const cols = ['AUC-ROC','AUPRC','Lift','P@10','P@50','P@100','Alert Eff (Top10/cycle)'];
    const head = `<thead><tr><th>Model</th>${cols.map(c=>`<th>${c.replace(' (Top10/cycle)','')}</th>`).join('')}</tr></thead>`;
    const body = cmp.map(r=>{
      const on = r.Model.includes('POSEIDON');
      return `<tr class="${on?'is-poseidon':''}"><td>${r.Model}</td>${cols.map(c=>{
        const v = r[c];
        if(v===null||v===undefined) return '<td>—</td>';
        if(c==='Lift') return `<td>${N(v,1)}×</td>`;
        if(c==='AUPRC') return `<td>${N(v,6)}</td>`;
        if(c.startsWith('Alert')) return `<td>${N(v*100,1)}%</td>`;
        if(c.startsWith('P@')) return `<td>${N(v,4)}</td>`;
        return `<td>${N(v,4)}</td>`;
      }).join('')}</tr>`;
    }).join('');
    document.getElementById('cmpTable').innerHTML = head + `<tbody>${body}</tbody>`;
  }

  drawTimeSeries();

  if(p) drawAtK(p.at_k);
  if(M.pr_curve) drawCurve('prChart', M.pr_curve, 'Recall', 'Precision', true);
  if(M.tradeoff) drawTradeoff(M.tradeoff);
  if(M.feature_importance) drawImportance(M.feature_importance);
  if(M.conformal) drawConformal(M.conformal);
  drawAblation(M);
}

function exportPassData(passId, format){
  const items = S.top10.filter(t => t.pass === passId).sort((a,b) => a.rank - b.rank);
  if(!items.length){ alert('Data prioritas tidak tersedia untuk siklus ini.'); return; }
  if(format === 'geojson'){
    const geojson = {
      type: "FeatureCollection",
      features: items.map(t => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [t.lon, t.lat] },
        properties: {
          rank: t.rank,
          pass: t.pass,
          row_id: t.row_id,
          score: t.score,
          tier: t.tier,
          conformal: t.conformal === 1,
          timestamp: t.ts,
          length_m: t.length_m,
          category: t.cat,
          ais: t.ais,
          shap_drivers: t.shap || []
        }
      }))
    };
    downloadBlob(JSON.stringify(geojson, null, 2), `poseidon_priorities_${passId}.geojson`, 'application/json');
  } else if(format === 'csv'){
    const headers = ['rank','pass','row_id','latitude','longitude','score','tier','conformal','timestamp','length_m','category','ais'];
    const rows = items.map(t => [
      t.rank, t.pass, t.row_id, t.lat, t.lon, t.score, `"${t.tier}"`, t.conformal, `"${t.ts}"`, t.length_m, `"${t.cat}"`, t.ais
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    downloadBlob(csv, `poseidon_priorities_${passId}.csv`, 'text/csv');
  }
}

function downloadBlob(content, filename, contentType){
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function drawTimeSeries(){
  if(!S.passes.length) return;
  const monthly = {};
  S.passes.forEach(p => {
    const ym = p.id.slice(0, 7);
    if(!monthly[ym]) monthly[ym] = { total: 0, dark: 0, count: 0 };
    monthly[ym].total += p.n;
    monthly[ym].dark += p.n_dark;
    monthly[ym].count += 1;
  });
  const keys = Object.keys(monthly).sort();
  const pts = keys.map(k => ({ ym: k, dark: monthly[k].dark, total: monthly[k].total }));
  const W = 880, H = 290, L = 68, R = 24, T = 18, B = 60, iw = W - L - R, ih = H - T - B;
  const maxDark = Math.max(...pts.map(p => p.dark)) * 1.1;
  let s = svgEl(W, H);
  [0, 0.25, 0.5, 0.75, 1].forEach(f => {
    const y = T + ih - f * ih;
    s += `<line class="gl" x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/>
          <text x="${L-10}" y="${y+4}" text-anchor="end" style="font-size:11.5px">${Math.round(maxDark * f)}</text>`;
  });
  const pathD = pts.map((p, i) => `${i ? 'L' : 'M'}${(L + i * (iw / (pts.length - 1))).toFixed(1)} ${(T + ih - (p.dark / maxDark) * ih).toFixed(1)}`).join(' ');
  s += `<path class="ln" d="${pathD}" style="stroke:var(--flare);stroke-width:2.2"/>`;
  pts.forEach((p, i) => {
    if(i % 3 === 0){
      const x = L + i * (iw / (pts.length - 1));
      s += `<text x="${x}" y="${T+ih+22}" text-anchor="middle" style="font-size:11.5px">${p.ym}</text>`;
    }
  });
  s += `<line class="ax" x1="${L}" y1="${T+ih}" x2="${W-R}" y2="${T+ih}"/>
        <text x="${L+iw/2}" y="${H-10}" text-anchor="middle" style="font-size:12.5px;font-weight:500">Bulan (2023–2025)</text>
        <text x="18" y="${T+ih/2}" text-anchor="middle" transform="rotate(-90 18 ${T+ih/2})" style="font-size:12.5px;font-weight:500">Kapal Tanpa AIS</text></svg>`;
  const container = document.getElementById('timeSeriesChart');
  if(container) container.innerHTML = s;
}

function svgEl(w,h){
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;
}

function drawAtK(rows){
  const W=520, H=280, L=60, R=16, T=16, B=44, iw=W-L-R, ih=H-T-B;
  const max = Math.max(...rows.map(r=>r.precision));
  const bw = iw/rows.length*.62;
  let s = svgEl(W,H);
  [0,.25,.5,.75,1].forEach(f=>{
    const y = T+ih-f*ih;
    s += `<line class="gl" x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/>
          <text x="${L-8}" y="${y+4}" text-anchor="end" style="font-size:11.5px">${(max*f).toFixed(2)}</text>`;
  });
  rows.forEach((r,i)=>{
    const x = L + (i+.5)*iw/rows.length - bw/2;
    const h = (r.precision/max)*ih;
    s += `<rect class="bar" x="${x}" y="${T+ih-h}" width="${bw}" height="${Math.max(h,1)}" rx="1"/>
          <text x="${x+bw/2}" y="${T+ih+16}" text-anchor="middle" style="font-size:11.5px">K=${r.k}</text>
          <text x="${x+bw/2}" y="${T+ih-h-6}" text-anchor="middle" style="fill:var(--flare);font-size:12px;font-weight:700">${r.hits}</text>`;
  });
  s += `<line class="ax" x1="${L}" y1="${T+ih}" x2="${W-R}" y2="${T+ih}"/>
        <text x="${L}" y="${H-6}" style="font-size:11.5px;fill:var(--ink-2)">Angka di atas batang = jumlah kasus terkonfirmasi yang tertangkap</text></svg>`;
  document.getElementById('atkChart').innerHTML = s;
}

function drawCurve(id, pts, xl, yl, logy){
  const W=520, H=280, L=76, R=16, T=16, B=44, iw=W-L-R, ih=H-T-B;
  const ys = pts.map(p=>p[1]).filter(v=>v>0);
  const ymax = Math.max(...ys), ymin = Math.max(Math.min(...ys), 1e-5);
  const yf = v => logy
    ? T+ih - (Math.log10(Math.max(v,ymin))-Math.log10(ymin))/(Math.log10(ymax)-Math.log10(ymin))*ih
    : T+ih - (v/ymax)*ih;
  let s = svgEl(W,H);
  [0,.25,.5,.75,1].forEach(f=>{
    const y = T+ih-f*ih;
    const val = logy ? Math.pow(10, Math.log10(ymin)+f*(Math.log10(ymax)-Math.log10(ymin))) : ymax*f;
    s += `<line class="gl" x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/>
          <text x="${L-10}" y="${y+4}" text-anchor="end" style="font-size:11.5px">${val<.01?val.toExponential(1):val.toFixed(3)}</text>`;
  });
  const d = pts.map((p,i)=>`${i?'L':'M'}${(L+p[0]*iw).toFixed(1)} ${yf(p[1]).toFixed(1)}`).join(' ');
  s += `<path class="ln" d="${d}"/>
        <line class="ax" x1="${L}" y1="${T+ih}" x2="${W-R}" y2="${T+ih}"/>
        <text x="${L+iw/2}" y="${H-6}" text-anchor="middle" style="font-size:12px">${xl}</text>
        <text x="18" y="${T+ih/2}" text-anchor="middle" transform="rotate(-90 18 ${T+ih/2})" style="font-size:12px">${yl}</text></svg>`;
  document.getElementById(id).innerHTML = s;
}

function drawTradeoff(rows){
  const W=880, H=300, L=72, R=110, T=20, B=46, iw=W-L-R, ih=H-T-B;
  const xmax = Math.max(...rows.map(r=>r.pct_flagged))*1.06;
  let s = svgEl(W,H);
  [0,.25,.5,.75,1].forEach(f=>{
    const y = T+ih-f*ih;
    s += `<line class="gl" x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/>
          <text x="${L-10}" y="${y+4}" text-anchor="end" style="font-size:11.5px">${Math.round(f*100)}%</text>`;
  });
  const pts = rows.map(r=>[L + r.pct_flagged/xmax*iw, T+ih - r.coverage*ih]);
  s += `<path class="ln" d="${pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')}"/>`;
  rows.forEach((r,i)=>{
    const [x,y] = pts[i];
    s += `<circle class="dot" cx="${x}" cy="${y}" r="5"/>
          <text x="${x+9}" y="${y-8}" style="fill:var(--ink);font-size:12px">${r.per_cycle} kapal/siklus</text>
          <text x="${x+9}" y="${y+6}" style="font-size:11.5px">α=${r.alpha}</text>`;
  });
  s += `<line class="ax" x1="${L}" y1="${T+ih}" x2="${W-R}" y2="${T+ih}"/>
        <text x="${L+iw/2}" y="${H-8}" text-anchor="middle" style="font-size:12px">Persentase deteksi yang harus diperiksa tiap siklus</text>
        <text x="18" y="${T+ih/2}" text-anchor="middle" transform="rotate(-90 18 ${T+ih/2})" style="font-size:12px">Jaminan cakupan</text></svg>`;
  document.getElementById('tradeChart').innerHTML = s;
}

function drawImportance(rows){
  const SHORT_LABELS = {
    "fishing_score": "Skor aktivitas ikan",
    "dist_to_nearest_seizure_km": "Jarak penindakan historis",
    "dist_to_nearest_mpa_km": "Jarak kawasan konservasi",
    "matching_score": "Pencocokan AIS",
    "radar_intensity_diff": "Selisih intensitas VV-VH",
    "area_dark_flag": "Area rawan kapal tanpa AIS",
    "area_dark_count_30d": "Kapal tanpa AIS di sekitar (30h)",
    "historical_hotspot": "Hotspot historis"
  };

  const top = rows;
  const W=520, rh=24, H=top.length*rh+38, L=185, R=50;
  const max = Math.max(...top.map(r=>r.gain_pct));
  let s = svgEl(W,H);
  top.forEach((r,i)=>{
    const lbl = SHORT_LABELS[r.feature] || r.label || r.feature;
    const y = i*rh+14, w = (r.gain_pct/max)*(W-L-R);
    s += `<text x="${L-10}" y="${y+12}" text-anchor="end" style="font-size:11.5px">${lbl}</text>
          <rect class="bar dim${r.dimension}" x="${L}" y="${y+2}" width="${Math.max(w,1)}" height="14" rx="2"/>
          <text x="${L+w+8}" y="${y+13}" style="font-size:11.5px">${N(r.gain_pct,1)}%</text>`;
  });
  s += `<line class="ax" x1="${L}" y1="${H-22}" x2="${W-R}" y2="${H-22}"/>
        <text x="${L}" y="${H-6}" style="font-size:11.5px;fill:var(--ink-2)">Warna batang menandai dimensi A / B / C / D</text></svg>`;
  document.getElementById('impChart').innerHTML = s;
}

function drawConformal(c){
  document.getElementById('confPanel').innerHTML = `
    <div class="conf-grid">
      <div class="conf-item"><span>Target cakupan yang ditetapkan</span><b>${N(c.target_coverage*100,0)}%</b></div>
      <div class="conf-item"><span>Cakupan terukur pada ${c.n_holdout} kasus uji terpisah</span><b>${N(c.coverage_holdout*100,1)}%</b></div>
      <div class="conf-item"><span>Selang kepercayaan 95% cakupan terukur</span><b>${N(c.ci_low*100,0)}–${N(c.ci_high*100,0)}%</b></div>
      <div class="conf-item"><span>Peluang hasil ini muncul jika target benar-benar terpenuhi</span><b>${N(c.p_value_vs_target*100,0)}%</b></div>
      <div class="conf-item"><span>Alarm palsu pada kapal niaga terverifikasi</span><b>${N(c.false_alarm_rn*100,3)}%</b></div>
      <div class="conf-item"><span>Ditandai pada 2025</span><b>${NF(c.flagged_2025)}</b></div>
    </div>
    <p class="note">Cakupan divalidasi pada ${c.n_holdout} kasus yang tidak dipakai saat kalibrasi. Hasil ${N(c.coverage_holdout*100,1)}% tidak menyimpang secara signifikan dari target ${N(c.target_coverage*100,0)}%, dengan mempertimbangkan ukuran sampel yang kecil.</p>`;
}

function drawAblation(M){
  let html = '<div class="abl-grid">';
  (M.ablation_components||[]).forEach(a=>{
    html += `<div class="abl-card"><b>${N(a.auc,4)}</b><span>${a.name} · AUC</span>
             <div class="mono" style="font-size:11px;color:var(--ink-2);margin-top:6px">AUPRC ${N(a.auprc,6)}</div></div>`;
  });
  const s = M.ablation_seizure_feature;
  if(s){
    html += `<div class="abl-card" style="border-color:var(--flare)">
      <b>${N(s.without_auc,4)}</b><span>Tanpa fitur jarak ke penindakan · AUC</span>
      <div class="mono" style="font-size:11px;color:var(--ink-2);margin-top:6px">dengan fitur: ${N(s.with_auc,4)}</div></div>`;
  }
  html += '</div>';
  if(s) html += `<p class="note">Menghapus fitur jarak ke lokasi penindakan historis menurunkan AUC dari ${N(s.with_auc,4)} ke ${N(s.without_auc,4)}, namun tetap di atas seluruh model pembanding. Performa tidak bergantung pada fitur yang berkorelasi dengan proses pembentukan label.</p>`;
  document.getElementById('ablPanel').innerHTML = html;
}

function centerActiveSparklineBar() {
  const box = document.getElementById('timelineSparkline');
  if (!box) return;
  const activeBar = box.querySelector('.sparkline-bar.is-active');
  if (activeBar && box.offsetWidth > 0) {
    box.scrollLeft = activeBar.offsetLeft - (box.offsetWidth / 2) + (activeBar.offsetWidth / 2);
  }
}

function renderTimelineSparkline() {
  const box = document.getElementById('timelineSparkline');
  if (!box || !S.passes.length) return;
  const maxDark = Math.max(...S.passes.map(p => p.n_dark || 1));
  box.innerHTML = S.passes.map((p, i) => {
    const pct = Math.min(100, Math.max(8, ((p.n_dark || 0) / maxDark) * 100));
    const isActive = i === S.passIdx;
    return `<div class="sparkline-bar ${isActive ? 'is-active' : ''}" data-pass-idx="${i}" data-date="${fmtDate(p.id)}" data-count="${p.n_dark || 0}" style="height:${pct}%"></div>`;
  }).join('');
  box.querySelectorAll('.sparkline-bar').forEach(b => {
    b.onclick = () => selectPass(+b.dataset.passIdx);
    b.onmouseenter = e => {
      const date = b.dataset.date;
      const count = b.dataset.count;
      const html = `<div style="font-weight:700;color:#FFF;font-size:11px">${date}</div>
                    <div style="font-size:10.5px;color:rgba(238,245,249,0.85);margin-top:2px">Kapal Tanpa AIS: <b style="color:var(--sonar)">${count}</b></div>`;
      showGlobalBarTooltip(e, html);
    };
    b.onmouseleave = hideGlobalBarTooltip;
  });
  centerActiveSparklineBar();
}

window.addEventListener('keydown', e => {
  const activeView = document.querySelector('.view.is-active');
  if (!activeView || activeView.id !== 'view-dashboard') return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

  if (e.code === 'Space') {
    e.preventDefault();
    toggleAutoPlay();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    selectPass(S.passIdx - 1);
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    selectPass(S.passIdx + 1);
  } else if (e.code === 'KeyF') {
    e.preventDefault();
    if (!S.passes[S.passIdx]) return;
    const top1 = S.top10.find(t => t.pass === S.passes[S.passIdx].id && t.rank === 1);
    if (top1 && MAP) {
      document.getElementById('layTop10').checked = true;
      LAYER_TOP.addTo(MAP);
      MAP.setView([top1.lat, top1.lon], 10);
    }
  } else if (e.code === 'Escape') {
    e.preventDefault();
    const searchInp = document.getElementById('mapSearchInput');
    if (searchInp) searchInp.value = '';
  }
});

boot();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', repositionNavAuth);
} else {
  repositionNavAuth();
}

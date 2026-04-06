(function() {
  'use strict';

  // ── Config ──
  const REFRESH_MS  = 2000;    // auto-refresh interval
  const MAX_BAR_MS  = 30000;   // 30s = 100% bar width
  const PANEL_KEY   = 'sb_devpanel_open';  // localStorage key for open/closed state

  // ── Colour helpers ──
  function colour(ms) {
    if (ms === null || ms === undefined) return '#484F58';
    if (ms <  500)  return '#3FB950';   // green  — fast
    if (ms < 8000)  return '#F59E0B';   // amber  — medium
    return '#F85149';                   // red    — slow
  }

  function barWidth(ms) {
    if (!ms) return 0;
    return Math.min(100, Math.round((ms / MAX_BAR_MS) * 100));
  }

  function fmt(ms) {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
  }

  // ── Build panel HTML ──
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'sb-dev-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 99999;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 11px;
      user-select: none;
    `;

    // ── Collapsed tab ──
    const tab = document.createElement('div');
    tab.id = 'sb-dev-tab';
    tab.style.cssText = `
      background: #0D1117;
      border: 1px solid #30363D;
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #E6EDF3;
      white-space: nowrap;
    `;
    tab.innerHTML = `
      <div id="sb-dot" style="width:6px;height:6px;border-radius:50%;background:#3FB950;flex-shrink:0;"></div>
      <span style="color:#8B949E;">DEV</span>
      <span id="sb-tab-time" style="color:#F59E0B;">—</span>
      <span id="sb-tab-arrow" style="color:#484F58;font-size:9px;">▼</span>
    `;
    tab.addEventListener('click', togglePanel);

    // ── Expanded panel ──
    const expanded = document.createElement('div');
    expanded.id = 'sb-dev-expanded';
    expanded.style.cssText = `
      background: #0D1117;
      border: 1px solid #30363D;
      border-radius: 8px;
      width: 300px;
      margin-top: 4px;
      overflow: hidden;
      display: none;
    `;
    expanded.innerHTML = `
      <div style="background:#161B22;border-bottom:1px solid #30363D;
                  padding:6px 10px;display:flex;align-items:center;gap:6px;">
        <div id="sb-hdr-dot" style="width:8px;height:8px;border-radius:50%;
                                     background:#3FB950;flex-shrink:0;"></div>
        <span style="color:#8B949E;flex:1;">StudyBuddy benchmark</span>
        <span style="background:#1C2128;border:1px solid #30363D;border-radius:4px;
                     padding:1px 6px;font-size:10px;color:#8B949E;">DEV</span>
        <span id="sb-close" style="color:#484F58;cursor:pointer;font-size:9px;
                                    margin-left:4px;">✕</span>
      </div>

      <div id="sb-body" style="padding:8px 0;">
        <div style="padding:6px 10px;color:#484F58;font-size:10px;">Loading metrics...</div>
      </div>

      <div style="border-top:1px solid #21262D;padding:4px 10px;
                  display:flex;align-items:center;gap:8px;color:#484F58;font-size:9px;">
        <span>auto-refresh 2s</span>
        <div style="margin-left:auto;display:flex;gap:10px;">
          <span id="sb-run-now" style="cursor:pointer;color:#388BFD;">run now</span>
          <span id="sb-clear"   style="cursor:pointer;">clear</span>
          <span id="sb-collapse" style="cursor:pointer;">▲ hide</span>
        </div>
      </div>
    `;

    panel.appendChild(tab);
    panel.appendChild(expanded);
    document.body.appendChild(panel);

    // Wire up buttons
    document.getElementById('sb-close').addEventListener('click',    closePanel);
    document.getElementById('sb-collapse').addEventListener('click', closePanel);
    document.getElementById('sb-run-now').addEventListener('click',  fetchAndRender);
    document.getElementById('sb-clear').addEventListener('click',    clearMetrics);

    // Restore open/closed state from localStorage
    const wasOpen = localStorage.getItem(PANEL_KEY) === 'true';
    if (wasOpen) openPanel();
  }

  // ── Panel open/close ──
  function togglePanel() {
    const exp = document.getElementById('sb-dev-expanded');
    if (exp.style.display === 'none') openPanel();
    else closePanel();
  }

  function openPanel() {
    document.getElementById('sb-dev-expanded').style.display = 'block';
    document.getElementById('sb-tab-arrow').textContent = '▲';
    localStorage.setItem(PANEL_KEY, 'true');
    fetchAndRender();
  }

  function closePanel() {
    document.getElementById('sb-dev-expanded').style.display = 'none';
    document.getElementById('sb-tab-arrow').textContent = '▼';
    localStorage.setItem(PANEL_KEY, 'false');
  }

  // ── Fetch metrics and render ──
  async function fetchAndRender() {
    try {
      const res  = await fetch('/dev/metrics');
      const data = await res.json();
      updateTab(data);
      renderBody(data);
    } catch {
      document.getElementById('sb-tab-time').textContent = 'ERR';
      document.getElementById('sb-tab-time').style.color = '#F85149';
    }
  }

  function updateTab(data) {
    const ms  = data.lastRequestMs;
    const tab = document.getElementById('sb-tab-time');
    if (tab) {
      tab.textContent = fmt(ms);
      tab.style.color = colour(ms);
    }
    // Update status dot colour
    const dot    = document.getElementById('sb-dot');
    const hdrDot = document.getElementById('sb-hdr-dot');
    const dotCol = data.totalErrors > 0 ? '#F85149' : '#3FB950';
    if (dot)    dot.style.background    = dotCol;
    if (hdrDot) hdrDot.style.background = dotCol;
  }

  function renderBody(data) {
    const body = document.getElementById('sb-body');
    if (!body) return;

    // Route order for display
    const routeOrder = ['/estimate', '/chat', '/quiz', '/agent', '/progress'];
    const routeMap   = {};
    data.routes.forEach(r => routeMap[r.route] = r);

    // Build rows for known routes + any others seen
    const allRoutes = [
      ...routeOrder.filter(r => routeMap[r]),
      ...data.routes.filter(r => !routeOrder.includes(r.route)).map(r => r.route)
    ];

    // Summary stats row
    let html = `
      <div style="display:flex;gap:1px;padding:4px 10px 6px;">
        ${statCell(fmt(data.lastRequestMs), 'last req', colour(data.lastRequestMs))}
        ${statCell(data.totalCacheHits,     'cache hits', '#3FB950')}
        ${statCell(data.totalRequests,      'requests',  '#8B949E')}
        ${statCell(data.totalErrors,        'errors',    data.totalErrors > 0 ? '#F85149' : '#8B949E')}
      </div>

      <div style="border-top:1px solid #21262D;"></div>
      <div style="font-size:9px;color:#484F58;padding:4px 10px 2px;
                  text-transform:uppercase;letter-spacing:.08em;">routes — last 60s</div>
    `;

    // Route rows
    for (const route of allRoutes) {
      const r = routeMap[route];
      if (!r) continue;
      const isAgent  = route === '/agent';
      const label    = route + (r.cacheHits > 0 ? ' ✦' : '');
      html += metricRow(label, r.last, r.avg, r.count, isAgent);
    }

    // Tool breakdown
    if (data.toolBreakdown && data.toolBreakdown.length > 0) {
      html += `
        <div style="border-top:1px solid #21262D;margin-top:4px;"></div>
        <div style="font-size:9px;color:#484F58;padding:4px 10px 2px;
                    text-transform:uppercase;letter-spacing:.08em;">tool breakdown — last agent</div>
      `;
      for (const t of data.toolBreakdown) {
        html += toolRow(t.tool, t.ms, t.cached);
      }
    }

    // Uptime footer
    html += `
      <div style="border-top:1px solid #21262D;margin-top:4px;"></div>
      <div style="font-size:9px;color:#484F58;padding:4px 10px;display:flex;gap:8px;">
        <span>uptime ${formatUptime(data.uptime)}</span>
        <span style="margin-left:auto;">${new Date().toLocaleTimeString()}</span>
      </div>
    `;

    body.innerHTML = html;
  }

  // ── HTML helpers ──

  function statCell(val, label, col) {
    return `
      <div style="flex:1;background:#161B22;border:1px solid #21262D;border-radius:4px;
                  padding:4px 6px;text-align:center;margin:0 1px;">
        <div style="font-size:12px;font-weight:600;color:${col};">${val}</div>
        <div style="font-size:9px;color:#484F58;margin-top:1px;">${label}</div>
      </div>
    `;
  }

  function metricRow(label, lastMs, avgMs, count, highlight) {
    const c     = colour(lastMs);
    const bw    = barWidth(lastMs);
    const border = highlight ? 'border-left:2px solid #388BFD;' : '';
    return `
      <div style="display:flex;align-items:center;padding:3px 10px;gap:6px;
                  ${border}cursor:default;"
           title="avg: ${fmt(avgMs)} | calls: ${count}">
        <span style="color:#8B949E;flex:1;font-size:10px;overflow:hidden;
                     text-overflow:ellipsis;white-space:nowrap;">${label}</span>
        <div style="width:64px;height:3px;background:#21262D;border-radius:2px;flex-shrink:0;">
          <div style="width:${bw}%;height:3px;border-radius:2px;background:${c};"></div>
        </div>
        <span style="font-size:10px;min-width:44px;text-align:right;color:${c};">
          ${fmt(lastMs)}
        </span>
      </div>
    `;
  }

  function toolRow(name, ms, cached) {
    const c  = ms ? colour(ms) : '#3FB950';
    const bw = ms ? barWidth(ms) : 1;
    const label = name.replace(/_/g, '_​');   // zero-width space for wrapping
    const suffix = cached ? ' ✦' : '';
    return `
      <div style="display:flex;align-items:center;padding:2px 10px 2px 18px;gap:6px;">
        <span style="color:#484F58;flex:1;font-size:10px;">${label}${suffix}</span>
        <div style="width:64px;height:3px;background:#21262D;border-radius:2px;flex-shrink:0;">
          <div style="width:${bw}%;height:3px;border-radius:2px;background:${c};"></div>
        </div>
        <span style="font-size:10px;min-width:44px;text-align:right;color:${c};">
          ${ms ? fmt(ms) : 'sync'}
        </span>
      </div>
    `;
  }

  function formatUptime(secs) {
    if (secs < 60)   return secs + 's';
    if (secs < 3600) return Math.floor(secs / 60) + 'm ' + (secs % 60) + 's';
    return Math.floor(secs / 3600) + 'h ' + Math.floor((secs % 3600) / 60) + 'm';
  }

  // ── Clear metrics ──
  async function clearMetrics() {
    await fetch('/dev/metrics', { method: 'DELETE' });
    fetchAndRender();
  }

  // ── Auto-refresh loop ──
  function startAutoRefresh() {
    setInterval(() => {
      // Only fetch if panel is expanded — no background polling when collapsed
      const exp = document.getElementById('sb-dev-expanded');
      if (exp && exp.style.display !== 'none') {
        fetchAndRender();
      } else {
        // Still update the tab time even when collapsed
        fetch('/dev/metrics')
          .then(r => r.json())
          .then(updateTab)
          .catch(() => {});
      }
    }, REFRESH_MS);
  }

  // ── Keyboard shortcut: Ctrl+Shift+B toggles panel ──
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
      e.preventDefault();
      togglePanel();
    }
  });

  // ── Init ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createPanel();
      startAutoRefresh();
    });
  } else {
    createPanel();
    startAutoRefresh();
  }

})();

/**
 * TypoGuard Popup (Phases 6 + 9)
 * Editors tab: editors with captured text + restore into the active tab.
 * History tab: all captures across editors, newest first, with export.
 *
 * Security note: ALL text rendered here passes through escapeHtml() —
 * captured text comes from arbitrary web pages, so treating it as HTML
 * would let a page inject markup into the popup.
 */

let allCaptures = {};
let allMetadata = {};
let selectedEditorId = null;
let currentTab = 'editors';

const editorListEl = document.getElementById('editor-list');
const historyItemsEl = document.getElementById('history-items');
const historyListEl = document.getElementById('history-list');
const statsEl = document.getElementById('stats');
const emptyStateEl = document.getElementById('empty-state');
const noCapturesEl = document.getElementById('no-captures');
const btnExport = document.getElementById('btn-export');
const btnClearSelected = document.getElementById('btn-clear-selected');
const btnClearAll = document.getElementById('btn-clear-all');

/** Escape arbitrary text for safe insertion via innerHTML. */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function editorsWithData() {
  return Object.keys(allCaptures).filter(
    (id) => Array.isArray(allCaptures[id]) && allCaptures[id].length > 0
  );
}

async function loadData() {
  const result = await chrome.storage.local.get(['tg_captures', 'tg_metadata']);
  allCaptures = result.tg_captures || {};
  allMetadata = result.tg_metadata || {};
}

function latestCapture(editorId) {
  const captures = allCaptures[editorId];
  if (!Array.isArray(captures) || captures.length === 0) return null;
  // storage.js keeps captures chronological (oldest first) — last is latest
  return captures[captures.length - 1];
}

function render() {
  const ids = editorsWithData();
  const totalCaptures = ids.reduce((sum, id) => sum + allCaptures[id].length, 0);
  statsEl.textContent = `${ids.length} editor${ids.length === 1 ? '' : 's'} · ${totalCaptures} capture${totalCaptures === 1 ? '' : 's'}`;

  const hasData = ids.length > 0;
  emptyStateEl.style.display = hasData ? 'none' : 'block';
  btnExport.classList.toggle('hidden', !hasData);
  btnClearSelected.classList.toggle('hidden', currentTab !== 'editors' || !selectedEditorId);

  if (currentTab === 'editors') {
    editorListEl.classList.toggle('hidden', !hasData);
    historyListEl.classList.add('hidden');
    renderEditors(ids);
  } else {
    editorListEl.classList.add('hidden');
    historyListEl.classList.toggle('hidden', !hasData);
    renderHistory(ids);
  }
}

function renderEditors(ids) {
  let html = '';
  for (const id of ids) {
    const captures = allCaptures[id];
    const meta = allMetadata[id] || {};
    const recent = captures.slice(-2).reverse(); // newest first
    html += `
      <div class="editor-item ${selectedEditorId === id ? 'active' : ''}" data-editor-id="${escapeHtml(id)}">
        <div class="editor-header">
          <div class="editor-id">${escapeHtml(id)}</div>
          <span class="editor-type">${escapeHtml(meta.editorType || 'textarea')}</span>
        </div>
        <div class="editor-url">${escapeHtml(meta.pageUrl || 'unknown')}</div>
        <div class="captures-list">
          ${recent.map((c) => `
            <div class="capture-item">
              <div class="capture-header"><span>${escapeHtml(new Date(c.timestamp).toLocaleTimeString())}</span><span>${c.text.length} chars</span></div>
              <div class="capture-text">${escapeHtml(c.text.substring(0, 120))}${c.text.length > 120 ? '…' : ''}</div>
            </div>`).join('')}
          ${captures.length > 2 ? `<div style="font-size:10px;color:var(--text-muted);">+${captures.length - 2} older captures</div>` : ''}
        </div>
        <button class="btn-restore" data-restore-id="${escapeHtml(id)}">${selectedEditorId === id ? 'Restore Again' : 'Restore Latest Text'}</button>
      </div>`;
  }
  editorListEl.innerHTML = html;
}

function renderHistory(ids) {
  const entries = [];
  for (const id of ids) {
    const meta = allMetadata[id] || {};
    for (const c of allCaptures[id]) {
      entries.push({
        id,
        text: c.text,
        timestamp: c.timestamp,
        pageUrl: c.pageUrl || meta.pageUrl || 'unknown',
        editorType: c.editorType || meta.editorType || 'textarea',
      });
    }
  }
  entries.sort((a, b) => b.timestamp - a.timestamp);

  if (entries.length === 0) {
    historyItemsEl.innerHTML = '<p class="no-captures">No captures found</p>';
    return;
  }

  historyItemsEl.innerHTML = entries.map((e) => `
    <div class="history-item" data-restore-id="${escapeHtml(e.id)}" title="Click to restore into the active tab">
      <div class="history-meta">
        <span>${escapeHtml(new Date(e.timestamp).toLocaleString())}</span>
        <span>${e.text.length} chars · ${escapeHtml(e.editorType)}</span>
      </div>
      <div class="history-text">${escapeHtml(e.text.substring(0, 100))}${e.text.length > 100 ? '…' : ''}</div>
      <div class="history-meta"><span>${escapeHtml(e.pageUrl)}</span></div>
    </div>`).join('');
}

/** Restore text into the matching editor on the active tab. */
async function restoreEditor(editorId) {
  const latest = latestCapture(editorId);
  if (!latest) return;
  selectedEditorId = editorId;
  render();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(
    tab.id,
    { action: 'typoguard-restore', editorId, text: latest.text },
    () => {
      if (chrome.runtime.lastError) {
        console.log('Restore not available:', chrome.runtime.lastError.message);
      }
    }
  );
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  render();
}

async function clearAllData() {
  if (!confirm('Delete ALL saved text? This cannot be undone.')) return;
  await chrome.storage.local.remove(['tg_captures', 'tg_metadata']);
  allCaptures = {};
  allMetadata = {};
  selectedEditorId = null;
  render();
}

async function clearSelectedEditor() {
  if (!selectedEditorId) return;
  if (!confirm(`Delete all saved text for ${selectedEditorId}?`)) return;
  delete allCaptures[selectedEditorId];
  delete allMetadata[selectedEditorId];
  await chrome.storage.local.set({ tg_captures: allCaptures, tg_metadata: allMetadata });
  selectedEditorId = null;
  render();
}

function exportHistory() {
  const ids = editorsWithData();
  const payload = {
    exportedAt: new Date().toISOString(),
    editors: ids.map((id) => ({
      editorId: id,
      metadata: allMetadata[id] || {},
      captures: allCaptures[id],
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `typoguard-history-${Date.now()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Wire up static listeners
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Delegated clicks for dynamically rendered editor/history items
document.body.addEventListener('click', (event) => {
  const restoreTarget = event.target.closest('[data-restore-id]');
  if (restoreTarget) {
    event.stopPropagation();
    restoreEditor(restoreTarget.dataset.restoreId);
    return;
  }
  const editorItem = event.target.closest('.editor-item');
  if (editorItem && currentTab === 'editors') {
    selectedEditorId = editorItem.dataset.editorId || null;
    noCapturesEl.style.display = selectedEditorId ? 'none' : 'block';
    render();
  }
});

btnClearAll.addEventListener('click', clearAllData);
btnClearSelected.addEventListener('click', clearSelectedEditor);
btnExport.addEventListener('click', exportHistory);

// Init
loadData().then(render);

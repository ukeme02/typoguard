/**
 * TypoGuard — Popup Recovery UI
 * Phase 6
 *
 * Displays captured editors and allows restoring text to active tabs.
 */

// State
let allCaptures = {};
let allMetadata = {};
let selectedEditorId = null;

// DOM elements
const editorListEl = document.getElementById('editor-list');
const emptyStateEl = document.getElementById('empty-state');
const noCapturesEl = document.getElementById('no-captures');
const statsEl = document.getElementById('stats');
const btnClearAll = document.getElementById('btn-clear-all');

// Initialize
async function init() {
  await loadData();
  render();

  // Clear all button
  btnClearAll.addEventListener('click', async () => {
    if (!confirm('Delete all saved text? This cannot be undone.')) return;
    try {
      await chrome.storage.local.remove(['tg_captures', 'tg_metadata']);
      allCaptures = {};
      allMetadata = {};
      selectedEditorId = null;
      render();
    } catch (err) {
      alert('Error clearing data: ' + err.message);
    }
  });
}

async function loadData() {
  const result = await chrome.storage.local.get(['tg_captures', 'tg_metadata']);
  allCaptures = result.tg_captures || {};
  allMetadata = result.tg_metadata || {};
}

function render() {
  const editorIds = Object.keys(allCaptures).filter(id => allCaptures[id] && allCaptures[id].length > 0);

  // Update stats
  const totalCaptures = Object.values(allCaptures).reduce((sum, arr) => sum + arr.length, 0);
  statsEl.textContent = `${editorIds.length} editors · ${totalCaptures} captures`;

  // Show empty state if no data
  if (editorIds.length === 0) {
    emptyStateEl.style.display = 'block';
    editorListEl.style.display = 'none';
    noCapturesEl.style.display = 'none';
    return;
  }

  emptyStateEl.style.display = 'none';
  editorListEl.style.display = 'block';

  // Render editor list
  editorListEl.innerHTML = '';
  for (const editorId of editorIds) {
    const captures = allCaptures[editorId];
    const meta = allMetadata[editorId] || {};
    const latest = captures[captures.length - 1];
    const item = document.createElement('div');
    item.className = `editor-item${selectedEditorId === editorId ? ' active' : ''}`;
    item.innerHTML = `
      <div class="editor-header">
        <div class="editor-id">${editorId}</div>
        <span class="editor-type">${meta.editorType || 'textarea'}</span>
      </div>
      <div class="editor-url">${meta.pageUrl || 'unknown page'}</div>
      <div class="captures-list">
        ${captures.slice(-3).map(c => `
          <div class="capture-item">
            <div class="capture-header">
              <span>${new Date(c.timestamp).toLocaleTimeString()}</span>
              <span>${c.text.length} chars</span>
            </div>
            <div class="capture-text">${escapeHtml(c.text.substring(0, 200))}${c.text.length > 200 ? '…' : ''}</div>
          </div>
        `).join('')}
        ${captures.length > 3 ? `<div style="font-size:11px;color:var(--text-muted);">+${captures.length - 3} more</div>` : ''}
      </div>
      <button class="btn-restore" onclick="selectEditor('${editorId}')">${selectedEditorId === editorId ? 'Selected' : 'Restore Text'}</button>
    `;
    item.onclick = (e) => {
      if (!e.target.classList.contains('btn-restore')) selectEditor(editorId);
    };
    editorListEl.appendChild(item);
  }

  // Show selected editor's captures or default to first
  if (selectedEditorId && allCaptures[selectedEditorId]) {
    noCapturesEl.style.display = 'none';
  } else if (editorIds.length > 0) {
    selectEditor(editorIds[0]);
  } else {
    noCapturesEl.style.display = 'block';
  }
}

window.selectEditor = async function(editorId) {
  selectedEditorId = editorId;
  render();

  // Send restore message to active tab if there's a matching editor
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'typoguard-restore',
      editorId: editorId,
      text: allCaptures[editorId][allCaptures[editorId].length - 1]?.text || ''
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script may not be loaded on this tab
        console.log('Restore not available on this tab:', chrome.runtime.lastError.message);
      }
    });
  }
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

init();
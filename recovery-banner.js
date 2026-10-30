function showRecoveryBanner(editorRecord, recoverableText) {
  const { id: editorId, element } = editorRecord;
  if (recoveryBannerState.get(editorId)?.shown) return;
  hideRecoveryBanner();

  bannerContainer = document.createElement('div');
  bannerContainer.className = 'tg-recovery-banner';
  bannerContainer.setAttribute('data-tg-editor-id', editorId);
  bannerContainer.innerHTML = `
    <div class="tg-banner-content">
      <div class="tg-banner-icon">⚠️</div>
      <div class="tg-banner-message">
        <div class="tg-banner-title">Text may have been lost</div>
        <div class="tg-banner-subtitle">TypoGuard found a saved version. Restore it?</div>
      </div>
      <div class="tg-banner-actions">
        <button class="tg-btn-restore" id="tg-btn-restore">Restore</button>
        <button class="tg-btn-dismiss" id="tg-btn-dismiss">Dismiss</button>
        <span class="tg-banner-shortcut">Ctrl+Shift+R</span>
      </div>
    </div>
  `;
  injectBannerCSS();

  if (element && element.parentNode) {
    element.parentNode.insertBefore(bannerContainer, element);
  } else {
    document.body.insertBefore(bannerContainer, document.body.firstChild);
  }

  const btnRestore = bannerContainer.querySelector('#tg-btn-restore');
  const btnDismiss = bannerContainer.querySelector('#tg-btn-dismiss');

  btnRestore.addEventListener('click', (e) => {
    e.preventDefault(); restoreText(editorRecord, recoverableText); hideRecoveryBanner();
  });
  btnDismiss.addEventListener('click', (e) => {
    e.preventDefault(); hideRecoveryBanner();
    recoveryBannerState.set(editorId, { shown: true, lastText: recoverableText });
  });

  setTimeout(() => {
    if (isBannerVisible) { hideRecoveryBanner(); recoveryBannerState.set(editorId, { shown: true, lastText: recoverableText }); }
  }, 10000);

  recoveryBannerState.set(editorId, { shown: true, lastText: recoverableText });
  isBannerVisible = true;
  bannerContainer.setAttribute('aria-live', 'polite');
  bannerContainer.setAttribute('role', 'alert');
}

function restoreText(editorRecord, text) {
  const { element, type } = editorRecord;
  try {
    if (type === 'textarea') {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (type === 'contenteditable') {
      element.innerText = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    element.classList.add('tg-restored');
    setTimeout(() => element.classList.remove('tg-restored'), 1000);
    console.log(`TypoGuard: restored ${text.length} chars to editor ${editorRecord.id}`);
  } catch (err) { console.error('TypoGuard: restore failed:', err.message); }
}

async function triggerQuickRestore() {
  if (isBannerVisible) {
    const btn = bannerContainer?.querySelector('#tg-btn-restore');
    if (btn) btn.click();
    return;
  }
  try {
    const result = await chrome.storage.local.get(['tg_captures', 'tg_metadata']);
    const captures = result.tg_captures || {};
    const metadata = result.tg_metadata || {};
    const editorIds = Object.keys(captures);
    if (editorIds.length === 0) { showToast('No saved text to restore'); return; }

    let latestEditorId = null; let latestTime = 0;
    for (const id of editorIds) {
      const meta = metadata[id] || {};
      if (meta.lastUpdated > latestTime) { latestTime = meta.lastUpdated; latestEditorId = id; }
    }
    if (!latestEditorId) return;

    const editorCaptures = captures[latestEditorId];
    const latestCapture = editorCaptures[editorCaptures.length - 1];
    const editorElement = document.querySelector(`[data-tg-id="${latestEditorId}"]`);
    if (!editorElement) { showToast('Editor not found on this page'); return; }

    if (editorElement.tagName === 'TEXTAREA') {
      editorElement.value = latestCapture.text;
      editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (editorElement.isContentEditable) {
      editorElement.innerText = latestCapture.text;
      editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    editorElement.classList.add('tg-restored');
    setTimeout(() => editorElement.classList.remove('tg-restored'), 1000);
    showToast(`Restored ${latestCapture.text.length} characters`);
  } catch (err) { console.error('TypoGuard: quick restore failed:', err.message); showToast('Restore failed'); }
}
/**
 * TypoGuard — Recovery Banner / Inline UI
 * Phase 7
 *
 * Responsibility:
 * - Detect text loss and show inline restore banner
 * - Keyboard shortcut for quick restore
 */

// State
const recoveryBannerState = new Map();
let bannerContainer = null;
let isBannerVisible = false;

function handleKeyboardShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
    event.preventDefault();
    triggerQuickRestore();
  }
}

document.addEventListener('keydown', handleKeyboardShortcut);

function detectTextLoss(editorRecord, lastCapturedText) {
  if (!lastCapturedText || lastCapturedText.length === 0) return false;
  const { element, type } = editorRecord;
  let currentText = '';
  if (type === 'textarea') currentText = element.value || '';
  else if (type === 'contenteditable') currentText = element.innerText || '';
  const lossRatio = 1 - currentText.length / lastCapturedText.length;
  const charsLost = lastCapturedText.length - currentText.length;
  return lossRatio > 0.5 && charsLost > 100;
}

function hideRecoveryBanner() {
  if (bannerContainer && bannerContainer.parentNode) {
    bannerContainer.parentNode.removeChild(bannerContainer);
    bannerContainer = null;
  }
  isBannerVisible = false;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'tg-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function injectBannerCSS() {
  if (document.getElementById('tg-banner-styles')) return;
  const style = document.createElement('style');
  style.id = 'tg-banner-styles';
  style.textContent = `
    .tg-recovery-banner {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; max-width: 560px; width: 90vw;
      background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: tg-slide-down 0.3s ease-out; font-size: 14px;
    }
    [data-theme="dark"] .tg-recovery-banner { background: #451a03; border-color: #d97706; color: #fef3c7; }
    .tg-banner-content { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
    .tg-banner-icon { font-size: 24px; flex-shrink: 0; }
    .tg-banner-message { flex: 1; }
    .tg-banner-title { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
    [data-theme="dark"] .tg-banner-title { color: #fef3c7; }
    .tg-banner-subtitle { font-size: 13px; opacity: 0.9; }
    [data-theme="dark"] .tg-banner-subtitle { color: #fef3c7; }
    .tg-banner-actions { display: flex; gap: 8px; margin-left: 16px; }
    .tg-btn-restore { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .tg-btn-restore:hover { background: #1d4ed8; }
    .tg-btn-dismiss { background: transparent; color: inherit; border: 1px solid currentColor; padding: 8px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; opacity: 0.8; }
    .tg-btn-dismiss:hover { opacity: 1; }
    .tg-banner-shortcut { font-size: 11px; opacity: 0.6; margin-left: 8px; font-family: monospace; }
    .tg-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 2147483647; background: rgba(0,0,0,0.8); color: white; padding: 10px 16px; border-radius: 6px; font-size: 13px; animation: tg-fade-in 0.2s ease-out; }
    .tg-restored { outline: 2px solid #22c55e !important; outline-offset: 2px; transition: outline 0.3s ease; }
    [data-theme="dark"] .tg-restored { outline-color: #4ade80 !important; }
    @keyframes tg-slide-down { from { transform: translateX(-50%) translateY(-20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
    @keyframes tg-fade-in { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  `;
  document.head.appendChild(style);
}

async function checkTextLoss(editorRecords, allCaptures) {
  for (const record of editorRecords) {
    const editorId = record.id;
    const captures = allCaptures[editorId];
    if (!captures || captures.length === 0) continue;
    const latestCapture = captures[captures.length - 1];
    const alreadyShown = recoveryBannerState.get(editorId)?.shown;
    if (!alreadyShown && detectTextLoss(record, latestCapture.text)) {
      showRecoveryBanner(record, latestCapture.text);
      break;
    }
  }
}

window.typoGuardRecoveryBanner = {
  showRecoveryBanner,
  hideRecoveryBanner,
  checkTextLoss,
  detectTextLoss,
  restoreText,
  triggerQuickRestore,
  isBannerVisible: () => isBannerVisible,
};
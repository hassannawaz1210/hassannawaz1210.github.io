const $ = id => document.getElementById(id);
const status = (msg, cls = '') => { $('status').textContent = msg; $('status').className = cls; };

// base64 <-> UTF-8 (btoa is latin1-only)
const enc = s => btoa(unescape(encodeURIComponent(s)));
const dec = s => decodeURIComponent(escape(atob(s)));

$('opts').onclick = e => { e.preventDefault(); chrome.runtime.openOptionsPage(); };

// prefill from current tab
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab) { $('url').value = tab.url || ''; $('title').value = tab.title || ''; }
});

$('save').onclick = async () => {
  const cfg = await chrome.storage.sync.get(['token', 'owner', 'repo', 'path', 'branch']);
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    status('Set token/owner/repo in Settings first.', 'err');
    return chrome.runtime.openOptionsPage();
  }
  const path = cfg.path || 'links.json';
  const branch = cfg.branch || 'main';
  const url = $('url').value.trim();
  if (!url) return status('URL required.', 'err');

  const entry = {
    url,
    title: $('title').value.trim(),
    note: $('note').value.trim(),
    date: new Date().toISOString().slice(0, 10)
  };

  $('save').disabled = true;
  status('Saving…');
  try {
    const api = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    const headers = { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' };

    // get current file (sha + content); 404 => start fresh
    let sha, list = [];
    const getRes = await fetch(`${api}?ref=${branch}&cb=${Date.now()}`, { headers });
    if (getRes.status === 200) {
      const data = await getRes.json();
      sha = data.sha;
      try { list = JSON.parse(dec(data.content)); } catch { list = []; }
      if (!Array.isArray(list)) list = [];
    } else if (getRes.status !== 404) {
      throw new Error(`GET ${getRes.status}`);
    }

    list.unshift(entry); // newest first

    const putRes = await fetch(api, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Add reading-list link: ${entry.title || url}`,
        content: enc(JSON.stringify(list, null, 2) + '\n'),
        branch,
        ...(sha ? { sha } : {})
      })
    });
    if (!putRes.ok) throw new Error(`PUT ${putRes.status}: ${(await putRes.text()).slice(0, 120)}`);

    status('Saved ✓', 'ok');
    $('note').value = '';
  } catch (e) {
    status(e.message, 'err');
  } finally {
    $('save').disabled = false;
  }
};

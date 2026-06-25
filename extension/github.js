// Shared GitHub Contents API helpers for popup + manage.
const enc = s => btoa(unescape(encodeURIComponent(s)));      // utf8 -> base64
const dec = s => decodeURIComponent(escape(atob(s)));        // base64 -> utf8

async function getCfg() {
  const cfg = await chrome.storage.sync.get(['token', 'owner', 'repo', 'path', 'branch']);
  if (!cfg.token || !cfg.owner || !cfg.repo) throw new Error('Set token/owner/repo in Settings.');
  // tolerate a pasted repo URL or owner/repo: keep just the repo name
  cfg.repo = cfg.repo.trim().replace(/\.git$/, '').replace(/\/+$/, '').split('/').pop();
  cfg.owner = cfg.owner.trim();
  cfg.path ||= 'links.json';
  cfg.branch ||= 'main';
  return cfg;
}

function apiUrl(cfg) {
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
}

// returns { list, sha }  (sha undefined if file doesn't exist yet)
async function fetchList(cfg) {
  const headers = { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' };
  const res = await fetch(`${apiUrl(cfg)}?ref=${cfg.branch}&cb=${Date.now()}`, { headers });
  if (res.status === 404) return { list: [], sha: undefined };
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  let list;
  try { list = JSON.parse(dec(data.content)); } catch { list = []; }
  return { list: Array.isArray(list) ? list : [], sha: data.sha };
}

async function saveList(cfg, list, sha, message) {
  const res = await fetch(apiUrl(cfg), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      content: enc(JSON.stringify(list, null, 2) + '\n'),
      branch: cfg.branch,
      ...(sha ? { sha } : {})
    })
  });
  if (!res.ok) throw new Error(`PUT ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

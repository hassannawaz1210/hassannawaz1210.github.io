const $ = id => document.getElementById(id);
const status = (msg, cls = '') => { $('status').textContent = msg; $('status').className = cls; };

// normalize for dup detection: drop hash, trailing slash, lowercase host
const normUrl = u => {
  try {
    const x = new URL(u);
    x.hash = '';
    return (x.host.replace(/^www\./, '') + x.pathname).toLowerCase().replace(/\/+$/, '') + x.search;
  } catch { return (u || '').trim().toLowerCase(); }
};

$('opts').onclick = e => { e.preventDefault(); chrome.runtime.openOptionsPage(); };
$('manage').onclick = e => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL('manage.html') }); };

// prefill from current tab
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab) { $('url').value = tab.url || ''; $('title').value = tab.title || ''; }
});

$('save').onclick = async () => {
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
    const cfg = await getCfg();
    const { list, sha } = await fetchList(cfg);
    if (list.some(i => normUrl(i.url) === normUrl(url))) {
      status('Already in the list.', 'err');
      return;
    }
    list.unshift(entry); // newest first
    await saveList(cfg, list, sha, `Add reading-list link: ${entry.title || url}`);
    status('Saved ✓', 'ok');
    $('note').value = '';
  } catch (e) {
    status(e.message, 'err');
    if (/Settings/.test(e.message)) chrome.runtime.openOptionsPage();
  } finally {
    $('save').disabled = false;
  }
};

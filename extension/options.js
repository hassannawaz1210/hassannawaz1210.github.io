const fields = ['token', 'owner', 'repo', 'path', 'branch'];
const $ = id => document.getElementById(id);

chrome.storage.sync.get(fields, cfg => {
  fields.forEach(f => { if (cfg[f]) $(f).value = cfg[f]; });
  if (!$('path').value) $('path').value = 'links.json';
  if (!$('branch').value) $('branch').value = 'main';
});

$('save').onclick = () => {
  const cfg = {};
  fields.forEach(f => cfg[f] = $(f).value.trim());
  chrome.storage.sync.set(cfg, () => {
    $('status').textContent = 'Saved ✓';
    setTimeout(() => $('status').textContent = '', 1500);
  });
};

const $ = id => document.getElementById(id);
const status = (msg, cls = '') => { $('status').textContent = msg; $('status').className = cls; };
const esc = s => (s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const safeHref = u => /^https?:\/\//i.test(u || '') ? u : '#';

let cfg;

async function load() {
  try {
    cfg = await getCfg();
    const { list, sha } = await fetchList(cfg);
    render(list, sha);
  } catch (e) {
    status(e.message, 'err');
  }
}

function render(list, sha) {
  if (!list.length) { status('Nothing in the list.'); $('list').innerHTML = ''; return; }
  status(`${list.length} link${list.length > 1 ? 's' : ''}.`);
  $('list').innerHTML = list.map((i, idx) => `
    <div class="item">
      <div class="body">
        <a href="${esc(safeHref(i.url))}" target="_blank" rel="noopener">${esc(i.title) || host(i.url)}</a>
        <span class="meta">${esc(host(i.url))}${i.date ? ' · ' + esc(i.date) : ''}</span>
        ${i.note ? `<span class="note">${esc(i.note)}</span>` : ''}
      </div>
      <button class="pin${i.pinned ? ' on' : ''}" data-idx="${idx}">${i.pinned ? '★ pinned' : '☆ pin'}</button>
      <button class="del" data-idx="${idx}">✕</button>
    </div>`).join('');

  document.querySelectorAll('.del').forEach(btn => {
    btn.onclick = () => remove(parseInt(btn.dataset.idx, 10), list[parseInt(btn.dataset.idx, 10)]);
  });
  document.querySelectorAll('.pin').forEach(btn => {
    btn.onclick = () => togglePin(list[parseInt(btn.dataset.idx, 10)]);
  });
}

async function togglePin(entry) {
  document.querySelectorAll('.pin, .del').forEach(b => b.disabled = true);
  status('Saving…');
  try {
    // re-fetch for current sha; match by url+date+title to survive reordering
    const { list, sha } = await fetchList(cfg);
    const at = list.findIndex(i => i.url === entry.url && i.date === entry.date && i.title === entry.title);
    if (at < 0) throw new Error('Entry not found');
    list[at].pinned = !list[at].pinned;
    const verb = list[at].pinned ? 'Pin' : 'Unpin';
    await saveList(cfg, list, sha, `${verb} reading-list link: ${entry.title || entry.url}`);
    render(list, sha);
    status(`${verb}ned ✓`, 'ok');
  } catch (e) {
    status(e.message, 'err');
    document.querySelectorAll('.pin, .del').forEach(b => b.disabled = false);
  }
}

async function remove(idx, entry) {
  if (!confirm(`Remove "${entry.title || entry.url}"?`)) return;
  document.querySelectorAll('.del').forEach(b => b.disabled = true);
  status('Removing…');
  try {
    // re-fetch to get current sha + indices (single user, but stay safe)
    const { list, sha } = await fetchList(cfg);
    // delete by URL match to survive any reordering since render
    const at = list.findIndex(i => i.url === entry.url && i.date === entry.date && i.title === entry.title);
    const target = at >= 0 ? at : idx;
    list.splice(target, 1);
    await saveList(cfg, list, sha, `Remove reading-list link: ${entry.title || entry.url}`);
    render(list, sha);
    status('Removed ✓', 'ok');
  } catch (e) {
    status(e.message, 'err');
    document.querySelectorAll('.del').forEach(b => b.disabled = false);
  }
}

load();

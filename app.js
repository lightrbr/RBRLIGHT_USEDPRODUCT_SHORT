const fmtEUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

let DATA = [];

const el = (id) => document.getElementById(id);

function normalize(s){
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
}

function hasUrl(s){
  return /^https?:\/\//i.test((s||'').trim());
}


function extractUrls(text){
  const t = (text || '').toString();
  const matches = t.match(/https?:\/\/[^\s)]+/g);
  return matches ? [...new Set(matches)] : [];
}

function initials(name){
  const words = (name||'').split(/\s+/).filter(Boolean);
  if (!words.length) return '★';
  return (words[0][0] + (words[1]?.[0]||'')).toUpperCase();
}

function scoreItem(item, q){
  if(!q) return 0;
  const hay = normalize([item.item, item.product, item.details, item.media].join(' '));
  const terms = q.split(/\s+/).filter(Boolean);
  let score = 0;
  for(const t of terms){
    if(hay.includes(t)) score += 10;
    if(normalize(item.item).includes(t)) score += 25;
    if(normalize(item.product).startsWith(t)) score += 12;
  }
  return score;
}

function escapeHtml(str){
  return (str||'').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function render(list){
  const grid = el('grid');
  grid.innerHTML = '';
  el('count').textContent = `${list.length} products`;

  for(const it of list){
    const card = document.createElement('article');
    card.className = 'card';

    const thumb = document.createElement('div');
    thumb.className = 'thumb';

    const photo = (it.photo||'').trim();
    if(photo && (hasUrl(photo) || photo.startsWith('assets/'))){
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = it.product || it.item || 'Product photo';
      img.src = photo;
      thumb.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'ph';
      ph.textContent = initials(it.product || it.item);
      thumb.appendChild(ph);
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const top = document.createElement('div');
    top.className = 'card-top';

    const left = document.createElement('div');
    left.innerHTML = `<div class="name">${escapeHtml(it.product || '—')}</div>
                      <div class="code">${escapeHtml(it.item || '')}</div>`;

    const right = document.createElement('div');
    right.className = 'pills';

    right.appendChild(pill(it.price != null ? fmtEUR.format(it.price) : 'Price n/a', it.price != null ? '' : 'muted'));
    right.appendChild(pill(it.quantity != null ? `Qty: ${it.quantity}` : 'Qty: n/a', it.quantity != null ? '' : 'muted'));

    top.appendChild(left);
    top.appendChild(right);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'View details';
    btn.addEventListener('click', () => openDialog(it));
    actions.appendChild(btn);

    body.appendChild(top);
    body.appendChild(actions);

    card.appendChild(thumb);
    card.appendChild(body);
    grid.appendChild(card);
  }
}

function pill(text, extraClass=''){
  const s = document.createElement('span');
  s.className = `pill ${extraClass}`.trim();
  s.textContent = text;
  return s;
}

function openDialog(it){
  el('dlgTitle').textContent = it.product || '—';
  el('dlgCode').textContent = it.item || '';
  if(el('dlgUsed')) el('dlgUsed').textContent = 'USED';
  el('dlgPrice').textContent = it.price != null ? fmtEUR.format(it.price) : 'Price n/a';
  el('dlgQty').textContent = it.quantity != null ? `Qty: ${it.quantity}` : 'Qty: n/a';
  el('dlgDetails').textContent = it.details || '—';
  el('dlgNote').textContent = 'Note: Prices exclude taxes, transport and installation.';

  // --- PHOTOS / VIDEOS (OneDrive links only; shown inside the details sheet) ---
  const wrap = el('dlgMediaWrap');
  const mediaBox = el('dlgMedia');
  const m = (it.media || '').trim();

  mediaBox.innerHTML = '';

  if (m) {
    wrap.style.display = '';
    const urls = extractUrls(m);

    if (urls.length) {
      mediaBox.innerHTML = urls
        .map(u => `<div><a href="${u}" target="_blank" rel="noopener">Open OneDrive folder</a></div>`)
        .join('');
    } else {
      mediaBox.textContent = m;
    }
  } else {
    wrap.style.display = 'none';
  }


  const photo = (it.photo||'').trim();
  const box = el('dlgImg');
  box.innerHTML = '';
  if(photo && (hasUrl(photo) || photo.startsWith('assets/'))){
    const img = document.createElement('img');
    img.alt = it.product || it.item || 'Product photo';
    img.src = photo;
    box.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'ph';
    ph.textContent = initials(it.product || it.item);
    box.appendChild(ph);
  }

  el('dlg').showModal();
}

function applyFilters(){
  const qRaw = el('q').value || '';
  const q = normalize(qRaw.trim());

  const onlyWithPrice = el('onlyWithPrice').checked;
  const sort = el('sort').value;

  let list = DATA.slice();

  if(q){
    list = list
      .map(it => ({...it, _score: scoreItem(it, q)}))
      .filter(it => it._score > 0);
  }

  if(onlyWithPrice){
    list = list.filter(it => it.price != null);
  }

  if(sort === 'az'){
    list.sort((a,b) => (a.product||'').localeCompare(b.product||'', 'it', {sensitivity:'base'}));
  } else if(sort === 'za'){
    list.sort((a,b) => (b.product||'').localeCompare(a.product||'', 'it', {sensitivity:'base'}));
  } else if(sort === 'priceAsc'){
    list.sort((a,b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  } else if(sort === 'priceDesc'){
    list.sort((a,b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  } else {
    if(q){
      list.sort((a,b) => (b._score||0) - (a._score||0));
    } else {
      list.sort((a,b) => (a.item||'').localeCompare(b.item||'', 'it', {numeric:true, sensitivity:'base'}));
    }
  }

  render(list);
}

async function init(){
  const res = await fetch('./data.json', {cache:'no-store'});
  DATA = await res.json();
  DATA = DATA.filter(x => (x.item||x.product||x.details||x.media||x.photo));

  el('q').addEventListener('input', applyFilters);
  el('sort').addEventListener('change', applyFilters);
  el('onlyWithPrice').addEventListener('change', applyFilters);
  el('reset').addEventListener('click', () => {
    el('q').value = '';
    el('sort').value = 'relevance';
    el('onlyWithPrice').checked = false;
    applyFilters();
  });

  applyFilters();
}

init();

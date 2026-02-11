const fmtEUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

let DATA = [];
const el = (id) => document.getElementById(id);

function normalize(s){
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
}

function scoreItem(item, q){
  if(!q) return 0;
  const hay = normalize([item.product, item.item].join(' '));
  const terms = q.split(/\s+/).filter(Boolean);
  let score = 0;
  for(const t of terms){
    if(hay.includes(t)) score += 10;
    if(normalize(item.product).includes(t)) score += 25;
  }
  return score;
}


function buildWhatsAppLink(it){
  const phone = '393932728922'; // international format, no '+'
  const lines = [
    'Hello, I would like info about this used item:',
    `Product: ${it.product || '—'}`,
    it.item ? `Code: ${it.item}` : null,
    it.price_eur != null ? `Price: ${fmtEUR.format(it.price_eur)}` : null,
    it.quantity != null ? `Qty: ${it.quantity}` : null,
  ].filter(Boolean);
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${phone}?text=${text}`;
}

function render(list){
  const grid = el('grid');
  grid.innerHTML = '';
  el('count').textContent = `${list.length} items`;

  for(const it of list){
    const card = document.createElement('article');
    card.className = 'card';

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = it.product || 'Used item';
    img.src = it.photo;
    thumb.appendChild(img);

    const body = document.createElement('div');
    body.className = 'card-body';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = it.product || '—';

    const metaRow = document.createElement('div');
    metaRow.className = 'meta-row';

    const price = document.createElement('div');
    price.className = 'pill';
    price.textContent = it.price_eur != null ? fmtEUR.format(it.price_eur) : 'Price n/a';

    const qty = document.createElement('div');
    qty.className = 'pill';
    qty.textContent = it.quantity != null ? `Qty: ${it.quantity}` : 'Qty: n/a';

    metaRow.appendChild(price);
    metaRow.appendChild(qty);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const btn = document.createElement('a');
    btn.className = 'btn wa';
    btn.href = buildWhatsAppLink(it);
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.textContent = 'Request info on WhatsApp';

    actions.appendChild(btn);

    body.appendChild(name);
    body.appendChild(metaRow);
    body.appendChild(actions);

    card.appendChild(thumb);
    card.appendChild(body);
    grid.appendChild(card);
  }
}

function applyFilters(){
  const qRaw = el('q').value || '';
  const q = normalize(qRaw.trim());
  const sort = el('sort').value;

  let list = DATA.slice();

  if(q){
    list = list.map(it => ({...it, _score: scoreItem(it, q)})).filter(it => it._score > 0);
  }

  if(sort === 'az'){
    list.sort((a,b) => (a.product||'').localeCompare(b.product||'', 'en', {sensitivity:'base'}));
  } else if(sort === 'za'){
    list.sort((a,b) => (b.product||'').localeCompare(a.product||'', 'en', {sensitivity:'base'}));
  } else if(sort === 'priceAsc'){
    list.sort((a,b) => (a.price_eur ?? Infinity) - (b.price_eur ?? Infinity));
  } else if(sort === 'priceDesc'){
    list.sort((a,b) => (b.price_eur ?? -Infinity) - (a.price_eur ?? -Infinity));
  } else {
    if(q){
      list.sort((a,b) => (b._score||0) - (a._score||0));
    } else {
      list.sort((a,b) => (a.product||'').localeCompare(b.product||'', 'en', {sensitivity:'base'}));
    }
  }

  render(list);
}

async function init(){
  const res = await fetch('./data.json', {cache:'no-store'});
  DATA = await res.json();
  DATA = DATA.filter(x => x.product && x.photo);

  el('q').addEventListener('input', applyFilters);
  el('sort').addEventListener('change', applyFilters);
  el('reset').addEventListener('click', () => {
    el('q').value = '';
    el('sort').value = 'relevance';
    applyFilters();
  });

  applyFilters();
}

init();

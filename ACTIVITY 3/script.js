'use strict';

const API = 'https://pokeapi.co/api/v2';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
const PAGE_SIZE = 24;
const MAX_ID = 1025; 
const HIDDEN_TYPES = ['unknown', 'shadow', 'stellar'];

const GENERATIONS = [
  'Gen I - Kanto', 'Gen II - Johto', 'Gen III - Hoenn', 'Gen IV - Sinnoh', 'Gen V - Unova',
  'Gen VI - Kalos', 'Gen VII - Alola', 'Gen VIII - Galar', 'Gen IX - Paldea'
];

const STAT_LABELS = {
  'hp': 'HP', 'attack': 'ATK', 'defense': 'DEF',
  'special-attack': 'SpA', 'special-defense': 'SpD', 'speed': 'SPD'
};

const SORTERS = {
  'id-asc': (a, b) => a.id - b.id,
  'id-desc': (a, b) => b.id - a.id,
  'name-asc': (a, b) => a.name.localeCompare(b.name),
  'name-desc': (a, b) => b.name.localeCompare(a.name)
};

const state = { all: [], filtered: [], shown: 0, token: 0, currentId: null, shiny: false };
const cache = {
  pokemon: new Map(), species: new Map(), evo: new Map(), type: new Map(), gen: new Map()
};

const $ = id => document.getElementById(id);
const els = {
  grid: $('pokeGrid'), search: $('search'), type: $('typeFilter'), gen: $('genFilter'),
  sort: $('sortBy'), random: $('randomBtn'), reset: $('resetBtn'), count: $('countText'),
  error: $('errorBox'), errorText: $('errorText'), retry: $('retryBtn'), empty: $('emptyState'),
  loading: $('loading'), loadMore: $('loadMoreBtn'), modalEl: $('detailModal'),
  modalTitle: $('detailTitle'), modalBody: $('detailBody'), prev: $('prevBtn'), next: $('nextBtn')
};
const modal = new bootstrap.Modal(els.modalEl);

const idFromUrl = url => Number(url.match(/\/(\d+)\/?$/)[1]);
const pad = n => String(n).padStart(3, '0');
const formatName = n => n.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const art = (id, shiny = false) => `${SPRITES}/${shiny ? 'shiny/' : ''}${id}.png`;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
function cached(map, key, loader) {
  if (!map.has(key)) {
    const promise = loader().catch(err => { map.delete(key); throw err; });
    map.set(key, promise);
  }
  return map.get(key);
}

const getPokemon = id => cached(cache.pokemon, id, () => getJSON(`${API}/pokemon/${id}`));
const getSpecies = id => cached(cache.species, id, () => getJSON(`${API}/pokemon-species/${id}`));
const getEvolution = url => cached(cache.evo, url, () => getJSON(url));
const getTypeIds = name => cached(cache.type, name, async () => {
  const data = await getJSON(`${API}/type/${name}`);
  return new Set(data.pokemon.map(e => idFromUrl(e.pokemon.url)));
});
const getGenIds = n => cached(cache.gen, n, async () => {
  const data = await getJSON(`${API}/generation/${n}`);
  return new Set(data.pokemon_species.map(s => idFromUrl(s.url)));
});

const setLoading = on => els.loading.classList.toggle('d-none', !on);
function showError(err) {
  setLoading(false);
  els.errorText.textContent = `Couldn't reach PokéAPI. ${err.message || ''}`.trim();
  els.error.classList.remove('d-none');
}
const hideError = () => els.error.classList.add('d-none');

function updateCount() {
  const total = state.filtered.length;
  els.count.textContent = total
    ? `Showing ${Math.min(state.shown, total)} of ${total} Pokémon`
    : '';
  els.loadMore.classList.toggle('d-none', state.shown >= total);
}

function typeBadges(types) {
  return types.map(t => `<span class="badge type-badge type-${t.type.name}">${formatName(t.type.name)}</span>`).join('');
}

function cardHTML(p) {
  const main = p.types[0].type.name;
  return `
    <div class="col">
      <div class="card poke-card h-100 border-0 shadow-sm" data-id="${p.id}" role="button" tabindex="0" aria-label="View ${formatName(p.name)}">
        <div class="poke-img-wrap type-${main}">
          <img src="${art(p.id)}" alt="${formatName(p.name)}" loading="lazy">
        </div>
        <div class="card-body text-center">
          <div class="small text-secondary">#${pad(p.id)}</div>
          <h5 class="card-title poke-name">${formatName(p.name)}</h5>
          <div class="d-flex justify-content-center gap-1 flex-wrap">${typeBadges(p.types)}</div>
        </div>
      </div>
    </div>`;
}

function failedCardHTML(p) {
  return `
    <div class="col">
      <div class="card poke-card h-100 border-0 shadow-sm" data-id="${p.id}" role="button" tabindex="0">
        <div class="card-body text-center text-secondary">
          <div class="small">#${pad(p.id)}</div>
          <h5 class="card-title poke-name">${formatName(p.name)}</h5>
          <small>Couldn't load details. Tap to retry.</small>
        </div>
      </div>
    </div>`;
}


function buildGenerationOptions() {
  els.gen.insertAdjacentHTML('beforeend',
    GENERATIONS.map((label, i) => `<option value="${i + 1}">${label}</option>`).join(''));
}

function buildTypeOptions(types) {
  const options = types
    .map(t => t.name)
    .filter(n => !HIDDEN_TYPES.includes(n))
    .sort()
    .map(n => `<option value="${n}">${formatName(n)}</option>`)
    .join('');
  els.type.insertAdjacentHTML('beforeend', options);
}

async function applyFilters() {
  const token = ++state.token;
  const q = els.search.value.trim().toLowerCase().replace(/^#/, '');
  let list = state.all;

  if (q) list = list.filter(p => p.name.includes(q) || String(p.id) === q);

  try {
    if (els.type.value) {
      const ids = await getTypeIds(els.type.value);
      list = list.filter(p => ids.has(p.id));
    }
    if (els.gen.value) {
      const ids = await getGenIds(els.gen.value);
      list = list.filter(p => ids.has(p.id));
    }
  } catch (err) {
    if (token === state.token) showError(err);
    return;
  }

  if (token !== state.token) return;

  state.filtered = [...list].sort(SORTERS[els.sort.value]);
  state.shown = 0;
  els.grid.innerHTML = '';
  hideError();
  els.empty.classList.toggle('d-none', state.filtered.length > 0);
  updateCount();
  await renderMore(token);
}

async function renderMore(token = state.token) {
  const batch = state.filtered.slice(state.shown, state.shown + PAGE_SIZE);
  if (!batch.length) { setLoading(false); return; }

  setLoading(true);
  els.loadMore.disabled = true;
  const results = await Promise.allSettled(batch.map(p => getPokemon(p.id)));
  if (token !== state.token) return;

  els.grid.insertAdjacentHTML('beforeend',
    results.map((r, i) => r.status === 'fulfilled' ? cardHTML(r.value) : failedCardHTML(batch[i])).join(''));

  state.shown += batch.length;
  els.loadMore.disabled = false;
  setLoading(false);
  updateCount();
}


function flattenEvolution(chain) {
  const stages = [];
  let level = [chain];
  while (level.length) {
    stages.push(level.map(n => n.species));
    level = level.flatMap(n => n.evolves_to);
  }
  return stages;
}

function renderDetail(p, species, evoStages) {
  const main = p.types[0].type.name;
  const genus = (species.genera.find(g => g.language.name === 'en') || {}).genus || '';
  const flavors = species.flavor_text_entries.filter(f => f.language.name === 'en');
  const flavor = flavors.length
    ? flavors[flavors.length - 1].flavor_text.replace(/[\f\n\r]+/g, ' ')
    : 'No description available.';

  const abilities = p.abilities.map(a =>
    `${formatName(a.ability.name)}${a.is_hidden ? ' <span class="text-secondary">(hidden)</span>' : ''}`
  ).join(', ');

  const stats = p.stats.map(s => `
    <div class="d-flex align-items-center gap-2 mb-1">
      <span class="stat-label">${STAT_LABELS[s.stat.name] || s.stat.name}</span>
      <span class="stat-value">${s.base_stat}</span>
      <div class="progress flex-grow-1" role="progressbar" aria-label="${s.stat.name}" aria-valuenow="${s.base_stat}" aria-valuemin="0" aria-valuemax="255">
        <div class="progress-bar stat-bar" style="width:${Math.min(100, (s.base_stat / 255) * 100)}%"></div>
      </div>
    </div>`).join('');
  const total = p.stats.reduce((sum, s) => sum + s.base_stat, 0);

  const evo = evoStages.length > 1
    ? evoStages.map((stage, i) => `
        ${i ? '<i class="fa-solid fa-arrow-right text-secondary"></i>' : ''}
        <div class="d-flex flex-column gap-1">
          ${stage.map(sp => {
            const sid = idFromUrl(sp.url);
            return `<div class="evo-item ${sid === p.id ? 'current' : ''}" data-action="open" data-id="${sid}" role="button" tabindex="0">
              <img src="${art(sid)}" alt="${formatName(sp.name)}" loading="lazy">
              <div class="small">${formatName(sp.name)}</div>
            </div>`;
          }).join('')}
        </div>`).join('')
    : '<span class="text-secondary small">This Pokémon does not evolve.</span>';

  els.modalTitle.textContent = `#${pad(p.id)} ${formatName(p.name)}`;
  els.modalBody.innerHTML = `
    <div class="row g-4">
      <div class="col-md-5">
        <div class="detail-art type-${main}">
          <img id="detailImg" src="${art(p.id)}" alt="${formatName(p.name)}">
        </div>
        <div class="d-flex gap-2 mt-3">
          <button type="button" class="btn btn-ink btn-sm flex-fill" data-action="shiny" id="shinyBtn"><i class="fa-solid fa-star me-1"></i>Shiny</button>
          <button type="button" class="btn btn-outline-dark btn-sm flex-fill" data-action="cry"><i class="fa-solid fa-volume-high me-1"></i>Cry</button>
        </div>
      </div>
      <div class="col-md-7">
        <div class="text-secondary small mb-1">${genus}</div>
        <div class="d-flex gap-1 flex-wrap mb-3">${typeBadges(p.types)}</div>
        <p>${flavor}</p>
        <div class="row small mb-3">
          <div class="col-6"><strong>Height:</strong> ${p.height / 10} m</div>
          <div class="col-6"><strong>Weight:</strong> ${p.weight / 10} kg</div>
          <div class="col-6 mt-1"><strong>Base EXP:</strong> ${p.base_experience ?? '?'}</div>
          <div class="col-12 mt-1"><strong>Abilities:</strong> ${abilities}</div>
        </div>
        <h3 class="h6">Base stats <span class="text-secondary fw-normal">(total ${total})</span></h3>
        ${stats}
      </div>
      <div class="col-12">
        <h3 class="h6">Evolution</h3>
        <div class="d-flex align-items-center justify-content-center flex-wrap gap-3">${evo}</div>
      </div>
    </div>`;
}

async function openDetail(id) {
  if (id < 1 || id > MAX_ID) return;
  state.currentId = id;
  state.shiny = false;
  els.prev.disabled = id <= 1;
  els.next.disabled = id >= MAX_ID;
  els.modalTitle.textContent = `#${pad(id)}`;
  els.modalBody.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-dark" role="status"></div></div>';
  modal.show();

  try {
    const [p, species] = await Promise.all([getPokemon(id), getSpecies(id)]);
    const evoData = await getEvolution(species.evolution_chain.url);
    if (state.currentId !== id) return; // user already moved on
    renderDetail(p, species, flattenEvolution(evoData.chain));
  } catch (err) {
    if (state.currentId !== id) return;
    els.modalBody.innerHTML = `<div class="alert alert-danger mb-0">Couldn't load this Pokémon. ${err.message || ''}</div>`;
  }
}

async function playCry() {
  try {
    const p = await getPokemon(state.currentId);
    const url = p.cries && (p.cries.latest || p.cries.legacy);
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = 0.4;
    await audio.play();
  } catch (_) {  }
}
function toggleShiny() {
  state.shiny = !state.shiny;
  const img = $('detailImg');
  if (img) img.src = art(state.currentId, state.shiny);
  const btn = $('shinyBtn');
  if (btn) btn.innerHTML = `<i class="fa-solid fa-star me-1"></i>${state.shiny ? 'Normal' : 'Shiny'}`;
}


function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

els.search.addEventListener('input', debounce(applyFilters, 250));
[els.type, els.gen, els.sort].forEach(el => el.addEventListener('change', applyFilters));
els.loadMore.addEventListener('click', () => renderMore());
els.retry.addEventListener('click', () => (state.all.length ? applyFilters() : init()));

els.reset.addEventListener('click', () => {
  els.search.value = '';
  els.type.value = '';
  els.gen.value = '';
  els.sort.value = 'id-asc';
  applyFilters();
});

els.random.addEventListener('click', () => openDetail(Math.floor(Math.random() * MAX_ID) + 1));
els.prev.addEventListener('click', () => openDetail(state.currentId - 1));
els.next.addEventListener('click', () => openDetail(state.currentId + 1));

els.grid.addEventListener('click', e => {
  const card = e.target.closest('.poke-card');
  if (card) openDetail(Number(card.dataset.id));
});
els.grid.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.poke-card');
  if (card) { e.preventDefault(); openDetail(Number(card.dataset.id)); }
});

els.modalBody.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'shiny') toggleShiny();
  if (action === 'cry') playCry();
  if (action === 'open') openDetail(Number(target.dataset.id));
});
els.modalBody.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target.closest('[data-action="open"]');
  if (target) { e.preventDefault(); openDetail(Number(target.dataset.id)); }
});

async function init() {
  hideError();
  setLoading(true);
  try {
    const [list, types] = await Promise.all([
      getJSON(`${API}/pokemon?limit=${MAX_ID}`),
      getJSON(`${API}/type`)
    ]);
    state.all = list.results.map(p => ({ id: idFromUrl(p.url), name: p.name }));
    buildTypeOptions(types.results);
    await applyFilters();
  } catch (err) {
    showError(err);
  }
}

buildGenerationOptions();
init();

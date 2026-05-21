const state = {
  query: '',
  type: '', status: '', season: '', format: '',
  sort: 'POPULARITY_DESC',
  page: 1,
  perPage: 24,
  totalPages: 1,
  activeTab: 'results',
  hasSearched: false,
};

const searchInput  = document.getElementById('search-input');
const searchBtn    = document.getElementById('search-btn');
const filterType   = document.getElementById('filter-type');
const filterStatus = document.getElementById('filter-status');
const filterSeason = document.getElementById('filter-season');
const filterFormat = document.getElementById('filter-format');
const filterSort   = document.getElementById('filter-sort');
const panelResults = document.getElementById('panel-results');
const panelTrending= document.getElementById('panel-trending');
const panelSeasonal= document.getElementById('panel-seasonal');
const pagination   = document.getElementById('pagination');
const statusBar    = document.getElementById('status-bar');
const statusText   = document.getElementById('status-text');
const pageInfoEl   = document.getElementById('page-info');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose   = document.getElementById('modal-close');
const modalContent = document.getElementById('modal-content');
const scrollTopBtn = document.getElementById('scroll-top');

const API_URL = 'https://graphql.anilist.co';

async function gql(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}

const SEARCH_QUERY = `
  query ($page: Int, $perPage: Int, $search: String, $type: MediaType,
         $status: MediaStatus, $season: MediaSeason, $format: MediaFormat,
         $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(search: $search, type: $type, status: $status,
            season: $season, format: $format, sort: $sort) {
        id title { romaji english native }
        coverImage { large color }
        bannerImage
        format status season seasonYear
        episodes chapters volumes
        duration averageScore popularity
        genres
        startDate { year month day }
      }
    }
  }`;

const TRENDING_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage }
      media(sort: TRENDING_DESC, type: ANIME) {
        id title { romaji english }
        coverImage { large color }
        bannerImage
        format status season seasonYear
        episodes averageScore popularity genres
      }
    }
  }`;

const SEASONAL_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage }
      media(season: $season, seasonYear: $seasonYear, type: ANIME,
            sort: POPULARITY_DESC) {
        id title { romaji english }
        coverImage { large color }
        format status episodes averageScore popularity genres
        nextAiringEpisode { episode airingAt }
      }
    }
  }`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      id title { romaji english native }
      coverImage { large extraLarge color }
      bannerImage
      description(asHtml: true)
      format status season seasonYear
      episodes chapters volumes duration
      averageScore meanScore popularity favourites
      genres
      startDate { year month day }
      endDate   { year month day }
      studios(isMain: true) { nodes { name siteUrl } }
      externalLinks { site url }
      characters(role: MAIN, page: 1, perPage: 8) {
        nodes { id name { full } image { medium } }
      }
      trailer { id site }
      siteUrl
    }
  }`;

function currentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 1 && m <= 3) return 'WINTER';
  if (m >= 4 && m <= 6) return 'SPRING';
  if (m >= 7 && m <= 9) return 'SUMMER';
  return 'FALL';
}

function score(s) {
  return s ? (s / 10).toFixed(1) : '—';
}

function fmtDate(d) {
  if (!d || !d.year) return '—';
  return [d.day, d.month, d.year].filter(Boolean).join('/');
}

function skeleton(n) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>`).join('');
}

function renderCard(m, delay = 0) {
  const title = m.title.english || m.title.romaji;
  const genre = m.genres?.[0] ?? '';
  const fmt   = m.format ?? '';
  const s     = score(m.averageScore);
  return `
    <div class="anime-card" data-id="${m.id}" style="animation-delay:${delay}ms">
      <div class="card-img-wrap">
        <img src="${m.coverImage?.large}" alt="${title}" loading="lazy"/>
        ${s !== '—' ? `<div class="card-score">★ ${s}</div>` : ''}
        ${fmt        ? `<div class="card-format">${fmt}</div>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${title}</div>
        <div class="card-meta">
          ${m.seasonYear ? `<span>${m.seasonYear}</span>` : ''}
          ${genre        ? `<span class="card-genre">${genre}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function renderGrid(mediaList, container) {
  if (!mediaList.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente outros termos ou filtros</p>
      </div>`;
    return;
  }
  container.innerHTML = `
    <div class="grid">
      ${mediaList.map((m, i) => renderCard(m, i * 30)).join('')}
    </div>`;
  container.querySelectorAll('.anime-card').forEach(el => {
    el.addEventListener('click', () => openModal(parseInt(el.dataset.id)));
  });
}

function renderPagination(currentPage, lastPage) {
  if (lastPage <= 1) { pagination.style.display = 'none'; return; }
  pagination.style.display = 'flex';

  const pages = [];
  pages.push(1);
  if (currentPage > 3) pages.push('...');
  for (let p = Math.max(2, currentPage - 1); p <= Math.min(lastPage - 1, currentPage + 1); p++) {
    pages.push(p);
  }
  if (currentPage < lastPage - 2) pages.push('...');
  if (lastPage > 1) pages.push(lastPage);

  pagination.innerHTML = `
    <button class="page-btn" id="prev-btn" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
    ${pages.map(p =>
      p === '...'
        ? `<span class="page-btn" style="pointer-events:none">…</span>`
        : `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
    ).join('')}
    <button class="page-btn" id="next-btn" ${currentPage === lastPage ? 'disabled' : ''}>Next →</button>`;

  pagination.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.page = parseInt(btn.dataset.page);
      doSearch();
    });
  });
  document.getElementById('prev-btn')?.addEventListener('click', () => { state.page--; doSearch(); });
  document.getElementById('next-btn')?.addEventListener('click', () => { state.page++; doSearch(); });
}

async function doSearch() {
  switchTab('results');
  panelResults.innerHTML = `<div class="grid">${skeleton(12)}</div>`;
  statusBar.style.display = 'none';
  pagination.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const vars = {
    page: state.page,
    perPage: state.perPage,
    sort: [filterSort.value || 'POPULARITY_DESC'],
  };
  if (state.query)        vars.search = state.query;
  if (filterType.value)   vars.type   = filterType.value;
  if (filterStatus.value) vars.status = filterStatus.value;
  if (filterSeason.value) vars.season = filterSeason.value;
  if (filterFormat.value) vars.format = filterFormat.value;

  try {
    const data = await gql(SEARCH_QUERY, vars);
    const { pageInfo, media } = data.Page;
    state.totalPages = pageInfo.lastPage;

    statusBar.style.display = 'flex';
    statusText.innerHTML = `<span class="status-count">${pageInfo.total}</span> resultados encontrados`;
    pageInfoEl.textContent = pageInfo.currentPage;

    renderGrid(media, panelResults);
    renderPagination(pageInfo.currentPage, pageInfo.lastPage);
  } catch (e) {
    panelResults.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Erro na busca</h3>
        <p>${e.message}</p>
      </div>`;
  }
}

async function loadTrending() {
  panelTrending.innerHTML = `
    <div class="section-header">
      <div class="section-title">🔥 <span>Trending</span> agora</div>
      <div class="section-sub">TOP ANIME DA SEMANA</div>
    </div>
    <div class="grid">${skeleton(12)}</div>`;

  try {
    const data = await gql(TRENDING_QUERY, { page: 1, perPage: 24 });
    const { media } = data.Page;
    panelTrending.innerHTML = `
      <div class="section-header">
        <div class="section-title">🔥 <span>Trending</span> agora</div>
        <div class="section-sub">TOP ANIME DA SEMANA</div>
      </div>`;
    const grid = document.createElement('div');
    panelTrending.appendChild(grid);
    renderGrid(media, grid);
  } catch (e) {
    panelTrending.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Erro</h3>
        <p>${e.message}</p>
      </div>`;
  }
}

async function loadSeasonal() {
  const season      = currentSeason();
  const year        = new Date().getFullYear();
  const seasonLabel = { WINTER: 'Winter ❄', SPRING: 'Spring 🌸', SUMMER: 'Summer ☀', FALL: 'Fall 🍂' }[season];

  panelSeasonal.innerHTML = `
    <div class="section-header">
      <div class="section-title">${seasonLabel} <span>${year}</span></div>
      <div class="section-sub">TEMPORADA ATUAL</div>
    </div>
    <div class="grid">${skeleton(12)}</div>`;

  try {
    const data = await gql(SEASONAL_QUERY, { season, seasonYear: year, page: 1, perPage: 24 });
    const { media } = data.Page;
    panelSeasonal.innerHTML = `
      <div class="section-header">
        <div class="section-title">${seasonLabel} <span>${year}</span></div>
        <div class="section-sub">TEMPORADA ATUAL</div>
      </div>`;
    const grid = document.createElement('div');
    panelSeasonal.appendChild(grid);
    renderGrid(media, grid);
  } catch (e) {
    panelSeasonal.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Erro</h3>
        <p>${e.message}</p>
      </div>`;
  }
}

async function openModal(id) {
  modalContent.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--muted)">Carregando...</div>`;
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const data  = await gql(DETAIL_QUERY, { id });
    const m     = data.Media;
    const title = m.title.english || m.title.romaji;

    const chars = m.characters?.nodes?.map(c => `
      <div class="char-item">
        ${c.image?.medium ? `<img class="char-img" src="${c.image.medium}" alt="${c.name.full}" loading="lazy"/>` : ''}
        <span>${c.name.full}</span>
      </div>`).join('') ?? '';

    const trailer = m.trailer?.site === 'youtube'
      ? `<a href="https://youtu.be/${m.trailer.id}" target="_blank"
            style="color:var(--accent2);font-family:'Space Mono',monospace;font-size:.75rem;letter-spacing:.1em;">
           ▶ TRAILER NO YOUTUBE
         </a>`
      : '';

    const links = m.externalLinks?.slice(0, 6).map(l =>
      `<a href="${l.url}" target="_blank" class="tag" style="text-decoration:none;">${l.site}</a>`
    ).join('') ?? '';

    const studio = m.studios?.nodes?.[0]?.name ?? '—';

    modalContent.innerHTML = `
      ${m.bannerImage ? `<img class="modal-banner" src="${m.bannerImage}" alt="banner"/>` : ''}
      <div class="modal-body">
        <div class="modal-top">
          <div class="modal-cover">
            <img src="${m.coverImage?.extraLarge || m.coverImage?.large}" alt="${title}"/>
          </div>
          <div class="modal-info">
            <div class="modal-title">${title}</div>
            ${m.title.native ? `<div class="modal-native">${m.title.native}</div>` : ''}
            <div class="modal-tags">
              ${m.format   ? `<span class="tag accent">${m.format}</span>` : ''}
              ${m.status   ? `<span class="tag">${m.status}</span>` : ''}
              ${m.season   ? `<span class="tag">${m.season} ${m.seasonYear ?? ''}</span>` : ''}
              ${m.genres?.slice(0, 4).map(g => `<span class="tag accent2">${g}</span>`).join('') ?? ''}
            </div>
            ${trailer}
          </div>
        </div>

        <div class="modal-stats">
          <div class="stat-item">
            <span class="stat-val">★ ${score(m.averageScore)}</span>
            <span class="stat-label">Nota Média</span>
          </div>
          ${m.episodes ? `<div class="stat-item"><span class="stat-val">${m.episodes}</span><span class="stat-label">Episódios</span></div>` : ''}
          ${m.chapters ? `<div class="stat-item"><span class="stat-val">${m.chapters}</span><span class="stat-label">Capítulos</span></div>` : ''}
          ${m.duration  ? `<div class="stat-item"><span class="stat-val">${m.duration}m</span><span class="stat-label">Duração/ep</span></div>` : ''}
          <div class="stat-item">
            <span class="stat-val">${(m.popularity ?? 0).toLocaleString()}</span>
            <span class="stat-label">Popularidade</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">${(m.favourites ?? 0).toLocaleString()}</span>
            <span class="stat-label">Favoritos</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">${fmtDate(m.startDate)}</span>
            <span class="stat-label">Início</span>
          </div>
          <div class="stat-item">
            <span class="stat-val">${studio}</span>
            <span class="stat-label">Estúdio</span>
          </div>
        </div>

        ${m.description ? `
          <div class="modal-section-title">Sinopse</div>
          <div class="modal-desc">${m.description}</div>` : ''}

        ${chars ? `
          <div class="modal-section-title">Personagens Principais</div>
          <div class="char-list">${chars}</div>` : ''}

        ${links ? `
          <div class="modal-section-title">Links Externos</div>
          <div class="modal-tags">${links}</div>` : ''}

        <div style="margin-top:1.5rem;text-align:center">
          <a href="${m.siteUrl}" target="_blank" class="search-btn"
             style="display:inline-block;text-decoration:none;font-family:'Bebas Neue',sans-serif;
                    font-size:1rem;letter-spacing:.1em;background:var(--accent);color:#fff;padding:.7rem 2rem;">
            VER NO ANILIST ↗
          </a>
        </div>
      </div>`;
  } catch (e) {
    modalContent.innerHTML = `
      <div style="padding:3rem;text-align:center;color:var(--accent)">
        Erro ao carregar: ${e.message}
      </div>`;
  }
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

const tabBtns = document.querySelectorAll('.tab-btn');
const panels  = { results: panelResults, trending: panelTrending, seasonal: panelSeasonal };
let trendingLoaded = false;
let seasonalLoaded = false;

function switchTab(name) {
  state.activeTab = name;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  Object.entries(panels).forEach(([k, el]) => { el.style.display = k === name ? '' : 'none'; });
  pagination.style.display = name === 'results' ? '' : 'none';
  statusBar.style.display  = name === 'results' && state.hasSearched ? '' : 'none';
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    switchTab(tab);
    if (tab === 'trending' && !trendingLoaded) { trendingLoaded = true; loadTrending(); }
    if (tab === 'seasonal' && !seasonalLoaded) { seasonalLoaded = true; loadSeasonal(); }
  });
});

searchBtn.addEventListener('click', () => {
  state.query       = searchInput.value.trim();
  state.page        = 1;
  state.hasSearched = true;
  doSearch();
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchBtn.click();
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});
scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

(async () => {
  panelResults.innerHTML = `
    <div class="section-header">
      <div class="section-title">🌟 Mais <span>Populares</span></div>
      <div class="section-sub">ANIME EM DESTAQUE</div>
    </div>
    <div class="grid">${skeleton(12)}</div>`;

  try {
    const data = await gql(SEARCH_QUERY, {
      page: 1, perPage: 24, type: 'ANIME', sort: ['POPULARITY_DESC'],
    });
    const { media } = data.Page;
    panelResults.innerHTML = `
      <div class="section-header">
        <div class="section-title">🌟 Mais <span>Populares</span></div>
        <div class="section-sub">ANIME EM DESTAQUE</div>
      </div>`;
    const grid = document.createElement('div');
    panelResults.appendChild(grid);
    renderGrid(media, grid);
  } catch (e) {
    panelResults.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Falha ao carregar</h3>
        <p>${e.message}</p>
      </div>`;
  }
})();
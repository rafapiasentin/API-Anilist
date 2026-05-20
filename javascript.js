const API_URL = 'https://graphql.anilist.co';

async function fetchAniList(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

const SEARCH_QUERY = `
  query ($search: String, $type: MediaType, $status: MediaStatus, $season: MediaSeason, $format: MediaFormat, $sort: [MediaSort]) {
    Page(page: 1, perPage: 24) {
      media(search: $search, type: $type, status: $status, season: $season, format: $format, sort: $sort) {
        id
        title { romaji english userPreferred }
        coverImage { large }
        averageScore
        seasonYear
        format
        genres
      }
    }
  }`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      title { romaji english userPreferred }
      description(asHtml: false)
      episodes
      genres
    }
  }`;

function renderAnimes(animeList) {
  const gridResults = document.getElementById('panel-results');
  if (!gridResults) return;

  if (!animeList || animeList.length === 0) {
    gridResults.innerHTML = '<p style="color: #6b6b80; text-align: center; padding: 5rem;">Nenhum anime encontrado.</p>';
    return;
  }

  gridResults.innerHTML = `
    <div class="grid">
      ${animeList.map(anime => {
        const title = anime.title.userPreferred || anime.title.english || anime.title.romaji;
        const score = anime.averageScore ? `★ ${(anime.averageScore / 10).toFixed(1)}` : '—';
        const primaryGenre = anime.genres && anime.genres.length > 0 ? anime.genres[0] : 'Info';
        
        return `
          <div class="anime-card" data-id="${anime.id}">
            <div class="card-img-wrap">
              <img src="${anime.coverImage?.large}" alt="${title}" loading="lazy"/>
              <span class="card-score">${score}</span>
              <span class="card-format">${anime.format || 'TV'}</span>
            </div>
            <div class="card-body">
              <h4 class="card-title">${title}</h4>
              <div class="card-meta">
                <span>${anime.seasonYear || '—'}</span>
                <span class="card-genre">${primaryGenre}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  gridResults.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', () => showAnimeDetails(parseInt(card.dataset.id)));
  });
}

async function showAnimeDetails(id) {
  try {
    const data = await fetchAniList(DETAIL_QUERY, { id });
    const anime = data.Media;
    const title = anime.title.userPreferred || anime.title.english || anime.title.romaji;
    
    let sinopseOriginal = anime.description ? anime.description : 'Sem sinopse disponível.';
    sinopseOriginal = sinopseOriginal.replace(/<\/?[^>]+(>|$)/g, "");

    if (sinopseOriginal.length > 380) {
      sinopseOriginal = sinopseOriginal.substring(0, 380) + '...';
    }

    let sinopseTraduzida = '';

    try {
      const urlTradutor = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sinopseOriginal)}&langpair=en|pt`;
      const resTraducao = await fetch(urlTradutor);
      const dataTraducao = await resTraducao.json();
      sinopseTraduzida = dataTraducao.responseData.translatedText;
    } catch (error) {
      sinopseTraduzida = sinopseOriginal;
    }

    const textoFormatado = 
      `Nome: ${title}\n` +
      `Episódios: ${anime.episodes || 'Em lançamento / Desconhecido'}\n` +
      `Gêneros: ${anime.genres.join(', ')}\n\n` +
      `Sinopse: ${sinopseTraduzida}`;

    alert(textoFormatado);

  } catch (error) {
    console.error("Erro ao processar modal:", error);
    alert("Não foi possível carregar as informações deste anime.");
  }
}

async function executaBusca() {
  const searchInput = document.getElementById('search-input');
  const gridResults = document.getElementById('panel-results');
  if (!gridResults) return;

  const queryTexto = searchInput ? searchInput.value.trim() : "";

  const fSort   = document.getElementById('filter-sort');
  const fType   = document.getElementById('filter-type');
  const fStatus = document.getElementById('filter-status');
  const fSeason = document.getElementById('filter-season');
  const fFormat = document.getElementById('filter-format');

  const vars = { sort: [fSort && fSort.value ? fSort.value : 'POPULARITY_DESC'] };
  
  if (queryTexto) vars.search = queryTexto;
  if (fType && fType.value) vars.type = fType.value;
  if (fStatus && fStatus.value) vars.status = fStatus.value;
  if (fSeason && fSeason.value) vars.season = fSeason.value;
  if (fFormat && fFormat.value) vars.format = fFormat.value;

  gridResults.innerHTML = '<p style="color: #6b6b80; text-align: center; padding: 5rem;">Buscando dados no AniList...</p>';

  try {
    const data = await fetchAniList(SEARCH_QUERY, vars);
    renderAnimes(data.Page.media);
  } catch (error) {
    gridResults.innerHTML = `<p style="color: #e63946; text-align: center; padding: 5rem;">Erro de conexão: ${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');

  if (searchBtn) searchBtn.addEventListener('click', executaBusca);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executaBusca();
    });
  }
  
  executaBusca();
});
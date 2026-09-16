// Funções e componentes compartilhados entre as páginas do Fhyl.
// Este arquivo não depende do estado ou da estrutura de uma página específica.
const FhylShared = (() => {
  const TMDB_BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const LISTS_STORAGE_KEY = "fhyl-prototype-lists-v1";

  // Cole seu API Read Access Token entre as aspas para deixá-lo fixo no código.
  // Este valor tem prioridade sobre o token salvo no navegador.
  const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyMjZkMTM3ZDk3M2YwNWVlMGQxY2Q0ZGM2NGM0OTEzZiIsIm5iZiI6MTc4OTA0NjYyMC4yMDg5OTk5LCJzdWIiOiI2YWEyYWY1Y2NjNTA1YmJhOGM3MTY2ZGQiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.ieEmSe-LrthHuohU04CyNFmDxGRLbf4V8TDx8L1Y41w";

  const DEFAULT_LISTS = [
    { id: "favorites", name: "Favoritos", type: "system", icon: "" },
    { id: "watched", name: "Assistidos", type: "system", icon: "" },
    { id: "to-watch", name: "Quero assistir", type: "system", icon: "" },
  ];

  function normalizeToken(value) {
    return String(value || "").trim().replace(/^Bearer\s+/i, "");
  }

  function titleName(title) {
    return title.media_type === "tv"
      ? title.name || title.original_name
      : title.title || title.original_title;
  }

  function titleOriginalName(title) {
    return title.media_type === "tv"
      ? title.original_name
      : title.original_title;
  }

  function titleDate(title) {
    return title.media_type === "tv" ? title.first_air_date : title.release_date;
  }

  function titleTypeLabel(title) {
    return title.media_type === "tv" ? "Série" : "Filme";
  }

  function sameTitle(first, second) {
    return String(first.id) === String(second.id)
      && (first.media_type || "movie") === (second.media_type || "movie");
  }

  function loadLists(storage = globalThis.localStorage) {
    let storedLists = [];
    try {
      const parsed = JSON.parse(storage.getItem(LISTS_STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) storedLists = parsed;
      if (parsed && Array.isArray(parsed.lists)) storedLists = parsed.lists;
    } catch {
      storedLists = [];
    }

    const getStoredList = (id) => storedLists.find((list) => list?.id === id);
    const normalizeMovies = (list) => (Array.isArray(list?.movies) ? list.movies : []);
    const normalizeList = (list, fallback) => ({
      ...fallback,
      movieIds: normalizeMovies(list).map((movie) => movie.id),
      movies: normalizeMovies(list),
    });

    return DEFAULT_LISTS.map((list) => normalizeList(getStoredList(list.id), list));
  }

  function persistLists(lists, storage = globalThis.localStorage) {
    storage.setItem(LISTS_STORAGE_KEY, JSON.stringify(lists));
  }

  function addMovieToList(lists, listId, movie) {
    const list = lists.find((candidate) => candidate.id === listId);
    if (!list || !movie) return false;

    if (!Array.isArray(list.movies)) list.movies = [];
    if (list.movies.some((item) => sameTitle(item, movie))) return false;

    list.movies.push({ ...movie });
    list.movieIds = list.movies.map((item) => item.id);
    return true;
  }

  function removeMovieFromList(lists, listId, movieToRemove) {
    const list = lists.find((candidate) => candidate.id === listId);
    if (!list) return false;

    const movies = Array.isArray(list.movies) ? list.movies : [];
    list.movies = movies.filter((movie) => !sameTitle(movie, movieToRemove));
    list.movieIds = list.movies.map((movie) => movie.id);
    return list.movies.length !== movies.length;
  }

  function imageUrl(path, size = "w500") {
    return path ? `${IMAGE_BASE_URL}/${size}${path}` : "";
  }

  function yearFromDate(date) {
    return date ? date.slice(0, 4) : "Ano desconhecido";
  }

  function formatRating(value) {
    return Number.isFinite(Number(value)) && Number(value) > 0
      ? Number(value).toFixed(1)
      : "—";
  }

  function formatRuntime(minutes) {
    if (!minutes) return "Não informado";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours ? `${hours}h ${remainingMinutes}min` : `${remainingMinutes}min`;
  }

  function formatDate(date) {
    if (!date) return "Não informado";
    const parsedDate = new Date(`${date}T00:00:00`);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
    }).format(parsedDate);
  }

  function textOrFallback(value, fallback = "Não informado") {
    return value?.trim() || fallback;
  }

  function createPoster(path, alt) {
    const wrapper = document.createElement("div");
    wrapper.className = "movie-poster";

    if (path) {
      const image = document.createElement("img");
      image.src = imageUrl(path);
      image.alt = `Pôster de ${alt}`;
      image.loading = "lazy";
      wrapper.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "poster-placeholder";
      placeholder.textContent = "Pôster indisponível";
      wrapper.append(placeholder);
    }

    return wrapper;
  }

  function createMovieCard(movie, { onDetails, onContextMenu } = {}) {
    const title = textOrFallback(titleName(movie), titleOriginalName(movie));
    const card = document.createElement("article");
    card.className = "movie-card";

    const cardMain = document.createElement("button");
    cardMain.type = "button";
    cardMain.className = "movie-card-main";
    cardMain.setAttribute("aria-label", `Ver detalhes de ${title}`);
    if (typeof onDetails === "function") {
      cardMain.addEventListener("click", () => onDetails(movie));
    }

    if (typeof onContextMenu === "function") {
      card.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        onContextMenu(movie, event);
      });
    }

    const poster = createPoster(movie.poster_path, title);
    const rating = document.createElement("span");
    rating.className = "rating-pill";
    rating.textContent = `★ ${formatRating(movie.vote_average)}`;
    poster.append(rating);

    const info = document.createElement("div");
    info.className = "movie-info";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const type = document.createElement("p");
    type.className = "movie-type";
    type.textContent = titleTypeLabel(movie);

    const year = document.createElement("p");
    year.className = "movie-year";
    year.textContent = yearFromDate(titleDate(movie));

    const overview = document.createElement("p");
    overview.className = "movie-overview";
    overview.textContent = textOrFallback(movie.overview, "Sinopse não disponível.");

    info.append(heading, type, year, overview);
    cardMain.append(poster, info);
    card.append(cardMain);

    return card;
  }

  async function fetchJson(url, token) {
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${normalizeToken(token)}`,
    };
    const response = await fetch(url, { headers });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const apiMessage = payload?.status_message || `HTTP ${response.status}`;
      const error = new Error(apiMessage);
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  async function searchTitles(query, token) {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
      throw new Error("Antes de buscar, informe o API Read Access Token do TMDB.");
    }

    const search = async (language) => {
      const params = new URLSearchParams({
        query,
        language,
        include_adult: "false",
        page: "1",
      });
      return fetchJson(`${TMDB_BASE_URL}/search/multi?${params.toString()}`, normalizedToken);
    };

    let language = "pt-BR";
    let payload = await search(language);
    let titles = (payload.results || []).filter(
      (result) => result.media_type === "movie" || result.media_type === "tv",
    );

    if (!titles.length) {
      language = "en-US";
      payload = await search(language);
      titles = (payload.results || []).filter(
        (result) => result.media_type === "movie" || result.media_type === "tv",
      );
    }

    return {
      titles,
      language,
      totalResults: payload.total_results || 0,
    };
  }

  function createListContextMenu({ getLists, onChange } = {}) {
    let selectedMovie = null;

    const menu = document.createElement("div");
    menu.className = "list-context-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Organizar título em listas");
    menu.hidden = true;

    const title = document.createElement("p");
    title.className = "list-context-menu-title";
    menu.append(title);

    const options = document.createElement("div");
    options.className = "list-context-menu-options";
    menu.append(options);

    const currentLists = () => (typeof getLists === "function" ? getLists() : []);

    function renderOptions() {
      options.replaceChildren();
      if (!selectedMovie) return;

      currentLists().forEach((list) => {
        const movies = Array.isArray(list.movies) ? list.movies : [];
        const isSelected = movies.some((movie) => sameTitle(movie, selectedMovie));
        const option = document.createElement("button");
        option.type = "button";
        option.className = `list-context-menu-option ${isSelected ? "is-selected" : ""}`.trim();
        option.setAttribute("role", "menuitemcheckbox");
        option.setAttribute("aria-checked", String(isSelected));

        const name = document.createElement("span");
        name.className = "list-context-menu-option-name";
        name.textContent = list.name;

        const count = document.createElement("span");
        count.className = "list-context-menu-option-count";
        count.textContent = isSelected
          ? "Adicionado"
          : `${movies.length} filme${movies.length === 1 ? "" : "s"}`;

        option.append(name, count);
        option.addEventListener("click", () => {
          const lists = currentLists();
          const targetList = lists.find((candidate) => candidate.id === list.id);
          if (!targetList) return;

          const targetMovies = Array.isArray(targetList.movies) ? targetList.movies : [];
          const wasSelected = targetMovies.some((movie) => sameTitle(movie, selectedMovie));
          const changed = wasSelected
            ? removeMovieFromList(lists, targetList.id, selectedMovie)
            : addMovieToList(lists, targetList.id, selectedMovie);
          if (!changed) return;

          persistLists(lists);
          onChange?.({
            added: !wasSelected,
            list: targetList,
            lists,
            movie: selectedMovie,
          });
          renderOptions();
        });
        options.append(option);
      });
    }

    function close() {
      menu.hidden = true;
      selectedMovie = null;
      options.replaceChildren();
    }

    function open(movie, clientX, clientY) {
      if (!movie) return;
      selectedMovie = movie;
      title.textContent = textOrFallback(titleName(movie), titleOriginalName(movie));
      renderOptions();
      if (!menu.parentElement) document.body.append(menu);
      menu.hidden = false;

      const padding = 8;
      const rect = menu.getBoundingClientRect();
      const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
      const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);
      menu.style.left = `${Math.min(Math.max(clientX, padding), maxLeft)}px`;
      menu.style.top = `${Math.min(Math.max(clientY, padding), maxTop)}px`;
    }

    function bind(element, movie) {
      element.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        open(movie, event.clientX, event.clientY);
      });
    }

    menu.addEventListener("contextmenu", (event) => event.preventDefault());
    document.addEventListener("pointerdown", (event) => {
      if (!menu.hidden && !menu.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });

    return { bind, close, open };
  }

  return Object.freeze({
    TMDB_BASE_URL,
    IMAGE_BASE_URL,
    LISTS_STORAGE_KEY,
    TMDB_TOKEN,
    DEFAULT_LISTS,
    normalizeToken,
    titleName,
    titleOriginalName,
    titleDate,
    titleTypeLabel,
    sameTitle,
    loadLists,
    persistLists,
    addMovieToList,
    removeMovieFromList,
    imageUrl,
    yearFromDate,
    formatRating,
    formatRuntime,
    formatDate,
    textOrFallback,
    createPoster,
    createMovieCard,
    createListContextMenu,
    fetchJson,
    searchTitles,
  });
})();

globalThis.FhylShared = FhylShared;

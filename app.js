const {
  TMDB_BASE_URL,
  TMDB_TOKEN,
  normalizeToken,
  titleName,
  titleOriginalName,
  titleDate,
  titleTypeLabel,
  sameTitle,
  loadLists,
  persistLists,
  addMovieToList: addMovieToListData,
  removeMovieFromList: removeMovieFromListData,
  imageUrl,
  yearFromDate,
  formatRating,
  formatRuntime,
  formatDate,
  textOrFallback,
  createPoster,
  createFavoriteBadge,
  createMovieCard,
  createListContextMenu,
  isMovieFavorited,
  updateAllFavoriteBadges,
  fetchJson,
  searchTitles,
} = globalThis.FhylShared;

const state = {
  token: "",
  movies: [],
  lists: [],
  lastFocusedElement: null,
  activeListId: null,
  listModalLastFocused: null,
  detailsRequestId: 0,
  searchRequestId: 0,
  categoryRequestId: 0,
  categoryCache: new Map(),
  categoryPending: new Map(),
  categoryNextPage: new Map(),
  categoryTotalPages: new Map(),
  categoryLoadingMore: new Set(),
  heroKeywordId: null,
  heroKeywordPromise: null,
  trendingLoaded: false,
};

const TRENDING_TITLES_LIMIT = 24;
const CATEGORY_TITLES_LIMIT = 24;
const TOP_RATED_LIMIT = 250;

const CATEGORY_CONFIG = Object.freeze({
  "top-250": {
    title: "Top 250 mais bem avaliados",
    description: "Os 250 filmes mais bem avaliados no TMDB. Este ranking é uma aproximação, não a lista oficial do IMDb.",
    mode: "top-rated",
  },
  acao: {
    title: "Ação",
    description: "Filmes de ação para assistir quando você quer adrenalina.",
    mode: "discover",
    genreId: "28",
  },
  comedia: {
    title: "Comédia",
    description: "Histórias leves e divertidas para qualquer momento.",
    mode: "discover",
    genreId: "35",
  },
  aventura: {
    title: "Aventura",
    description: "Jornadas, descobertas e grandes desafios.",
    mode: "discover",
    genreId: "12",
  },
  animacao: {
    title: "Animação",
    description: "Filmes animados para todas as idades.",
    mode: "discover",
    genreId: "16",
  },
  terror: {
    title: "Terror",
    description: "Suspense, medo e histórias assustadoras.",
    mode: "discover",
    genreId: "27",
  },
  herois: {
    title: "Heróis",
    description: "Filmes de super-heróis e personagens extraordinários.",
    mode: "discover",
    keywordQuery: "superhero",
  },
  drama: {
    title: "Drama",
    description: "Histórias intensas, humanas e emocionantes.",
    mode: "discover",
    genreId: "18",
  },
  "ficcao-cientifica": {
    title: "Ficção científica",
    description: "Mundos possíveis, tecnologia e novas fronteiras.",
    mode: "discover",
    genreId: "878",
  },
  fantasia: {
    title: "Fantasia",
    description: "Mundos mágicos, criaturas e aventuras extraordinárias.",
    mode: "discover",
    genreId: "14",
  },
  suspense: {
    title: "Suspense",
    description: "Mistérios e histórias que prendem sua atenção.",
    mode: "discover",
    genreId: "53",
  },
});

const elements = {
  homeView: document.querySelector("#home-view"),
  onboardingView: document.querySelector("#onboarding-view"),
  searchView: document.querySelector("#search-view"),
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-input"),
  notice: document.querySelector("#notice"),
  loadingState: document.querySelector("#loading-state"),
  emptyState: document.querySelector("#empty-state"),
  movieGrid: document.querySelector("#movie-grid"),
  resultMeta: document.querySelector("#result-meta"),
  listsGrid: document.querySelector("#lists-grid"),
  listModalBackdrop: document.querySelector("#list-modal-backdrop"),
  listViewTitle: document.querySelector("#list-view-title"),
  listViewCount: document.querySelector("#list-view-count"),
  listViewGrid: document.querySelector("#list-view-grid"),
  listViewEmpty: document.querySelector("#list-view-empty"),
  listModalClose: document.querySelector("#list-modal-close"),
  modalBackdrop: document.querySelector("#modal-backdrop"),
  modalClose: document.querySelector("#modal-close"),
  detailsContent: document.querySelector("#details-content"),
  welcomeMessage: document.querySelector("#welcome-message"),
  headerSearchForm: document.querySelector("#header-search-form"),
  headerListsLink: document.querySelector("#header-lists-link"),
  onboardingForm: document.querySelector("#onboarding-form"),
  usernameInput: document.querySelector("#username-input"),
  onboardingStatus: document.querySelector("#onboarding-status"),
  searchHomeLink: document.querySelector("#search-home-link"),
  searchTitle: document.querySelector("#search-title"),
  searchQuery: document.querySelector("#search-query"),
  searchNotice: document.querySelector("#search-notice"),
  searchLoadingState: document.querySelector("#search-loading-state"),
  searchEmptyState: document.querySelector("#search-empty-state"),
  searchMovieGrid: document.querySelector("#search-movie-grid"),
  searchResultMeta: document.querySelector("#search-result-meta"),
  brand: document.querySelector(".brand"),
  myListsView: document.querySelector("#my-lists-view"),
  myListsContent: document.querySelector("#my-lists-content"),
  categoryNav: document.querySelector("#category-nav"),
  categoryView: document.querySelector("#category-view"),
  categoryTitle: document.querySelector("#category-title"),
  categoryDescription: document.querySelector("#category-description"),
  categoryNotice: document.querySelector("#category-notice"),
  categoryLoadingState: document.querySelector("#category-loading-state"),
  categoryEmptyState: document.querySelector("#category-empty-state"),
  categoryMovieGrid: document.querySelector("#category-movie-grid"),
  categoryLoadMore: document.querySelector("#category-load-more"),
};

const MY_LISTS_CONFIG = [
  { id: "watched", title: "Assistidos" },
  { id: "to-watch", title: "Quero assistir" },
  { id: "favorites", title: "Favoritos" },
];

const listContextMenu = createListContextMenu({
  getLists: () => state.lists,
  onChange: ({ lists }) => {
    state.lists = lists;
    renderLists();
    if (state.activeListId) renderListView(state.activeListId);
    if (getCurrentRoute().name === "minhas-listas") renderMyListsView();
  },
});

function setNotice(message = "", type = "") {
  elements.notice.textContent = message;
  elements.notice.className = `notice ${type}`.trim();
  elements.notice.hidden = !message;
}

function setLoading(isLoading) {
  elements.loadingState.hidden = !isLoading;
  if (isLoading) {
    elements.emptyState.hidden = true;
    elements.movieGrid.replaceChildren();
  }
}

function renderLists() {
  if (!elements.listsGrid) return;

  elements.listsGrid.replaceChildren();

  state.lists.forEach((list) => {
    const movieCount = Array.isArray(list.movies) ? list.movies.length : 0;
    const movies = Array.isArray(list.movies) ? list.movies : [];

    const shelf = document.createElement("section");
    shelf.className = "list-shelf";
    shelf.setAttribute("aria-labelledby", `list-shelf-title-${list.id}`);

    const heading = document.createElement("div");
    heading.className = "list-shelf-heading";

    const titleGroup = document.createElement("div");
    const name = document.createElement("h3");
    name.id = `list-shelf-title-${list.id}`;
    name.textContent = list.name;
    const count = document.createElement("p");
    count.className = "list-shelf-count";
    count.textContent = `${movieCount} filme${movieCount === 1 ? "" : "s"}`;
    titleGroup.append(name, count);

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "button button-secondary";
    viewButton.textContent = "Ver lista";
    viewButton.addEventListener("click", () => openListView(list.id));
    heading.append(titleGroup, viewButton);

    const track = document.createElement("div");
    track.className = "list-shelf-track";
    if (movies.length) {
      movies.forEach((movie) => {
        const item = document.createElement("article");
        item.className = "list-shelf-movie";
        const poster = createPoster(
          movie.poster_path,
          textOrFallback(titleName(movie), titleOriginalName(movie)),
        );
        poster.classList.add("list-poster-clickable");
        poster.addEventListener("click", () => openDetails(movie));
        item.append(poster);
        listContextMenu.bind(item, movie);
        track.append(item);
      });
    } else {
      const empty = document.createElement("p");
      empty.className = "list-shelf-empty";
      empty.textContent = "Nenhum título salvo nesta lista ainda.";
      track.append(empty);
    }

    shelf.append(heading, track);
    elements.listsGrid.append(shelf);
  });
}

function getList(listId) {
  return state.lists.find((list) => list.id === listId);
}

function renderListView(listId) {
  const list = getList(listId);
  if (!list) return;

  state.activeListId = listId;
  elements.listViewTitle.textContent = list.name;
  elements.listViewGrid.replaceChildren();
  const movies = Array.isArray(list.movies) ? list.movies : [];
  elements.listViewEmpty.hidden = movies.length > 0;
  elements.listViewGrid.hidden = movies.length === 0;
  elements.listViewCount.textContent = movies.length
    ? `${movies.length} título${movies.length === 1 ? "" : "s"}`
    : "";

  const fragment = document.createDocumentFragment();
  movies.forEach((movie) => fragment.append(createMovieCard(movie, {
    onDetails: openDetails,
    onContextMenu: (selectedMovie, event) => listContextMenu.open(
      selectedMovie,
      event.clientX,
      event.clientY,
    ),
  })));
  elements.listViewGrid.append(fragment);
}

function openListView(listId) {
  renderListView(listId);
  state.listModalLastFocused = document.activeElement;
  elements.listModalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  elements.listModalClose.focus();
}

function closeListView() {
  elements.listModalBackdrop.hidden = true;
  state.activeListId = null;
  elements.listViewGrid.replaceChildren();
  if (elements.modalBackdrop.hidden) {
    document.body.style.overflow = "";
  }
  state.listModalLastFocused?.focus?.();
  state.listModalLastFocused = null;
}

function renderMovies(movies, meta = "") {
  state.movies = movies;
  elements.movieGrid.replaceChildren();
  elements.emptyState.hidden = movies.length > 0;

  if (!movies.length) {
    elements.resultMeta.textContent = "";
    return;
  }

  elements.resultMeta.textContent = meta;
  const fragment = document.createDocumentFragment();
  movies.forEach((movie) => fragment.append(createMovieCard(movie, {
    onDetails: openDetails,
    onContextMenu: (selectedMovie, event) => listContextMenu.open(
      selectedMovie,
      event.clientX,
      event.clientY,
    ),
  })));
  elements.movieGrid.append(fragment);
}

function handleSearch(event) {
  event.preventDefault();
  const query = new FormData(event.currentTarget).get("query")?.toString().trim();
  if (!query) return;
  navigateToRoute("search", { q: query });
}

function getCurrentRoute() {
  const routeText = window.location.hash.replace(/^#\/?/, "");
  const [path, queryString = ""] = routeText.split("?");
  const name =
    path === "search" || path === "onboarding" || path === "minhas-listas" || path === "categoria"
      ? path
      : "home";
  return { name, params: new URLSearchParams(queryString) };
}

function navigateToRoute(name, params = {}, replace = false) {
  const query = new URLSearchParams(params).toString();
  const hash = name === "home" ? "#/" : `#/${name}${query ? `?${query}` : ""}`;
  const target = `${window.location.pathname}${window.location.search}${hash}`;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", target);
  renderRoute();
}

function setSearchNotice(message = "", type = "") {
  elements.searchNotice.textContent = message;
  elements.searchNotice.className = `notice ${type}`.trim();
  elements.searchNotice.hidden = !message;
}

function setSearchLoading(isLoading) {
  elements.searchLoadingState.hidden = !isLoading;
  if (isLoading) {
    elements.searchEmptyState.hidden = true;
    elements.searchMovieGrid.replaceChildren();
  }
}

function renderSearchMovies(movies, language) {
  elements.searchMovieGrid.replaceChildren();
  elements.searchEmptyState.hidden = movies.length > 0;
  elements.searchResultMeta.textContent = movies.length
    ? `${movies.length} resultado${movies.length === 1 ? "" : "s"} · ${language}`
    : "";

  const fragment = document.createDocumentFragment();
  movies.forEach((movie) => fragment.append(createMovieCard(movie, {
    onDetails: openDetails,
    onContextMenu: (selectedMovie, event) => listContextMenu.open(
      selectedMovie,
      event.clientX,
      event.clientY,
    ),
  })));
  elements.searchMovieGrid.append(fragment);
}

async function loadSearchResults(query) {
  const requestId = ++state.searchRequestId;
  elements.searchTitle.textContent = query ? `Resultados para “${query}”` : "Busca sem termo";
  elements.searchQuery.textContent = query ? `Busca por “${query}”` : "";
  elements.searchResultMeta.textContent = "";
  elements.searchMovieGrid.replaceChildren();
  setSearchNotice();
  setSearchLoading(false);

  if (!query) {
    elements.searchEmptyState.hidden = false;
    setSearchNotice("Informe um título na barra de busca da home.", "error");
    return;
  }

  setSearchLoading(true);

  try {
    const result = await searchTitles(query, state.token);
    if (requestId !== state.searchRequestId) return;
    setSearchLoading(false);
    renderSearchMovies(result.titles, result.language);

    if (!result.titles.length) {
      setSearchNotice(`Não encontramos filmes ou séries para “${query}”.`);
    } else if (result.language === "en-US") {
      setSearchNotice("A busca em pt-BR não encontrou resultados; exibindo correspondências em en-US.");
    }
  } catch (error) {
    if (requestId !== state.searchRequestId) return;
    setSearchLoading(false);
    elements.searchEmptyState.hidden = false;
    const message = error.status === 401 || error.status === 403
      ? "O token do TMDB foi recusado. Confira se você colou o API Read Access Token correto."
      : error.message;
    setSearchNotice(message, "error");
  }
}

function updateCategoryNav(route, username) {
  const isVisible = route.name !== "onboarding" && Boolean(username);
  if (elements.categoryNav) {
    elements.categoryNav.hidden = !isVisible;
  }
  if (elements.headerSearchForm) {
    elements.headerSearchForm.hidden = !isVisible;
  }
  if (elements.headerListsLink) {
    elements.headerListsLink.hidden = !isVisible;
  }

  const activeTab = route.name === "categoria"
    ? route.params.get("tab")
    : route.name === "minhas-listas" ? "minhas-listas" : "";
  document.querySelectorAll("[data-category-tab]").forEach((link) => {
    const isActive = link.dataset.categoryTab === activeTab;
    link.classList.toggle("is-active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function renderRoute() {
  const route = getCurrentRoute();
  const username = localStorage.getItem("fhyl-username")?.trim();

  if (!username && route.name !== "onboarding") {
    navigateToRoute("onboarding", {}, true);
    return;
  }

  elements.homeView.hidden = route.name !== "home";
  elements.onboardingView.hidden = route.name !== "onboarding";
  elements.searchView.hidden = route.name !== "search";
  if (elements.categoryView) {
    elements.categoryView.hidden = route.name !== "categoria";
  }
  if (elements.myListsView) {
    elements.myListsView.hidden = route.name !== "minhas-listas";
  }

  updateCategoryNav(route, username);


  if (route.name !== "search") state.searchRequestId += 1;
  if (route.name !== "categoria") state.categoryRequestId += 1;

  elements.welcomeMessage.textContent = route.name === "onboarding"
    ? ""
    : username
      ? `Olá, ${username}`
      : "";

  if (route.name === "onboarding") {
    document.title = "Fhyl — Começar";
    elements.usernameInput.value = username || "";
    elements.onboardingStatus.textContent = "";
    elements.usernameInput.focus();
    return;
  }

  if (route.name === "categoria") {
    const tab = route.params.get("tab") || "top-250";
    if (!CATEGORY_CONFIG[tab]) {
      navigateToRoute("categoria", { tab: "top-250" }, true);
      return;
    }
    document.title = `Fhyl — ${CATEGORY_CONFIG[tab].title}`;
    loadCategoryResults(tab);
    return;
  }

  if (route.name === "search") {
    document.title = "Fhyl — Busca";
    loadSearchResults(route.params.get("q")?.trim() || "");
    return;
  }

  if (route.name === "minhas-listas") {
    document.title = "Fhyl — Minhas Listas";
    renderMyListsView();
    return;
  }

  document.title = "Fhyl — Filmes e Séries";
  if (!state.trendingLoaded) loadTrendingTitles();
}

async function loadTrendingTitles() {
  setNotice();
  setLoading(true);

  try {
    const payloads = await Promise.all(
      [1, 2].map((page) => fetchJson(
        `${TMDB_BASE_URL}/trending/all/week?language=pt-BR&page=${page}`,
        state.token,
      )),
    );
    const titles = payloads
      .flatMap((payload) => (payload.results || []).filter(
        (result) => result.media_type === "movie" || result.media_type === "tv",
      ))
      .slice(0, TRENDING_TITLES_LIMIT);
    state.trendingLoaded = true;
    const countLabel = `${titles.length} título${titles.length === 1 ? "" : "s"} em alta nesta semana`;
    setLoading(false);
    renderMovies(titles, countLabel);

    if (!titles.length) {
      setNotice("Não encontramos títulos em alta no momento.");
    }
  } catch (error) {
    setLoading(false);
    state.movies = [];
    elements.emptyState.hidden = false;
    const message = error.status === 401 || error.status === 403
      ? "O token do TMDB foi recusado. Confira se você colou o API Read Access Token correto."
      : "Não foi possível carregar os títulos em alta agora.";
    setNotice(message, "error");
  }
}

function setCategoryNotice(message = "", type = "") {
  elements.categoryNotice.textContent = message;
  elements.categoryNotice.className = `notice ${type}`.trim();
  elements.categoryNotice.hidden = !message;
}

function setCategoryLoading(isLoading) {
  elements.categoryLoadingState.hidden = !isLoading;
  if (isLoading) {
    elements.categoryEmptyState.hidden = true;
    elements.categoryMovieGrid.replaceChildren();
  }
}

function dedupeMovies(movies) {
  const seen = new Set();
  return movies.filter((movie) => {
    if (!movie?.id) return false;
    const key = `${movie.media_type || "movie"}:${movie.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function setCategoryLoadMoreState(hasMore, isLoading = false) {
  if (!elements.categoryLoadMore) return;
  elements.categoryLoadMore.hidden = !hasMore;
  elements.categoryLoadMore.textContent = isLoading
    ? "Carregando mais filmes..."
    : "Continue rolando para carregar mais filmes...";
}

function updateCategoryLoadMoreObserver(shouldObserve) {
  if (!categoryLoadMoreObserver || !elements.categoryLoadMore) return;
  if (shouldObserve) {
    categoryLoadMoreObserver.observe(elements.categoryLoadMore);
  } else {
    categoryLoadMoreObserver.unobserve(elements.categoryLoadMore);
  }
}

function renderCategoryMovies(movies, isRanked = false) {
  elements.categoryMovieGrid.classList.toggle("is-ranked-list", isRanked);
  elements.categoryMovieGrid.replaceChildren();
  elements.categoryEmptyState.hidden = movies.length > 0;

  if (!movies.length) return;

  const fragment = document.createDocumentFragment();
  movies.forEach((movie, index) => fragment.append(createMovieCard(movie, {
    onDetails: openDetails,
    onContextMenu: (selectedMovie, event) => listContextMenu.open(
      selectedMovie,
      event.clientX,
      event.clientY,
    ),
    rank: isRanked ? index + 1 : null,
  })));
  elements.categoryMovieGrid.append(fragment);
}

async function resolveKeywordId(query) {
  if (state.heroKeywordId) return state.heroKeywordId;
  if (state.heroKeywordPromise) return state.heroKeywordPromise;

  state.heroKeywordPromise = (async () => {
    const params = new URLSearchParams({ query, page: "1" });
    const payload = await fetchJson(`${TMDB_BASE_URL}/search/keyword?${params.toString()}`, state.token);
    const normalizedQuery = query.toLowerCase();
    const keyword = (payload.results || []).find(
      (item) => item?.name?.toLowerCase() === normalizedQuery,
    ) || (payload.results || [])[0];
    if (!keyword?.id) {
      throw new Error("Não encontramos uma palavra-chave para esta categoria.");
    }
    state.heroKeywordId = keyword.id;
    return keyword.id;
  })().finally(() => {
    state.heroKeywordPromise = null;
  });

  return state.heroKeywordPromise;
}

async function loadTopRatedMovies() {
  const movies = [];
  const seen = new Set();
  let page = 1;
  let totalPages = 1;

  while (movies.length < TOP_RATED_LIMIT && page <= totalPages) {
    const params = new URLSearchParams({
      language: "pt-BR",
      page: String(page),
    });
    const payload = await fetchJson(`${TMDB_BASE_URL}/movie/top_rated?${params.toString()}`, state.token);
    const results = Array.isArray(payload.results) ? payload.results : [];
    results.forEach((movie) => {
      if (!movie?.id || seen.has(movie.id)) return;
      seen.add(movie.id);
      movies.push({ ...movie, media_type: "movie" });
    });
    totalPages = Number(payload.total_pages) || page;
    if (!results.length) break;
    page += 1;
  }

  return movies.slice(0, TOP_RATED_LIMIT);
}

async function getDiscoverBaseParams(config) {
  const keywordId = config.keywordQuery ? await resolveKeywordId(config.keywordQuery) : null;
  const baseParams = {
    language: "pt-BR",
    include_adult: "false",
    include_video: "false",
    sort_by: "popularity.desc",
  };
  if (config.genreId) baseParams.with_genres = config.genreId;
  if (keywordId) baseParams.with_keywords = String(keywordId);
  return baseParams;
}

async function loadDiscoverPage(config, page) {
  const baseParams = await getDiscoverBaseParams(config);
  const params = new URLSearchParams({ ...baseParams, page: String(page) });
  const payload = await fetchJson(`${TMDB_BASE_URL}/discover/movie?${params.toString()}`, state.token);
  return {
    movies: dedupeMovies(payload.results || []),
    totalPages: Number(payload.total_pages) || page,
  };
}

async function loadDiscoverMovies(config) {
  const payloads = await Promise.all([1, 2].map((page) => loadDiscoverPage(config, page)));
  return {
    movies: dedupeMovies(payloads.flatMap((payload) => payload.movies)),
    totalPages: Math.max(...payloads.map((payload) => payload.totalPages)),
  };
}

async function loadCategoryResults(tab) {
  const config = CATEGORY_CONFIG[tab];
  if (!config) return;

  const requestId = ++state.categoryRequestId;
  elements.categoryTitle.textContent = config.title;
  elements.categoryDescription.textContent = config.description;
  elements.categoryMovieGrid.replaceChildren();
  setCategoryNotice();
  setCategoryLoading(true);
  setCategoryLoadMoreState(false);
  updateCategoryLoadMoreObserver(false);

  const cachedMovies = state.categoryCache.get(tab);
  if (cachedMovies) {
    setCategoryLoading(false);
    renderCategoryMovies(cachedMovies, config.mode === "top-rated");
    setCategoryLoadMoreState(
      config.mode !== "top-rated" && hasMoreCategoryResults(tab),
    );
    updateCategoryLoadMoreObserver(config.mode !== "top-rated");
    return;
  }

  try {
    if (config.mode === "top-rated") {
      const movies = await loadTopRatedMovies();
      if (requestId !== state.categoryRequestId) return;
      state.categoryCache.set(tab, movies);
      state.categoryPending.delete(tab);
      state.categoryNextPage.delete(tab);
      state.categoryTotalPages.delete(tab);
      setCategoryLoading(false);
      renderCategoryMovies(movies, true);
      setCategoryLoadMoreState(false);
      updateCategoryLoadMoreObserver(false);
      return;
    }

    const result = await loadDiscoverMovies(config);
    if (requestId !== state.categoryRequestId) return;
    const movies = result.movies.slice(0, CATEGORY_TITLES_LIMIT);
    state.categoryCache.set(tab, movies);
    state.categoryPending.set(tab, result.movies.slice(CATEGORY_TITLES_LIMIT));
    state.categoryNextPage.set(tab, 3);
    state.categoryTotalPages.set(tab, result.totalPages);
    setCategoryLoading(false);
    renderCategoryMovies(movies);
    setCategoryLoadMoreState(hasMoreCategoryResults(tab));
    updateCategoryLoadMoreObserver(true);
  } catch (error) {
    if (requestId !== state.categoryRequestId) return;
    setCategoryLoading(false);
    setCategoryLoadMoreState(false);
    updateCategoryLoadMoreObserver(false);
    elements.categoryEmptyState.hidden = false;
    const message = error.status === 401 || error.status === 403
      ? "O token do TMDB foi recusado. Confira se você colou o API Read Access Token correto."
      : error.message || "Não foi possível carregar esta categoria agora.";
    setCategoryNotice(message, "error");
  }
}

function hasMoreCategoryResults(tab) {
  const pending = state.categoryPending.get(tab) || [];
  const nextPage = state.categoryNextPage.get(tab) || 1;
  const totalPages = state.categoryTotalPages.get(tab) || 0;
  return pending.length > 0 || nextPage <= totalPages;
}

async function loadMoreCategoryResults() {
  const route = getCurrentRoute();
  const tab = route.name === "categoria" ? route.params.get("tab") : "";
  const config = CATEGORY_CONFIG[tab];
  if (!config || config.mode === "top-rated" || state.categoryLoadingMore.has(tab)) return;
  if (!hasMoreCategoryResults(tab)) {
    setCategoryLoadMoreState(false);
    updateCategoryLoadMoreObserver(false);
    return;
  }

  const requestId = state.categoryRequestId;
  state.categoryLoadingMore.add(tab);
  setCategoryLoadMoreState(true, true);

  try {
    let additions = [];
    const pending = state.categoryPending.get(tab) || [];
    if (pending.length) {
      additions = pending.splice(0, CATEGORY_TITLES_LIMIT);
      state.categoryPending.set(tab, pending);
    } else {
      const page = state.categoryNextPage.get(tab) || 1;
      const result = await loadDiscoverPage(config, page);
      if (requestId !== state.categoryRequestId || getCurrentRoute().params.get("tab") !== tab) return;
      additions = result.movies;
      state.categoryNextPage.set(tab, page + 1);
      state.categoryTotalPages.set(tab, result.totalPages);
    }

    if (requestId !== state.categoryRequestId || getCurrentRoute().params.get("tab") !== tab) return;
    const currentMovies = state.categoryCache.get(tab) || [];
    const movies = dedupeMovies([...currentMovies, ...additions]);
    state.categoryCache.set(tab, movies);
    renderCategoryMovies(movies);
    setCategoryLoadMoreState(hasMoreCategoryResults(tab));
    updateCategoryLoadMoreObserver(true);
  } catch (error) {
    if (requestId !== state.categoryRequestId) return;
    setCategoryLoadMoreState(true);
    setCategoryNotice(error.message || "Não foi possível carregar mais filmes agora.", "error");
  } finally {
    state.categoryLoadingMore.delete(tab);
  }
}

function createDetailFact(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "fact";
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  wrapper.append(term, description);
  return wrapper;
}

function isMovieInList(listId, movie) {
  const list = getList(listId);
  return Boolean(list?.movies?.some((item) => sameTitle(item, movie)));
}

function createDetailsAction(movie, listId, labels) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button details-action-button";
  const selected = isMovieInList(listId, movie);
  button.textContent = selected ? labels.selected : labels.idle;
  button.setAttribute("aria-pressed", String(selected));
  if (selected) button.classList.add("is-active");
  button.addEventListener("click", () => {
    const changed = selected
      ? removeMovieFromListData(state.lists, listId, movie)
      : addMovieToListData(state.lists, listId, movie);
    if (!changed) return;

    persistLists(state.lists);
    renderLists();
    if (state.activeListId) renderListView(state.activeListId);
    if (getCurrentRoute().name === "minhas-listas") renderMyListsView();
    renderDetails(movie);
  });
  return button;
}

function createTrailerLink(movie) {
  const videos = Array.isArray(movie.videos?.results) ? movie.videos.results : [];
  const trailer = videos.find(
    (video) => video.site === "YouTube" && video.type === "Trailer" && video.key,
  ) || videos.find((video) => video.site === "YouTube" && video.key);
  if (!trailer) return null;

  const link = document.createElement("a");
  link.className = "button button-secondary details-trailer-link";
  link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Assistir trailer";
  return link;
}

function createCastSection(movie) {
  const cast = Array.isArray(movie.credits?.cast)
    ? movie.credits.cast.filter((person) => person?.name).slice(0, 6)
    : [];
  if (!cast.length) return null;

  const section = document.createElement("section");
  section.className = "details-cast-section";
  const heading = document.createElement("h3");
  heading.textContent = "Elenco principal";
  const grid = document.createElement("div");
  grid.className = "details-cast-grid";

  cast.forEach((person) => {
    const member = document.createElement("article");
    member.className = "details-cast-member";
    if (person.profile_path) {
      const image = document.createElement("img");
      image.src = imageUrl(person.profile_path, "w185");
      image.alt = `Foto de ${person.name}`;
      image.loading = "lazy";
      member.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "details-cast-placeholder";
      placeholder.textContent = person.name.slice(0, 1).toUpperCase();
      member.append(placeholder);
    }

    const name = document.createElement("strong");
    name.textContent = person.name;
    const character = document.createElement("span");
    character.textContent = textOrFallback(person.character, "Elenco");
    const copy = document.createElement("div");
    copy.className = "details-cast-copy";
    copy.append(name, character);
    member.append(copy);
    grid.append(member);
  });

  section.append(heading, grid);
  return section;
}

function renderDetails(movie, isLoading = false) {
  const title = textOrFallback(titleName(movie), titleOriginalName(movie));
  const detailsHero = document.createElement("div");
  detailsHero.className = "details-hero";

  if (movie.backdrop_path) {
    const backdrop = document.createElement("img");
    backdrop.className = "details-backdrop";
    backdrop.src = imageUrl(movie.backdrop_path, "original");
    backdrop.alt = "";
    detailsHero.append(backdrop);
  }

  const poster = document.createElement("div");
  poster.className = "details-poster";
  if (movie.poster_path) {
    const posterImage = document.createElement("img");
    posterImage.src = imageUrl(movie.poster_path);
    posterImage.alt = `Pôster de ${title}`;
    poster.append(posterImage);
  } else {
    poster.append(createPoster(null, title).firstChild);
  }

  const copy = document.createElement("div");
  copy.className = "details-copy";
  const heading = document.createElement("h2");
  heading.id = "details-title";
  heading.textContent = title;
  const originalTitle = document.createElement("p");
  originalTitle.className = "details-original";
  const originalName = titleOriginalName(movie);
  const hasOriginalTitle = originalName && originalName !== title;
  originalTitle.textContent = hasOriginalTitle ? `Título original: ${originalName}` : "";
  originalTitle.hidden = !hasOriginalTitle;

  const badges = document.createElement("div");
  badges.className = "details-badges";
  const rating = document.createElement("span");
  rating.className = "details-badge";
  rating.textContent = `★ ${formatRating(movie.vote_average)} TMDB`;
  const year = document.createElement("span");
  year.className = "details-badge";
  year.textContent = yearFromDate(titleDate(movie));
  const type = document.createElement("span");
  type.className = "details-badge";
  type.textContent = titleTypeLabel(movie);
  badges.append(rating, year, type);
  if (isLoading) {
    const loading = document.createElement("span");
    loading.className = "details-badge";
    loading.textContent = "Carregando detalhes...";
    badges.append(loading);
  }

  const actions = document.createElement("div");
  actions.className = "details-actions";
  actions.append(
    createDetailsAction(movie, "favorites", {
      idle: "Adicionar aos favoritos",
      selected: "Remover dos favoritos",
    }),
    createDetailsAction(movie, "watched", {
      idle: "Marcar como assistido",
      selected: "Remover de assistidos",
    }),
  );

  copy.append(heading, originalTitle, badges, actions);
  detailsHero.append(poster, copy);

  const body = document.createElement("div");
  body.className = "details-body";
  const main = document.createElement("div");
  main.className = "details-main";
  const overviewSection = document.createElement("div");
  const overviewHeading = document.createElement("h3");
  overviewHeading.textContent = "Sinopse";
  const overview = document.createElement("p");
  overview.className = "details-overview";
  overview.textContent = textOrFallback(movie.overview, "Sinopse não disponível em português para este título.");
  overviewSection.append(overviewHeading, overview);

  main.append(overviewSection);
  const trailerLink = createTrailerLink(movie);
  if (trailerLink) {
    const trailerSection = document.createElement("section");
    trailerSection.className = "details-trailer-section";
    const trailerHeading = document.createElement("h3");
    trailerHeading.textContent = "Vídeo";
    trailerSection.append(trailerHeading, trailerLink);
    main.append(trailerSection);
  }

  const castSection = createCastSection(movie);
  if (castSection) main.append(castSection);

  const facts = document.createElement("dl");
  facts.className = "details-facts";
  const isSeries = movie.media_type === "tv";
  const runtime = isSeries ? movie.episode_run_time?.[0] : movie.runtime;
  const countries = isSeries
    ? movie.origin_country?.join(", ")
    : movie.production_countries?.map((country) => country.name).join(", ");
  facts.append(
    createDetailFact(isSeries ? "Duração por episódio" : "Duração", formatRuntime(runtime)),
    createDetailFact(isSeries ? "Primeiro episódio" : "Lançamento", formatDate(titleDate(movie))),
    createDetailFact("Gêneros", movie.genres?.map((genre) => genre.name).join(", ") || "Não informado"),
    createDetailFact("Países de origem", countries || "Não informado"),
  );

  if (isSeries) {
    facts.append(
      createDetailFact("Temporadas", movie.number_of_seasons || "Não informado"),
      createDetailFact("Status", movie.status || "Não informado"),
    );
  }

  body.append(main, facts);
  elements.detailsContent.replaceChildren(detailsHero, body);
}

async function openDetails(movie) {
  const requestId = ++state.detailsRequestId;
  if (elements.modalBackdrop.hidden) {
    state.lastFocusedElement = document.activeElement;
  }
  elements.modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  renderDetails(movie, true);
  elements.modalClose.focus();

  try {
    const resource = movie.media_type === "tv" ? "tv" : "movie";
    const params = new URLSearchParams({
      language: "pt-BR",
      append_to_response: "credits,videos",
    });
    const details = await fetchJson(
      `${TMDB_BASE_URL}/${resource}/${encodeURIComponent(movie.id)}?${params.toString()}`,
      state.token,
    );
    if (requestId !== state.detailsRequestId) return;
    renderDetails({ ...details, media_type: movie.media_type });
  } catch (error) {
    if (requestId !== state.detailsRequestId) return;
    renderDetails(movie);
    setNotice("Não foi possível carregar todos os detalhes deste filme.", "error");
  }
}

function closeDetails() {
  state.detailsRequestId += 1;
  elements.modalBackdrop.hidden = true;
  elements.detailsContent.replaceChildren();
  if (elements.listModalBackdrop.hidden) {
    document.body.style.overflow = "";
    state.lastFocusedElement?.focus?.();
  } else {
    elements.listModalClose.focus();
  }
}

function renderMyListsView() {
  if (!elements.myListsContent) return;
  elements.myListsContent.replaceChildren();

  MY_LISTS_CONFIG.forEach(({ id, title }) => {
    const list = getList(id);
    const movies = Array.isArray(list?.movies) ? list.movies : [];

    const section = document.createElement("section");
    section.className = "my-lists-section";
    section.setAttribute("aria-labelledby", `my-list-heading-${id}`);

    const heading = document.createElement("div");
    heading.className = "section-heading";

    const titleGroup = document.createElement("div");
    titleGroup.className = "section-heading-main";
    const name = document.createElement("h2");
    name.id = `my-list-heading-${id}`;
    name.textContent = title;
    titleGroup.append(name);

    const count = document.createElement("p");
    count.className = "result-meta";
    count.textContent = `${movies.length} título${movies.length === 1 ? "" : "s"}`;
    heading.append(titleGroup, count);
    section.append(heading);

    if (movies.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state my-lists-empty-state";
      const message = document.createElement("p");
      message.textContent = "Nenhum filme adicionado";
      empty.append(message);
      section.append(empty);
    } else {
      const grid = document.createElement("div");
      grid.className = "movie-grid";
      const fragment = document.createDocumentFragment();
      movies.forEach((movie) => {
        fragment.append(
          createMovieCard(movie, {
            onDetails: openDetails,
            onContextMenu: (selectedMovie, event) =>
              listContextMenu.open(selectedMovie, event.clientX, event.clientY),
          }),
        );
      });
      grid.append(fragment);
      section.append(grid);
    }

    elements.myListsContent.append(section);
  });
}

function refreshLists() {
  state.lists = loadLists();
  persistLists(state.lists);
  renderLists();
  if (state.activeListId) renderListView(state.activeListId);
  if (getCurrentRoute().name === "minhas-listas") renderMyListsView();
}

globalThis.FhylHome = Object.freeze({
  openDetails,
  refreshLists,
});

elements.searchForm.addEventListener("submit", handleSearch);
elements.headerSearchForm?.addEventListener("submit", handleSearch);
elements.searchHomeLink.addEventListener("click", () => navigateToRoute("home"));
elements.brand?.addEventListener("click", (e) => {
  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    navigateToRoute("home");
  }
});
elements.onboardingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = elements.usernameInput.value.trim();
  if (!username) {
    elements.onboardingStatus.textContent = "Digite seu nome para continuar.";
    return;
  }

  localStorage.setItem("fhyl-username", username);
  navigateToRoute("home", {}, true);
});
elements.modalClose.addEventListener("click", closeDetails);
elements.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === elements.modalBackdrop) closeDetails();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.modalBackdrop.hidden) {
    closeDetails();
    return;
  }
  if (!elements.listModalBackdrop.hidden) closeListView();
});

elements.listModalClose.addEventListener("click", closeListView);
elements.listModalBackdrop.addEventListener("click", (event) => {
  if (event.target === elements.listModalBackdrop) closeListView();
});
window.addEventListener("hashchange", renderRoute);
window.addEventListener("popstate", renderRoute);

const categoryLoadMoreObserver = typeof IntersectionObserver === "function"
  ? new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) loadMoreCategoryResults();
  }, { rootMargin: "480px 0px" })
  : null;

state.token = normalizeToken(TMDB_TOKEN);
refreshLists();
renderRoute();

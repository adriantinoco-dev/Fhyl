const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const LISTS_STORAGE_KEY = "fhyl-prototype-lists-v1";

// Cole seu API Read Access Token entre as aspas para deixá-lo fixo no código.
// Este valor tem prioridade sobre o token salvo no navegador.
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyMjZkMTM3ZDk3M2YwNWVlMGQxY2Q0ZGM2NGM0OTEzZiIsIm5iZiI6MTc4OTA0NjYyMC4yMDg5OTk5LCJzdWIiOiI2YWEyYWY1Y2NjNTA1YmJhOGM3MTY2ZGQiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.ieEmSe-LrthHuohU04CyNFmDxGRLbf4V8TDx8L1Y41w";

const DEFAULT_LISTS = [
  { id: "watched", name: "Assistidos", type: "system", icon: "✓" },
  { id: "to-watch", name: "Quero Assistir", type: "system", icon: "＋" },
  { id: "shared", name: "Compartilhado", type: "system", icon: "◇" },
];

const state = {
  token: "",
  movies: [],
  lists: [],
  searchLanguage: "pt-BR",
  lastFocusedElement: null,
  lastListPickerFocus: null,
  selectedMovie: null,
  activeListId: null,
};

const elements = {
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-input"),
  notice: document.querySelector("#notice"),
  loadingState: document.querySelector("#loading-state"),
  emptyState: document.querySelector("#empty-state"),
  movieGrid: document.querySelector("#movie-grid"),
  resultMeta: document.querySelector("#result-meta"),
  createListButton: document.querySelector("#create-list-button"),
  createListForm: document.querySelector("#create-list-form"),
  listNameInput: document.querySelector("#list-name-input"),
  cancelListButton: document.querySelector("#cancel-list-button"),
  listFormStatus: document.querySelector("#list-form-status"),
  listsGrid: document.querySelector("#lists-grid"),
  listViewPanel: document.querySelector("#list-view-panel"),
  listViewTitle: document.querySelector("#list-view-title"),
  listViewGrid: document.querySelector("#list-view-grid"),
  listViewEmpty: document.querySelector("#list-view-empty"),
  closeListView: document.querySelector("#close-list-view"),
  listPickerBackdrop: document.querySelector("#list-picker-backdrop"),
  listPickerClose: document.querySelector("#list-picker-close"),
  listPickerTitle: document.querySelector("#list-picker-title"),
  listPickerDescription: document.querySelector("#list-picker-description"),
  listPickerOptions: document.querySelector("#list-picker-options"),
  listPickerStatus: document.querySelector("#list-picker-status"),
  modalBackdrop: document.querySelector("#modal-backdrop"),
  modalClose: document.querySelector("#modal-close"),
  detailsContent: document.querySelector("#details-content"),
};

function normalizeToken(value) {
  return value.trim().replace(/^Bearer\s+/i, "");
}

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

function createListId() {
  if (globalThis.crypto?.randomUUID) return `custom-${crypto.randomUUID()}`;
  return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadLists() {
  let storedLists = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LISTS_STORAGE_KEY) || "[]");
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

  const systemLists = DEFAULT_LISTS.map((list) => normalizeList(getStoredList(list.id), list));
  const customLists = storedLists
    .filter((list) => list && list.type === "custom" && typeof list.name === "string")
    .map((list) => ({
      id: typeof list.id === "string" ? list.id : createListId(),
      name: list.name.trim().slice(0, 40),
      type: "custom",
      icon: "✦",
      movieIds: normalizeMovies(list).map((movie) => movie.id),
      movies: normalizeMovies(list),
    }))
    .filter((list) => list.name);

  return [...systemLists, ...customLists];
}

function persistLists() {
  localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(state.lists));
}

function setListFormStatus(message = "", type = "") {
  elements.listFormStatus.textContent = message;
  elements.listFormStatus.className = `list-form-status ${type}`.trim();
}

function renderLists() {
  elements.listsGrid.replaceChildren();

  state.lists.forEach((list) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `list-card ${list.type === "system" ? "system-list" : "custom-list"}`;
    card.setAttribute("aria-label", `Abrir lista ${list.name}`);
    card.addEventListener("click", () => openListView(list.id));

    const icon = document.createElement("span");
    icon.className = "list-icon";
    icon.textContent = list.icon;
    icon.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "list-card-content";

    const name = document.createElement("h3");
    name.textContent = list.name;

    const type = document.createElement("p");
    type.className = "list-type";
    type.textContent = list.type === "system" ? "Lista modelo" : "Lista personalizada";

    const count = document.createElement("p");
    count.className = "list-count";
    const movieCount = Array.isArray(list.movies) ? list.movies.length : 0;
    count.textContent = `${movieCount} filme${movieCount === 1 ? "" : "s"}`;

    content.append(name, type, count);
    card.append(icon, content);
    elements.listsGrid.append(card);
  });
}

function getList(listId) {
  return state.lists.find((list) => list.id === listId);
}

function setListPickerStatus(message = "", type = "") {
  elements.listPickerStatus.textContent = message;
  elements.listPickerStatus.className = `list-picker-status ${type}`.trim();
}

function renderListPickerOptions() {
  elements.listPickerOptions.replaceChildren();
  if (!state.selectedMovie) return;

  state.lists.forEach((list) => {
    const movies = Array.isArray(list.movies) ? list.movies : [];
    const isAlreadyAdded = movies.some(
      (movie) => sameTitle(movie, state.selectedMovie),
    );
    const option = document.createElement("button");
    option.type = "button";
    option.className = `list-picker-option ${isAlreadyAdded ? "is-selected" : ""}`.trim();
    option.setAttribute("aria-pressed", String(isAlreadyAdded));

    const name = document.createElement("span");
    name.className = "list-picker-option-name";
    name.textContent = `${list.icon} ${list.name}`;

    const count = document.createElement("span");
    count.className = "list-picker-option-count";
    count.textContent = isAlreadyAdded
      ? "Adicionado"
      : `${movies.length} filme${movies.length === 1 ? "" : "s"}`;

    option.append(name, count);
    option.addEventListener("click", () => addMovieToList(list.id));
    elements.listPickerOptions.append(option);
  });
}

function openListPicker(movie) {
  state.selectedMovie = movie;
  state.lastListPickerFocus = document.activeElement;
  elements.listPickerTitle.textContent = "Adicionar à lista";
  elements.listPickerDescription.textContent = `Escolha onde guardar “${textOrFallback(titleName(movie), titleOriginalName(movie))}”.`;
  setListPickerStatus();
  renderListPickerOptions();
  elements.listPickerBackdrop.hidden = false;
  elements.listPickerClose.focus();
}

function closeListPicker() {
  elements.listPickerBackdrop.hidden = true;
  state.selectedMovie = null;
  elements.listPickerOptions.replaceChildren();
  setListPickerStatus();
  state.lastListPickerFocus?.focus?.();
}

function addMovieToList(listId) {
  const list = getList(listId);
  const movie = state.selectedMovie;
  if (!list || !movie) return;

  if (!Array.isArray(list.movies)) list.movies = [];
  const alreadyAdded = list.movies.some((item) => sameTitle(item, movie));
  if (alreadyAdded) {
    setListPickerStatus(`“${textOrFallback(titleName(movie), titleOriginalName(movie))}” já está nesta lista.`);
    return;
  }

  list.movies.push({ ...movie });
  list.movieIds = list.movies.map((item) => item.id);
  persistLists();
  renderLists();
  if (state.activeListId === list.id) renderListView(list.id);
  renderListPickerOptions();
  setListPickerStatus(`${titleTypeLabel(movie)} adicionada à lista “${list.name}”.`, "success");
}

function createListMovieItem(movie, listId) {
  const item = document.createElement("article");
  item.className = "list-movie-item";

  const poster = createPoster(movie.poster_path, textOrFallback(titleName(movie), titleOriginalName(movie)));
  const info = document.createElement("div");
  info.className = "list-movie-info";

  const title = document.createElement("h4");
  title.textContent = textOrFallback(titleName(movie), titleOriginalName(movie));

  const year = document.createElement("p");
  year.textContent = `${titleTypeLabel(movie)} · ${yearFromDate(titleDate(movie))}`;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-from-list-button";
  removeButton.textContent = "Remover";
  removeButton.addEventListener("click", () => removeMovieFromList(listId, movie));

  info.append(title, year, removeButton);
  item.append(poster, info);
  return item;
}

function renderListView(listId) {
  const list = getList(listId);
  if (!list) return;

  state.activeListId = listId;
  elements.listViewTitle.textContent = list.name;
  elements.listViewGrid.replaceChildren();
  const movies = Array.isArray(list.movies) ? list.movies : [];
  elements.listViewEmpty.hidden = movies.length > 0;

  const fragment = document.createDocumentFragment();
  movies.forEach((movie) => fragment.append(createListMovieItem(movie, list.id)));
  elements.listViewGrid.append(fragment);
}

function openListView(listId) {
  elements.listViewPanel.hidden = false;
  renderListView(listId);
  elements.listViewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeListView() {
  elements.listViewPanel.hidden = true;
  state.activeListId = null;
}

function removeMovieFromList(listId, movieToRemove) {
  const list = getList(listId);
  if (!list) return;
  list.movies = (list.movies || []).filter((movie) => !sameTitle(movie, movieToRemove));
  list.movieIds = list.movies.map((movie) => movie.id);
  persistLists();
  renderLists();
  renderListView(listId);
}

function toggleListForm(show) {
  elements.createListForm.hidden = !show;
  if (show) {
    setListFormStatus();
    elements.listNameInput.focus();
  } else {
    elements.createListForm.reset();
    setListFormStatus();
  }
}

function handleCreateList(event) {
  event.preventDefault();
  const name = elements.listNameInput.value.trim();
  if (!name) {
    setListFormStatus("Digite um nome para a lista.", "error");
    return;
  }

  const alreadyExists = state.lists.some(
    (list) => list.name.localeCompare(name, "pt-BR", { sensitivity: "base" }) === 0,
  );
  if (alreadyExists) {
    setListFormStatus("Já existe uma lista com esse nome.", "error");
    return;
  }

  state.lists.push({
    id: createListId(),
    name,
    type: "custom",
    icon: "✦",
    movieIds: [],
    movies: [],
  });
  persistLists();
  renderLists();
  toggleListForm(false);
  setNotice(`A lista “${name}” foi criada.`);
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

function createMovieCard(movie) {
  const title = textOrFallback(titleName(movie), titleOriginalName(movie));
  const card = document.createElement("article");
  card.className = "movie-card";

  const cardMain = document.createElement("button");
  cardMain.type = "button";
  cardMain.className = "movie-card-main";
  cardMain.setAttribute("aria-label", `Ver detalhes de ${title}`);
  cardMain.addEventListener("click", () => openDetails(movie));

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

  const actions = document.createElement("div");
  actions.className = "movie-card-actions";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "add-to-list-button";
  addButton.textContent = "+ Adicionar à lista";
  addButton.addEventListener("click", () => openListPicker(movie));
  actions.append(addButton);

  card.append(cardMain, actions);
  return card;
}

function renderMovies(movies, language) {
  state.movies = movies;
  elements.movieGrid.replaceChildren();
  elements.emptyState.hidden = movies.length > 0;

  if (!movies.length) {
    elements.resultMeta.textContent = "";
    return;
  }

  const languageLabel = language === "pt-BR" ? "pt-BR" : "en-US";
  elements.resultMeta.textContent = `${movies.length} resultado${movies.length === 1 ? "" : "s"} · ${languageLabel}`;
  const fragment = document.createDocumentFragment();
  movies.forEach((movie) => fragment.append(createMovieCard(movie)));
  elements.movieGrid.append(fragment);
}

async function fetchJson(url) {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${state.token}`,
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

async function searchTitles(query) {
  if (!state.token) {
    throw new Error("Antes de buscar, informe o API Read Access Token do TMDB.");
  }

  const search = async (language) => {
    const params = new URLSearchParams({
      query,
      language,
      include_adult: "false",
      page: "1",
    });
    return fetchJson(`${TMDB_BASE_URL}/search/multi?${params.toString()}`);
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

  state.searchLanguage = language;
  return {
    titles,
    language,
    totalResults: payload.total_results || 0,
  };
}

async function handleSearch(event) {
  event.preventDefault();
  const query = elements.searchInput.value.trim();
  if (!query) return;

  setNotice();
  setLoading(true);
  elements.resultMeta.textContent = "";

  try {
    const result = await searchTitles(query);
    setLoading(false);
    renderMovies(result.titles, result.language);

    if (!result.titles.length) {
      setNotice(`Não encontramos filmes para “${query}”. Tente outro nome ou título original.`);
    } else if (result.language === "en-US") {
      setNotice("A busca em pt-BR não encontrou resultados; exibindo correspondências em en-US.");
    }
  } catch (error) {
    setLoading(false);
    elements.emptyState.hidden = false;
    const message = error.status === 401 || error.status === 403
      ? "O token do TMDB foi recusado. Confira se você colou o API Read Access Token correto."
      : error.message;
    setNotice(message, "error");
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
  originalTitle.textContent = titleOriginalName(movie) && titleOriginalName(movie) !== title
    ? `Título original: ${titleOriginalName(movie)}`
    : "";

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

  copy.append(heading, originalTitle, badges);
  detailsHero.append(poster, copy);

  const body = document.createElement("div");
  body.className = "details-body";
  const overviewSection = document.createElement("div");
  const overviewHeading = document.createElement("h3");
  overviewHeading.textContent = "Sinopse";
  const overview = document.createElement("p");
  overview.className = "details-overview";
  overview.textContent = textOrFallback(movie.overview, "Sinopse não disponível em português para este título.");
  overviewSection.append(overviewHeading, overview);

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

  body.append(overviewSection, facts);
  elements.detailsContent.replaceChildren(detailsHero, body);
}

async function openDetails(movie) {
  state.lastFocusedElement = document.activeElement;
  elements.modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  renderDetails(movie, true);
  elements.modalClose.focus();

  try {
    const resource = movie.media_type === "tv" ? "tv" : "movie";
    const details = await fetchJson(`${TMDB_BASE_URL}/${resource}/${encodeURIComponent(movie.id)}?language=pt-BR`);
    renderDetails({ ...details, media_type: movie.media_type });
  } catch (error) {
    renderDetails(movie);
    setNotice("Não foi possível carregar todos os detalhes deste filme.", "error");
  }
}

function closeDetails() {
  elements.modalBackdrop.hidden = true;
  document.body.style.overflow = "";
  elements.detailsContent.replaceChildren();
  state.lastFocusedElement?.focus?.();
}

elements.searchForm.addEventListener("submit", handleSearch);
elements.modalClose.addEventListener("click", closeDetails);
elements.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === elements.modalBackdrop) closeDetails();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.listPickerBackdrop.hidden) {
    closeListPicker();
    return;
  }
  if (!elements.modalBackdrop.hidden) closeDetails();
});

elements.createListButton.addEventListener("click", () => toggleListForm(true));
elements.cancelListButton.addEventListener("click", () => toggleListForm(false));
elements.createListForm.addEventListener("submit", handleCreateList);
elements.closeListView.addEventListener("click", closeListView);
elements.listPickerClose.addEventListener("click", closeListPicker);
elements.listPickerBackdrop.addEventListener("click", (event) => {
  if (event.target === elements.listPickerBackdrop) closeListPicker();
});

state.lists = loadLists();
state.token = normalizeToken(TMDB_TOKEN);
renderLists();

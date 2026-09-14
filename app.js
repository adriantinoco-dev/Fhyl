const {
  TMDB_BASE_URL,
  TMDB_TOKEN,
  normalizeToken,
  titleName,
  titleOriginalName,
  titleDate,
  titleTypeLabel,
  loadLists,
  persistLists,
  removeMovieFromList: removeMovieFromListData,
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
} = globalThis.FhylShared;

const state = {
  token: "",
  movies: [],
  lists: [],
  lastFocusedElement: null,
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
  listsGrid: document.querySelector("#lists-grid"),
  listViewPanel: document.querySelector("#list-view-panel"),
  listViewTitle: document.querySelector("#list-view-title"),
  listViewGrid: document.querySelector("#list-view-grid"),
  listViewEmpty: document.querySelector("#list-view-empty"),
  closeListView: document.querySelector("#close-list-view"),
  modalBackdrop: document.querySelector("#modal-backdrop"),
  modalClose: document.querySelector("#modal-close"),
  detailsContent: document.querySelector("#details-content"),
  welcomeMessage: document.querySelector("#welcome-message"),
};

const listContextMenu = createListContextMenu({
  getLists: () => state.lists,
  onChange: ({ lists }) => {
    state.lists = lists;
    renderLists();
    if (state.activeListId) renderListView(state.activeListId);
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
    name.textContent = `${list.icon} ${list.name}`;
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
        item.append(
          createPoster(movie.poster_path, textOrFallback(titleName(movie), titleOriginalName(movie))),
        );
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
  removeButton.addEventListener("click", () => handleRemoveMovieFromList(listId, movie));

  info.append(title, year, removeButton);
  item.append(poster, info);
  listContextMenu.bind(item, movie);
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

function handleRemoveMovieFromList(listId, movieToRemove) {
  const list = getList(listId);
  if (!list) return;
  removeMovieFromListData(state.lists, listId, movieToRemove);
  persistLists(state.lists);
  renderLists();
  renderListView(listId);
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
  const query = elements.searchInput.value.trim();
  if (!query) return;

  const searchWindow = window.open(
    `search.html?q=${encodeURIComponent(query)}`,
    "fhylSearch",
    "width=900,height=700",
  );

  if (!searchWindow) {
    setNotice("Não foi possível abrir a janela de busca. Permita pop-ups para este site.", "error");
    return;
  }

  searchWindow.focus();
}

async function loadTrendingTitles() {
  setNotice();
  setLoading(true);

  try {
    const payload = await fetchJson(`${TMDB_BASE_URL}/trending/all/week?language=pt-BR`, state.token);
    const titles = (payload.results || []).filter(
      (result) => result.media_type === "movie" || result.media_type === "tv",
    );
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
    const details = await fetchJson(`${TMDB_BASE_URL}/${resource}/${encodeURIComponent(movie.id)}?language=pt-BR`, state.token);
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

function refreshLists() {
  state.lists = loadLists();
  persistLists(state.lists);
  renderLists();
  if (state.activeListId) renderListView(state.activeListId);
}

globalThis.FhylHome = Object.freeze({
  openDetails,
  refreshLists,
});

elements.searchForm.addEventListener("submit", handleSearch);
elements.modalClose.addEventListener("click", closeDetails);
elements.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === elements.modalBackdrop) closeDetails();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.modalBackdrop.hidden) closeDetails();
});

elements.closeListView.addEventListener("click", closeListView);

state.token = normalizeToken(TMDB_TOKEN);
const username = localStorage.getItem("fhyl-username")?.trim();
elements.welcomeMessage.textContent = username ? `Olá, ${username}` : "";
refreshLists();
loadTrendingTitles();

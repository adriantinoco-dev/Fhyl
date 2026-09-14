const {
  TMDB_TOKEN,
  normalizeToken,
  searchTitles,
  createMovieCard,
  createListContextMenu,
  loadLists,
} = globalThis.FhylShared;

const elements = {
  welcomeMessage: document.querySelector("#welcome-message"),
  searchTitle: document.querySelector("#search-title"),
  searchQuery: document.querySelector("#search-query"),
  notice: document.querySelector("#notice"),
  loadingState: document.querySelector("#loading-state"),
  emptyState: document.querySelector("#empty-state"),
  movieGrid: document.querySelector("#movie-grid"),
  resultMeta: document.querySelector("#result-meta"),
};

const query = new URLSearchParams(window.location.search).get("q")?.trim() || "";
const homeActions = window.opener?.FhylHome;
const listState = { lists: loadLists() };

function runHomeAction(action, movie) {
  action(movie);
  window.opener?.focus?.();
}

const listContextMenu = createListContextMenu({
  getLists: () => listState.lists,
  onChange: ({ lists }) => {
    listState.lists = lists;
    homeActions?.refreshLists?.();
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

function renderMovies(movies, language) {
  elements.movieGrid.replaceChildren();
  elements.emptyState.hidden = movies.length > 0;
  elements.resultMeta.textContent = movies.length
    ? `${movies.length} resultado${movies.length === 1 ? "" : "s"} · ${language}`
    : "";

  const fragment = document.createDocumentFragment();
  movies.forEach((movie) => fragment.append(createMovieCard(movie, {
    onDetails: typeof homeActions?.openDetails === "function"
      ? (selectedMovie) => runHomeAction(homeActions.openDetails, selectedMovie)
      : undefined,
    onContextMenu: (selectedMovie, event) => listContextMenu.open(
      selectedMovie,
      event.clientX,
      event.clientY,
    ),
  })));
  elements.movieGrid.append(fragment);
}

async function loadSearchResults() {
  if (!query) {
    elements.searchTitle.textContent = "Busca sem termo";
    elements.emptyState.hidden = false;
    setNotice("Informe um título na barra de busca da home.", "error");
    return;
  }

  elements.searchTitle.textContent = `Resultados para “${query}”`;
  elements.searchQuery.textContent = `Busca por “${query}”`;
  setNotice();
  setLoading(true);

  try {
    const result = await searchTitles(query, normalizeToken(TMDB_TOKEN));
    setLoading(false);
    renderMovies(result.titles, result.language);

    if (!result.titles.length) {
      setNotice(`Não encontramos filmes ou séries para “${query}”.`);
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

const username = localStorage.getItem("fhyl-username")?.trim();
elements.welcomeMessage.textContent = username ? `Olá, ${username}` : "";
loadSearchResults();

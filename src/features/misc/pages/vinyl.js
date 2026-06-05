const startBtn = document.getElementById("startBtn");
const exploreBtn = document.getElementById("exploreBtn");
const createAccountBtn = document.getElementById("createAccountBtn");

const spotifyInput = document.getElementById("spotifyInput");
const spotifySearchBtn = document.getElementById("spotifySearchBtn");
const spotifyResults = document.getElementById("spotifyResults");

startBtn.addEventListener("click", () => {
  document.querySelector("#spotify").scrollIntoView({
    behavior: "smooth"
  });
});

exploreBtn.addEventListener("click", () => {
  document.querySelector("#features").scrollIntoView({
    behavior: "smooth"
  });
});

createAccountBtn.addEventListener("click", () => {
  alert("Em breve: cadastro com Firebase!");
});

spotifySearchBtn.addEventListener("click", searchSpotify);

spotifyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchSpotify();
  }
});

async function searchSpotify() {
  const query = spotifyInput.value.trim();

  if (!query) {
    spotifyResults.innerHTML = `<p class="message">Digite uma musica, album ou artista.</p>`;
    return;
  }

  spotifyResults.innerHTML = `<p class="message">Buscando...</p>`;

  try {
    const response = await fetch(
      `/api/searchSpotify?query=${encodeURIComponent(query)}&type=album,track`
    );

    if (!response.ok) {
      throw new Error("Erro na busca do Spotify");
    }

    const data = await response.json();

    const albums = data.albums?.items || [];
    const tracks = data.tracks?.items || [];

    const items = [
      ...albums.map((album) => ({
        type: "Album",
        title: album.name,
        artist: album.artists.map((artist) => artist.name).join(", "),
        image: album.images?.[0]?.url,
        url: album.external_urls.spotify
      })),
      ...tracks.map((track) => ({
        type: "Musica",
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        image: track.album?.images?.[0]?.url,
        url: track.external_urls.spotify
      }))
    ];

    renderSpotifyResults(items.slice(0, 8));
  } catch (error) {
    console.error(error);
    spotifyResults.innerHTML = `
      <p class="message">
        Erro ao buscar no Spotify. Tente novamente em instantes.
      </p>
    `;
  }
}

function renderSpotifyResults(items) {
  spotifyResults.innerHTML = "";

  if (items.length === 0) {
    spotifyResults.innerHTML = `<p class="message">Nenhum resultado encontrado.</p>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.classList.add("spotify-card");

    card.innerHTML = `
      <img src="${escapeHTML(item.image || "")}" alt="${escapeHTML(item.title)}">
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.artist)}</p>
      <p>${escapeHTML(item.type)}</p>
      <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">Abrir no Spotify</a>
    `;

    spotifyResults.appendChild(card);
  });
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const revealElements = document.querySelectorAll(".feature-card, .cta, .spotify-search");

revealElements.forEach((element) => {
  element.classList.add("reveal");
});

function revealOnScroll() {
  const windowHeight = window.innerHeight;

  revealElements.forEach((element) => {
    const elementTop = element.getBoundingClientRect().top;

    if (elementTop < windowHeight - 100) {
      element.classList.add("active");
    }
  });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

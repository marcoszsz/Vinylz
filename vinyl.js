const startBtn = document.getElementById("startBtn");
const exploreBtn = document.getElementById("exploreBtn");
const createAccountBtn = document.getElementById("createAccountBtn");

const spotifyInput = document.getElementById("spotifyInput");
const spotifySearchBtn = document.getElementById("spotifySearchBtn");
const spotifyResults = document.getElementById("spotifyResults");

// Troque pelo seu token do Spotify
const SPOTIFY_TOKEN = "9be72c2e30f543f4964ab77b20a72449";

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
    spotifyResults.innerHTML = `<p class="message">Digite uma música, álbum ou artista.</p>`;
    return;
  }

  spotifyResults.innerHTML = `<p class="message">Buscando...</p>`;

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album,track&limit=8`,
      {
        headers: {
          Authorization: `Bearer ${SPOTIFY_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Erro na busca do Spotify");
    }

    const data = await response.json();

    const albums = data.albums?.items || [];
    const tracks = data.tracks?.items || [];

    const items = [
      ...albums.map((album) => ({
        type: "Álbum",
        title: album.name,
        artist: album.artists.map((artist) => artist.name).join(", "),
        image: album.images?.[0]?.url,
        url: album.external_urls.spotify
      })),
      ...tracks.map((track) => ({
        type: "Música",
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
        Erro ao buscar no Spotify. Verifique se o token está correto.
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
      <img src="${item.image || ""}" alt="${item.title}">
      <h3>${item.title}</h3>
      <p>${item.artist}</p>
      <p>${item.type}</p>
      <a href="${item.url}" target="_blank">Abrir no Spotify</a>
    `;

    spotifyResults.appendChild(card);
  });
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
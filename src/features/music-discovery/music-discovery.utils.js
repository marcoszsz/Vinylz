async function searchAlbums(query) {
  const grid = document.getElementById("communityGrid");
  const searchTerm = String(query || "").trim();

  if (!grid) return;

  if (!searchTerm) {
    grid.innerHTML = `<p class="message">Digite um album para buscar.</p>`;
    return;
  }

  grid.innerHTML = `<p class="message">Buscando...</p>`;

  try {
    const response = await fetch(
      `/api/searchSpotify?query=${encodeURIComponent(searchTerm)}&type=album`
    );

    if (!response.ok) {
      throw new Error(`Spotify search: ${response.status}`);
    }

    const data = await response.json();
    renderResults(data.albums?.items || []);
  } catch (error) {
    console.error("Erro ao buscar albuns:", error);
    grid.innerHTML = `<p class="message">Nao foi possivel buscar albuns agora.</p>`;
  }
}

function renderResults(albums) {
  const grid = document.getElementById("communityGrid");

  if (!grid) return;

  if (!albums.length) {
    grid.innerHTML = `<p class="message">Nenhum album encontrado.</p>`;
    return;
  }

  grid.innerHTML = "";

  albums.slice(0, 6).forEach((album) => {
    const card = document.createElement("div");
    const image = album.images?.[0]?.url || "";
    const artist = album.artists?.[0]?.name || "Artista";

    card.className = "album-card";
    card.innerHTML = `
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(album.name)}">` : ""}
      <p><strong>${escapeHtml(album.name)}</strong></p>
      <p style="font-size: 12px; color: #ccc;">${escapeHtml(artist)}</p>
      <div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
    `;

    card.addEventListener("click", () => {
      alert(`Voce selecionou: ${album.name}`);
    });

    grid.appendChild(card);
  });
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

document.getElementById("searchInput")?.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    searchAlbums(this.value);
  }
});

searchAlbums("2024");

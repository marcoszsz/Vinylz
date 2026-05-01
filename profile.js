import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut,
  deleteUser,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  setDoc,
  deleteDoc,
  deleteField,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   ELEMENTOS
========================= */

const logoutBtn = document.getElementById("logoutBtn");

const profileAvatar = document.getElementById("profileAvatar");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");

const followersCount = document.getElementById("followersCount");
const followingCount = document.getElementById("followingCount");
const reviewsCount = document.getElementById("reviewsCount");
const favoritesCount = document.getElementById("favoritesCount");

const favoriteGenresList = document.getElementById("favoriteGenresList");
const favoriteArtistsGrid = document.getElementById("favoriteArtistsGrid");
const hiddenArtistsGrid = document.getElementById("hiddenArtistsGrid");
const favoriteAlbumsGrid = document.getElementById("favoriteAlbumsGrid");

const genresSection = document.getElementById("genresSection");
const artistsSection = document.getElementById("artistsSection");
const hiddenArtistsSection = document.getElementById("hiddenArtistsSection");
const albumsSection = document.getElementById("albumsSection");
const activitySection = document.getElementById("activitySection");
const reviewsSection = document.getElementById("reviewsSection");
const privateProfileBox = document.getElementById("privateProfileBox");
const activityList = document.getElementById("activityList");

const messageBtn = document.getElementById("messageBtn");

const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileModal = document.getElementById("editProfileModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const editProfileForm = document.getElementById("editProfileForm");
const editDisplayName = document.getElementById("editDisplayName");
const editUsername = document.getElementById("editUsername");
const editPhotoFile = document.getElementById("editPhotoFile");
const editPhotoPreview = document.getElementById("editPhotoPreview");
const editBio = document.getElementById("editBio");

const openPrivacyModalBtn = document.getElementById("openPrivacyModalBtn");
const privacyModal = document.getElementById("privacyModal");
const closePrivacyModalBtn = document.getElementById("closePrivacyModalBtn");
const privacyForm = document.getElementById("privacyForm");

const privateProfileToggle = document.getElementById("privateProfileToggle");
const allowDirectMessagesToggle = document.getElementById("allowDirectMessagesToggle");
const showActivityToggle = document.getElementById("showActivityToggle");
const showFavoritesToggle = document.getElementById("showFavoritesToggle");
const showReviewsToggle = document.getElementById("showReviewsToggle");
const searchableProfileToggle = document.getElementById("searchableProfileToggle");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

let currentUser = null;
let currentUserData = null;
let profileUid = null;
let isOwnProfile = true;

const urlParams = new URLSearchParams(window.location.search);
const profileUidFromUrl = urlParams.get("uid");

const DEFAULT_AVATAR = "https://placehold.co/300x300/111111/ff4d6d?text=VINYL";

const DEFAULT_PRIVACY = {
  privateProfile: false,
  allowDirectMessages: true,
  showActivity: true,
  showFavorites: true,
  showReviews: true,
  searchableProfile: true
};

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  profileUid = profileUidFromUrl || user.uid;
  isOwnProfile = profileUid === user.uid;

  await loadProfile(profileUid);
});

/* =========================
   LOAD PROFILE
========================= */

async function loadProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      showMessage("Perfil não encontrado.");
      window.location.href = "home.html";
      return;
    }

    const publicUserData = userSnap.data();

    currentUserData = {
      uid,
      ...publicUserData,
      ...(isOwnProfile ? await loadPrivateSpotifyData(uid, publicUserData) : {})
    };

    const mergedPrivacy = {
      ...DEFAULT_PRIVACY,
      ...(currentUserData.privacy || {})
    };

    if (!currentUserData.privacy && isOwnProfile) {
      await setDoc(userRef, {
        privacy: mergedPrivacy,
        updatedAt: serverTimestamp()
      }, { merge: true });

      currentUserData.privacy = mergedPrivacy;
    } else {
      currentUserData.privacy = mergedPrivacy;
    }

    renderProfile(currentUserData);

    if (isOwnProfile) {
      renderPrivacyForm(currentUserData.privacy);
    }

    applyPrivacy(currentUserData.privacy);

    if (isOwnProfile) {
      loadCurrentSpotifyActivity(currentUserData);
    } else {
      renderSpotifyActivityMessage(`
        <span>♪</span>
        <p>Atividade do Spotify indisponível neste perfil.</p>
      `);
    }

  } catch (error) {
    console.error(error);
    showMessage("Erro ao carregar perfil.");
  }
}

/* =========================
   RENDER PROFILE
========================= */

function renderProfile(data) {
  const displayName = data.displayName || data.username || "Usuário Vinyl";
  const username = data.username || "usuario";
  const bio = data.bio || "Esse usuário ainda não escreveu uma bio musical.";

  if (profileDisplayName) profileDisplayName.textContent = displayName;
  if (profileUsername) profileUsername.textContent = `@${username}`;
  if (profileBio) profileBio.textContent = bio;

  if (profileAvatar) {
    profileAvatar.src = data.photoURL || DEFAULT_AVATAR;
    profileAvatar.onerror = () => {
      profileAvatar.src = DEFAULT_AVATAR;
    };
  }

  if (followersCount) followersCount.textContent = getArrayCount(data.followers);
  if (followingCount) followingCount.textContent = getArrayCount(data.following);
  if (reviewsCount) reviewsCount.textContent = getArrayCount(data.reviews);

  const visibleArtists = getVisibleArtists(data.favoriteArtists || [], data.hiddenArtists || []);

  if (favoritesCount) {
    favoritesCount.textContent =
      getArrayCount(visibleArtists) + getArrayCount(data.favoriteAlbums);
  }

  renderGenres(data.favoriteGenres || []);
  renderArtists(visibleArtists);
  renderHiddenArtists(isOwnProfile ? data.hiddenArtists || [] : []);
  renderAlbums(data.favoriteAlbums || []);

  if (isOwnProfile) {
    if (editDisplayName) editDisplayName.value = displayName;
    if (editUsername) editUsername.value = username;
    if (editPhotoPreview) editPhotoPreview.src = data.photoURL || DEFAULT_AVATAR;
    if (editBio) editBio.value = data.bio || "";
  }

  if (editProfileBtn) editProfileBtn.hidden = !isOwnProfile;
  if (openPrivacyModalBtn) openPrivacyModalBtn.hidden = !isOwnProfile;
  if (deleteAccountBtn) deleteAccountBtn.hidden = !isOwnProfile;

  if (messageBtn) {
    messageBtn.hidden = isOwnProfile;
  }
}

function renderGenres(genres) {
  if (!favoriteGenresList) return;

  favoriteGenresList.innerHTML = "";

  if (!genres.length) {
    favoriteGenresList.innerHTML = `<span class="empty-state">Nenhum gênero favorito ainda.</span>`;
    return;
  }

  genres.forEach((genre) => {
    const chip = document.createElement("span");
    chip.className = "genre-chip";
    chip.textContent = genre;
    favoriteGenresList.appendChild(chip);
  });
}

function renderArtists(artists) {
  if (!favoriteArtistsGrid) return;

  favoriteArtistsGrid.innerHTML = "";

  if (!artists.length) {
    favoriteArtistsGrid.innerHTML = `<span class="empty-state">Nenhum artista favorito ainda.</span>`;
    return;
  }

  artists.forEach((artist) => {
    const card = createFavoriteCard({
      title: artist.name || artist,
      subtitle: artist.genre || "Artista",
      image: artist.image || "",
      actionLabel: isOwnProfile ? "Ocultar" : "",
      actionTitle: `Ocultar ${artist.name || artist}`,
      onAction: isOwnProfile ? () => hideFavoriteArtist(artist) : null
    });

    favoriteArtistsGrid.appendChild(card);
  });
}

function renderHiddenArtists(artists) {
  if (!hiddenArtistsGrid || !hiddenArtistsSection) return;

  hiddenArtistsGrid.innerHTML = "";
  hiddenArtistsSection.hidden = !isOwnProfile || !artists.length || !currentUserData?.privacy?.showFavorites;

  if (!artists.length) {
    hiddenArtistsGrid.innerHTML = `<span class="empty-state">Nenhum artista oculto.</span>`;
    return;
  }

  artists.forEach((artist) => {
    const card = createFavoriteCard({
      title: artist.name || artist,
      subtitle: artist.genre || "Artista oculto",
      image: artist.image || "",
      actionLabel: "Restaurar",
      actionTitle: `Restaurar ${artist.name || artist}`,
      onAction: () => restoreHiddenArtist(artist)
    });

    hiddenArtistsGrid.appendChild(card);
  });
}

function renderAlbums(albums) {
  if (!favoriteAlbumsGrid) return;

  favoriteAlbumsGrid.innerHTML = "";

  if (!albums.length) {
    favoriteAlbumsGrid.innerHTML = `<span class="empty-state">Nenhum álbum favorito ainda.</span>`;
    return;
  }

  albums.forEach((album) => {
    const card = createFavoriteCard({
      title: album.title || album,
      subtitle: album.artist
        ? `${album.artist}${album.genre ? ` • ${album.genre}` : ""}`
        : "Álbum",
      image: album.image || ""
    });

    favoriteAlbumsGrid.appendChild(card);
  });
}

/* =========================
   SPOTIFY
========================= */

async function loadCurrentSpotifyActivity(userData, hasRetriedRefresh = false) {
  if (!activityList) return;

  if (!userData.spotifyConnected || !userData.spotifyToken) {
    renderSpotifyActivityMessage(`
      <span>♪</span>
      <p>Conecte o Spotify para mostrar o que voce esta ouvindo agora.</p>
    `);
    return;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${userData.spotifyToken}`
      }
    });

    if (response.status === 204) {
      renderSpotifyActivityMessage(`
        <span>♪</span>
        <p>Nada tocando no Spotify agora.</p>
      `);
      return;
    }

    if (response.status === 401 || response.status === 403) {
      if (!hasRetriedRefresh && userData.spotifyRefreshToken) {
        const refreshedData = await refreshSpotifyAccessToken(userData.spotifyRefreshToken);

        if (refreshedData) {
          await loadCurrentSpotifyActivity(refreshedData, true);
          return;
        }
      }

      markSpotifyNeedsReconnect();

      renderSpotifyActivityMessage(`
        <span>!</span>
        <div>
          <strong>Reconecte o Spotify</strong>
          <p>Atualizamos a integracao para mostrar sua musica em tempo real. E so reconectar uma vez.</p>
        </div>
        <a href="/api/spotifyLogin">Reconectar</a>
      `);
      return;
    }

    if (!response.ok) {
      throw new Error(`Spotify API: ${response.status}`);
    }

    const data = await response.json();
    const track = data.item;

    if (!track) {
      renderSpotifyActivityMessage(`
        <span>♪</span>
        <p>Nada tocando no Spotify agora.</p>
      `);
      return;
    }

    renderCurrentTrack({
      name: track.name || "Musica sem titulo",
      artist: track.artists?.map((artist) => artist.name).join(", ") || "Artista",
      album: track.album?.name || "",
      image: track.album?.images?.[0]?.url || DEFAULT_AVATAR,
      url: track.external_urls?.spotify || "#",
      isPlaying: Boolean(data.is_playing)
    });
  } catch (error) {
    console.error("Erro ao carregar atividade Spotify:", error);

    renderSpotifyActivityMessage(`
      <span>♪</span>
      <p>Nao foi possivel carregar o Spotify agora.</p>
    `);
  }
}

async function refreshSpotifyAccessToken(refreshToken) {
  try {
    const response = await fetch("/api/spotifyRefresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error(`Spotify refresh: ${response.status}`);
    }

    const data = await response.json();

    if (!data.accessToken) return null;

    const nextUserData = {
      ...currentUserData,
      spotifyConnected: true,
      spotifyToken: data.accessToken,
      spotifyRefreshToken: data.refreshToken || refreshToken,
      spotifyTokenRefreshedAt: new Date()
    };

    await setDoc(doc(db, "users", currentUser.uid, "private", "spotify"), {
      accessToken: nextUserData.spotifyToken,
      refreshToken: nextUserData.spotifyRefreshToken,
      tokenRefreshedAt: serverTimestamp(),
      tokenExpiresAt: Date.now() + (data.expiresIn || 3600) * 1000
    }, { merge: true });

    await setDoc(doc(db, "users", currentUser.uid), {
      spotifyConnected: true,
      spotifyToken: deleteField(),
      spotifyRefreshToken: deleteField(),
      spotifyTokenRefreshedAt: deleteField(),
      spotifyTokenExpiresAt: deleteField()
    }, { merge: true });

    currentUserData = nextUserData;

    return nextUserData;
  } catch (error) {
    console.error("Erro ao renovar token Spotify:", error);
    return null;
  }
}

function markSpotifyNeedsReconnect() {
  const spotifyStatus = document.getElementById("spotifyStatus");

  if (!spotifyStatus) return;

  spotifyStatus.textContent = "Spotify precisa reconectar";
  spotifyStatus.style.color = "#ffcc70";
}

async function loadPrivateSpotifyData(uid, publicUserData) {
  if (!isOwnProfile) return {};

  const privateSpotifyRef = doc(db, "users", uid, "private", "spotify");
  const privateSpotifySnap = await getDoc(privateSpotifyRef);

  let privateSpotifyData = privateSpotifySnap.exists()
    ? privateSpotifySnap.data()
    : {};

  if (publicUserData.spotifyToken || publicUserData.spotifyRefreshToken) {
    const accessToken = publicUserData.spotifyToken || privateSpotifyData.accessToken || "";
    const refreshToken = publicUserData.spotifyRefreshToken || privateSpotifyData.refreshToken || "";

    await setDoc(privateSpotifyRef, {
      accessToken,
      refreshToken,
      connectedAt: privateSpotifyData.connectedAt || serverTimestamp(),
      tokenRefreshedAt: serverTimestamp(),
      tokenExpiresAt: publicUserData.spotifyTokenExpiresAt || privateSpotifyData.tokenExpiresAt || null
    }, { merge: true });

    await setDoc(doc(db, "users", uid), {
      spotifyConnected: true,
      spotifyToken: deleteField(),
      spotifyRefreshToken: deleteField(),
      spotifyTokenRefreshedAt: deleteField(),
      spotifyTokenExpiresAt: deleteField()
    }, { merge: true });

    privateSpotifyData = {
      ...privateSpotifyData,
      accessToken,
      refreshToken,
      tokenExpiresAt: publicUserData.spotifyTokenExpiresAt || privateSpotifyData.tokenExpiresAt || null
    };
  }

  return {
    spotifyConnected: Boolean(
      publicUserData.spotifyConnected ||
      privateSpotifyData.accessToken ||
      privateSpotifyData.refreshToken
    ),
    spotifyToken: privateSpotifyData.accessToken || "",
    spotifyRefreshToken: privateSpotifyData.refreshToken || "",
    spotifyTokenExpiresAt: privateSpotifyData.tokenExpiresAt || null
  };
}

function renderCurrentTrack(track) {
  if (!activityList) return;

  activityList.innerHTML = `
    <article class="activity-card spotify-now-card">
      <img src="${escapeHTML(track.image)}" alt="${escapeHTML(track.name)}">

      <div class="spotify-now-content">
        <span>${track.isPlaying ? "Tocando agora" : "Pausado no Spotify"}</span>
        <strong>${escapeHTML(track.name)}</strong>
        <p>${escapeHTML(track.artist)}${track.album ? ` • ${escapeHTML(track.album)}` : ""}</p>
      </div>

      <a href="${escapeHTML(track.url)}" target="_blank" rel="noopener noreferrer">
        Spotify
      </a>
    </article>
  `;
}

function renderSpotifyActivityMessage(content) {
  if (!activityList) return;

  activityList.innerHTML = `
    <article class="activity-card spotify-empty-card">
      ${content}
    </article>
  `;
}

/* =========================
   FAVORITES
========================= */

function createFavoriteCard({ title, subtitle, image, actionLabel = "", actionTitle = "", onAction = null }) {
  const card = document.createElement("article");
  card.className = "favorite-card";

  const initials = getInitials(title);

  card.innerHTML = `
    <div class="favorite-cover">
      ${
        image
          ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" loading="lazy">`
          : `<span class="favorite-initials">${escapeHTML(initials)}</span>`
      }
    </div>

    <div class="favorite-content">
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(subtitle)}</p>
      ${
        onAction
          ? `<button class="favorite-action-btn" type="button" title="${escapeHTML(actionTitle || actionLabel)}">${escapeHTML(actionLabel)}</button>`
          : ""
      }
    </div>
  `;

  const img = card.querySelector("img");

  if (img) {
    img.addEventListener("error", () => {
      const cover = card.querySelector(".favorite-cover");
      cover.innerHTML = `<span class="favorite-initials">${escapeHTML(initials)}</span>`;
    });
  }

  const actionBtn = card.querySelector(".favorite-action-btn");

  actionBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    onAction?.();
  });

  return card;
}

async function hideFavoriteArtist(artist) {
  if (!isOwnProfile) return;
  if (!currentUser || !currentUserData) return;

  const favoriteArtists = currentUserData.favoriteArtists || [];
  const hiddenArtists = currentUserData.hiddenArtists || [];
  const artistKey = getArtistKey(artist);

  if (!artistKey) return;

  const nextFavoriteArtists = favoriteArtists.filter((item) => getArtistKey(item) !== artistKey);
  const alreadyHidden = hiddenArtists.some((item) => getArtistKey(item) === artistKey);
  const hiddenArtist = normalizeArtistForStorage(artist);

  const nextHiddenArtists = alreadyHidden
    ? hiddenArtists
    : [
        ...hiddenArtists,
        {
          ...hiddenArtist,
          hiddenAt: Date.now()
        }
      ];

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      favoriteArtists: nextFavoriteArtists,
      hiddenArtists: nextHiddenArtists,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await deleteDoc(doc(db, "users", currentUser.uid, "favorites", createFavoriteId("artist", hiddenArtist.id || artistKey)));

    currentUserData = {
      ...currentUserData,
      favoriteArtists: nextFavoriteArtists,
      hiddenArtists: nextHiddenArtists
    };

    renderProfile(currentUserData);
    showMessage("Artista ocultado.");
  } catch (error) {
    console.error(error);
    showMessage("Nao foi possivel ocultar o artista.");
  }
}

async function restoreHiddenArtist(artist) {
  if (!isOwnProfile) return;
  if (!currentUser || !currentUserData) return;

  const favoriteArtists = currentUserData.favoriteArtists || [];
  const hiddenArtists = currentUserData.hiddenArtists || [];
  const artistKey = getArtistKey(artist);

  if (!artistKey) return;

  const nextHiddenArtists = hiddenArtists.filter((item) => getArtistKey(item) !== artistKey);
  const alreadyFavorite = favoriteArtists.some((item) => getArtistKey(item) === artistKey);

  const nextFavoriteArtists = alreadyFavorite
    ? favoriteArtists
    : [
        ...favoriteArtists,
        normalizeArtistForStorage(artist)
      ];

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      favoriteArtists: nextFavoriteArtists,
      hiddenArtists: nextHiddenArtists,
      updatedAt: serverTimestamp()
    }, { merge: true });

    currentUserData = {
      ...currentUserData,
      favoriteArtists: nextFavoriteArtists,
      hiddenArtists: nextHiddenArtists
    };

    renderProfile(currentUserData);
    showMessage("Artista restaurado.");
  } catch (error) {
    console.error(error);
    showMessage("Nao foi possivel restaurar o artista.");
  }
}

function getVisibleArtists(artists, hiddenArtists) {
  return artists.filter((artist) => !isArtistHidden(artist, hiddenArtists));
}

function isArtistHidden(artist, hiddenArtists) {
  const artistKey = getArtistKey(artist);

  if (!artistKey) return false;

  return hiddenArtists.some((hiddenArtist) => getArtistKey(hiddenArtist) === artistKey);
}

function getArtistKey(artist) {
  if (!artist) return "";

  if (typeof artist === "string") return normalizeText(artist);

  return normalizeText(artist.id || artist.spotifyId || artist.name || "");
}

function normalizeArtistForStorage(artist) {
  if (typeof artist === "string") {
    return {
      name: artist,
      genre: "",
      image: ""
    };
  }

  return {
    ...artist,
    id: artist.id || artist.spotifyId || "",
    name: artist.name || "",
    genre: artist.genre || "",
    image: artist.image || ""
  };
}

function createFavoriteId(type, id) {
  return `${type}_${id}`;
}

/* =========================
   PRIVACY
========================= */

function renderPrivacyForm(privacy) {
  if (!isOwnProfile) return;

  if (privateProfileToggle) privateProfileToggle.checked = Boolean(privacy.privateProfile);
  if (allowDirectMessagesToggle) allowDirectMessagesToggle.checked = Boolean(privacy.allowDirectMessages);
  if (showActivityToggle) showActivityToggle.checked = Boolean(privacy.showActivity);
  if (showFavoritesToggle) showFavoritesToggle.checked = Boolean(privacy.showFavorites);
  if (showReviewsToggle) showReviewsToggle.checked = Boolean(privacy.showReviews);
  if (searchableProfileToggle) searchableProfileToggle.checked = Boolean(privacy.searchableProfile);
}

function applyPrivacy(privacy) {
  const isPrivate = Boolean(privacy.privateProfile);

  if (privateProfileBox) {
    privateProfileBox.hidden = !isPrivate;
  }

  if (genresSection) {
    genresSection.hidden = !privacy.showFavorites;
  }

  if (artistsSection) {
    artistsSection.hidden = !privacy.showFavorites;
  }

  if (hiddenArtistsSection) {
    hiddenArtistsSection.hidden =
      !isOwnProfile ||
      !privacy.showFavorites ||
      !(currentUserData?.hiddenArtists || []).length;
  }

  if (albumsSection) {
    albumsSection.hidden = !privacy.showFavorites;
  }

  if (activitySection) {
    activitySection.hidden = !privacy.showActivity;
  }

  if (reviewsSection) {
    reviewsSection.hidden = !privacy.showReviews;
  }

  if (messageBtn) {
    if (isOwnProfile) {
      messageBtn.hidden = true;
      return;
    }

    messageBtn.hidden = false;

    if (privacy.allowDirectMessages) {
      messageBtn.disabled = false;
      messageBtn.classList.remove("disabled");
      messageBtn.textContent = "Mensagem";
      messageBtn.title = "Enviar mensagem";
    } else {
      messageBtn.disabled = true;
      messageBtn.classList.add("disabled");
      messageBtn.textContent = "DM desativada";
      messageBtn.title = "Este usuário não aceita mensagens diretas.";
    }
  }
}

privacyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !isOwnProfile) return;

  const privacy = {
    privateProfile: Boolean(privateProfileToggle?.checked),
    allowDirectMessages: Boolean(allowDirectMessagesToggle?.checked),
    showActivity: Boolean(showActivityToggle?.checked),
    showFavorites: Boolean(showFavoritesToggle?.checked),
    showReviews: Boolean(showReviewsToggle?.checked),
    searchableProfile: Boolean(searchableProfileToggle?.checked)
  };

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      uid: currentUser.uid,
      privacy,
      updatedAt: serverTimestamp()
    }, { merge: true });

    currentUserData.privacy = privacy;

    applyPrivacy(privacy);
    closeModal(privacyModal);
    showMessage("Privacidade atualizada.");
  } catch (error) {
    console.error(error);
    showMessage("Não foi possível salvar a privacidade.");
  }
});

/* =========================
   EDIT PROFILE
========================= */

editPhotoFile?.addEventListener("change", () => {
  if (!isOwnProfile) return;

  const file = editPhotoFile.files?.[0];

  if (!file || !editPhotoPreview) return;

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    editPhotoPreview.src = reader.result;
  });

  reader.readAsDataURL(file);
});

editProfileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !isOwnProfile) return;

  const displayName = editDisplayName.value.trim() || currentUserData.username || "Usuário Vinyl";
  const username = normalizeUsername(editUsername?.value || currentUserData.username || displayName);
  const photoURL = editPhotoPreview?.src?.startsWith("data:")
    ? editPhotoPreview.src
    : currentUserData.photoURL || "";
  const bio = editBio.value.trim();

  if (username.length < 3) {
    showMessage("O nome de usuario precisa ter pelo menos 3 caracteres.");
    return;
  }

  try {
    await reserveUsername(username, displayName);

    await updateProfile(currentUser, {
      displayName,
      photoURL: photoURL || null
    });

    await setDoc(doc(db, "users", currentUser.uid), {
      uid: currentUser.uid,
      displayName,
      username,
      photoURL,
      bio,
      updatedAt: serverTimestamp()
    }, { merge: true });

    currentUserData = {
      ...currentUserData,
      displayName,
      username,
      photoURL,
      bio
    };

    renderProfile(currentUserData);
    closeModal(editProfileModal);
    showMessage("Perfil atualizado.");
  } catch (error) {
    console.error(error);

    showMessage(
      error.message === "username-unavailable"
        ? "Esse nome de usuario ja esta em uso."
        : "Não foi possível atualizar o perfil."
    );
  }
});

async function reserveUsername(username, displayName) {
  const currentUsername = normalizeUsername(currentUserData?.username || "");
  const usernameRef = doc(db, "usernames", username);
  const usernameSnap = await getDoc(usernameRef);

  if (usernameSnap.exists() && usernameSnap.data().uid !== currentUser.uid) {
    throw new Error("username-unavailable");
  }

  await setDoc(usernameRef, {
    uid: currentUser.uid,
    username,
    displayName,
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (!currentUsername || currentUsername === username) return;

  const previousUsernameRef = doc(db, "usernames", currentUsername);
  const previousUsernameSnap = await getDoc(previousUsernameRef);

  if (previousUsernameSnap.exists() && previousUsernameSnap.data().uid === currentUser.uid) {
    await deleteDoc(previousUsernameRef);
  }
}

/* =========================
   MODALS
========================= */

editProfileBtn?.addEventListener("click", () => {
  if (!isOwnProfile) return;
  openModal(editProfileModal);
});

closeEditModalBtn?.addEventListener("click", () => {
  closeModal(editProfileModal);
});

openPrivacyModalBtn?.addEventListener("click", () => {
  if (!isOwnProfile) return;
  openModal(privacyModal);
});

closePrivacyModalBtn?.addEventListener("click", () => {
  closeModal(privacyModal);
});

editProfileModal?.addEventListener("click", (event) => {
  if (event.target === editProfileModal) {
    closeModal(editProfileModal);
  }
});

privacyModal?.addEventListener("click", (event) => {
  if (event.target === privacyModal) {
    closeModal(privacyModal);
  }
});

function openModal(modal) {
  if (!modal) return;
  modal.hidden = false;
}

function closeModal(modal) {
  if (!modal) return;
  modal.hidden = true;
}

/* =========================
   ACTIONS
========================= */

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    showMessage("Erro ao sair da conta.");
  }
});

messageBtn?.addEventListener("click", () => {
  if (isOwnProfile) return;

  if (!profileUid) {
    showMessage("Usuário inválido.");
    return;
  }

  if (!currentUserData?.privacy?.allowDirectMessages) {
    showMessage("Este usuário não aceita mensagens diretas.");
    return;
  }

  window.location.href = `chat.html?uid=${encodeURIComponent(profileUid)}`;
});

deleteAccountBtn?.addEventListener("click", async () => {
  if (!currentUser || !currentUserData || !isOwnProfile) return;

  const confirmation = prompt(
    "Para excluir sua conta e apagar seus dados, digite EXCLUIR."
  );

  if (confirmation !== "EXCLUIR") {
    showMessage("Exclusao cancelada.");
    return;
  }

  const secondConfirmation = confirm(
    "Tem certeza? Seu perfil, favoritos, reviews, posts, stories e chats serao apagados."
  );

  if (!secondConfirmation) return;

  try {
    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = "Validando conta...";

    await reauthenticateForDeletion();

    deleteAccountBtn.textContent = "Apagando dados...";

    await deleteAccountData(currentUser.uid);
    await deleteUser(currentUser);

    localStorage.removeItem("vinylPrivacyAccepted");
    localStorage.removeItem("vinylPrivacyAcceptedAt");
    localStorage.removeItem("vinylPrivacyTermsVersion");

    window.location.href = "register.html";
  } catch (error) {
    console.error("Erro ao excluir conta:", error);

    if (error.message === "delete-cancelled" || error.code === "auth/popup-closed-by-user") {
      showMessage("Exclusao cancelada.");
    } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      showMessage("Senha incorreta. A conta nao foi apagada.");
    } else if (error.code === "auth/requires-recent-login") {
      showMessage("Por seguranca, entre novamente antes de excluir a conta.");
    } else {
      showMessage("Nao foi possivel excluir a conta agora.");
    }
  } finally {
    deleteAccountBtn.disabled = false;
    deleteAccountBtn.textContent = "Excluir minha conta";
  }
});

/* =========================
   DELETE ACCOUNT HELPERS
========================= */

async function deleteAccountData(uid) {
  const username = normalizeUsername(currentUserData?.username || "");

  await deleteFollowMirrorDocs(uid);

  await deleteUserSubcollection(uid, "favorites");
  await deleteUserSubcollection(uid, "reviews");
  await deleteUserSubcollection(uid, "following");
  await deleteUserSubcollection(uid, "followers");
  await deleteUserSubcollection(uid, "private");

  await deleteQueryDocs(query(collection(db, "posts"), where("userId", "==", uid)));
  await deleteQueryDocs(query(collection(db, "stories"), where("userId", "==", uid)));
  await deleteQueryDocs(query(collection(db, "reviews"), where("userId", "==", uid)));
  await deleteQueryDocs(query(collection(db, "feed"), where("userId", "==", uid)));
  await deleteQueryDocs(query(collection(db, "notifications"), where("toUserId", "==", uid)));

  await deleteUserChatDocs(uid);

  if (username) {
    await deleteDoc(doc(db, "usernames", username));
  }

  await deleteDoc(doc(db, "users", uid));
}

async function reauthenticateForDeletion() {
  const providers = currentUser?.providerData?.map((provider) => provider.providerId) || [];

  if (providers.includes("google.com")) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await reauthenticateWithPopup(currentUser, provider);
    return;
  }

  const password = prompt("Digite sua senha para confirmar a exclusao da conta.");

  if (!password) {
    throw new Error("delete-cancelled");
  }

  const credential = EmailAuthProvider.credential(currentUser.email, password);
  await reauthenticateWithCredential(currentUser, credential);
}

async function deleteUserSubcollection(uid, subcollectionName) {
  await deleteQueryDocs(collection(db, "users", uid, subcollectionName));
}

async function deleteUserChatDocs(uid) {
  const chatsSnap = await getDocs(
    query(collection(db, "chats"), where("members", "array-contains", uid))
  );

  for (const chatDoc of chatsSnap.docs) {
    await deleteQueryDocs(
      query(collection(db, "chats", chatDoc.id, "messages"), where("senderId", "==", uid))
    );

    await deleteDoc(doc(db, "chats", chatDoc.id));
  }
}

async function deleteFollowMirrorDocs(uid) {
  const followingSnap = await getDocs(collection(db, "users", uid, "following"));
  const followersSnap = await getDocs(collection(db, "users", uid, "followers"));

  for (const followingDoc of followingSnap.docs) {
    await deleteDoc(doc(db, "users", followingDoc.id, "followers", uid));
  }

  for (const followerDoc of followersSnap.docs) {
    await deleteDoc(doc(db, "users", followerDoc.id, "following", uid));
  }
}

async function deleteQueryDocs(targetQuery) {
  const snapshot = await getDocs(targetQuery);

  if (snapshot.empty) return;

  const batches = [];
  let batch = writeBatch(db);
  let operationCount = 0;

  snapshot.docs.forEach((snapshotDoc) => {
    batch.delete(snapshotDoc.ref);
    operationCount++;

    if (operationCount === 450) {
      batches.push(batch.commit());
      batch = writeBatch(db);
      operationCount = 0;
    }
  });

  if (operationCount > 0) {
    batches.push(batch.commit());
  }

  await Promise.all(batches);
}

/* =========================
   HELPERS
========================= */

function getArrayCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function getInitials(value) {
  return String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeUsername(value) {
  return normalizeText(value)
    .replace(/^@+/, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(message) {
  const toast = document.getElementById("toast");

  if (toast) {
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  } else {
    alert(message);
  }
}
import { apiClient } from '@services/api-client.js';

export class SpotifyService {
  static readonly API_BASE = 'https://api.spotify.com/v1';

  static async search(query, type = 'album,track,artist,playlist', limit = 20) {
    try {
      const result = await apiClient.get('/spotify/search', {
        query,
        type,
        limit: Math.min(limit, 50),
      });
      return result;
    } catch (error) {
      console.error('Erro ao buscar no Spotify:', error);
      throw error;
    }
  }

  static async getArtistDetails(artistId) {
    try {
      const result = await apiClient.get(`/spotify/artists/${artistId}`);
      return result;
    } catch (error) {
      console.error('Erro ao buscar artista:', error);
      throw error;
    }
  }

  static async getAlbumDetails(albumId) {
    try {
      const result = await apiClient.get(`/spotify/albums/${albumId}`);
      return result;
    } catch (error) {
      console.error('Erro ao buscar álbum:', error);
      throw error;
    }
  }

  static async getTrackDetails(trackId) {
    try {
      const result = await apiClient.get(`/spotify/tracks/${trackId}`);
      return result;
    } catch (error) {
      console.error('Erro ao buscar faixa:', error);
      throw error;
    }
  }

  static async getUserProfile() {
    try {
      const result = await apiClient.get('/spotify/me');
      return result;
    } catch (error) {
      console.error('Erro ao buscar perfil Spotify:', error);
      throw error;
    }
  }

  static async getRecentlyPlayed(limit = 20) {
    try {
      const result = await apiClient.get('/spotify/me/player/recently-played', { limit });
      return result.items || [];
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  }

  static async getCurrentlyPlaying() {
    try {
      const result = await apiClient.get('/spotify/me/player/currently-playing');
      return result;
    } catch (error) {
      console.error('Erro ao buscar música atual:', error);
      return null;
    }
  }

  static async getTopTracks(timeRange = 'medium_term', limit = 20) {
    try {
      const result = await apiClient.get('/spotify/me/top/tracks', {
        time_range: timeRange,
        limit,
      });
      return result.items || [];
    } catch (error) {
      console.error('Erro ao buscar top tracks:', error);
      return [];
    }
  }

  static async getTopArtists(timeRange = 'medium_term', limit = 20) {
    try {
      const result = await apiClient.get('/spotify/me/top/artists', {
        time_range: timeRange,
        limit,
      });
      return result.items || [];
    } catch (error) {
      console.error('Erro ao buscar top artistas:', error);
      return [];
    }
  }

  static async getWrappedData(year = new Date().getFullYear()) {
    try {
      const result = await apiClient.get('/spotify/wrapped', { year });
      return result;
    } catch (error) {
      console.error('Erro ao buscar Wrapped:', error);
      return null;
    }
  }
}

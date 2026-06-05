import { auth } from "./firebase.js";

class ApiClient {
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async getToken() {
    try {
      return await auth.currentUser?.getIdToken();
    } catch (error) {
      console.error("Erro ao obter token:", error);
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const token = await this.getToken();

    if (!token) {
      throw new Error("Usuário não autenticado");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erro em ${endpoint}:`, error);
      throw error;
    }
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params);
    const url = query.toString() ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: "GET" });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient("/api");

import { apiClient } from '@services/api-client.js';

export class UserControlService {
  static async isBlockedBetweenUsers(uid1, uid2) {
    if (!uid1 || !uid2 || uid1 === uid2) {
      return false;
    }

    try {
      const result = await apiClient.post('/users/blockCheck', { uid1, uid2 });
      return result.isBlocked || false;
    } catch (error) {
      console.error('Erro ao verificar bloqueio:', error);
      return false;
    }
  }

  static async canInteractWithUser(myUid, targetUid) {
    if (!myUid || !targetUid) {
      alert('Usuário inválido.');
      return false;
    }

    if (myUid === targetUid) {
      alert('Você não pode interagir consigo mesmo.');
      return false;
    }

    const blocked = await this.isBlockedBetweenUsers(myUid, targetUid);

    if (blocked) {
      alert('Essa interação não está disponível.');
      return false;
    }

    return true;
  }

  static async getIgnoredUsers(myUid) {
    try {
      const result = await apiClient.get(`/users/${myUid}/controls`);
      return result.ignored || [];
    } catch (error) {
      console.error('Erro ao buscar usuários ignorados:', error);
      return [];
    }
  }

  static async blockUser(targetUid, durationMs = null) {
    try {
      await apiClient.post(`/users/block`, {
        targetUid,
        durationMs,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async unblockUser(targetUid) {
    try {
      await apiClient.post(`/users/unblock`, { targetUid });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async muteUser(targetUid, durationMs = null) {
    try {
      await apiClient.post(`/users/mute`, {
        targetUid,
        durationMs,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async unmuteUser(targetUid) {
    try {
      await apiClient.post(`/users/unmute`, { targetUid });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

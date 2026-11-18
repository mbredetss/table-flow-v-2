import { Pool } from 'pg';

class AuthenticationRepositories {
  constructor() {
    this.pool = new Pool();
  }

  async addRefreshToken(userId, refreshToken, expiresAt) {
    await this.pool.query(
      `INSERT INTO authentications (user_id, refresh_token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, refreshToken, expiresAt]
    );
  }

  async findRefreshToken(refreshToken) {
    const result = await this.pool.query(
      `SELECT id, user_id, expires_at
       FROM authentications
       WHERE refresh_token = $1`,
      [refreshToken]
    );

    return result.rows[0];
  }

  async deleteRefreshToken(refreshToken) {
    await this.pool.query(
      'DELETE FROM authentications WHERE refresh_token = $1',
      [refreshToken]
    );
  }
}

export default new AuthenticationRepositories();

import { Pool } from 'pg';

const pool = new Pool();

const AuthenticationsTableTestHelper = {
  async addRefreshToken(userId, refreshToken, expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
    const query = {
      text: 'INSERT INTO authentications (user_id, refresh_token, expires_at) VALUES ($1, $2, $3) RETURNING *',
      values: [userId, refreshToken, expiresAt],
    };

    const result = await pool.query(query);
    return result.rows[0];
  },

  async findRefreshToken(refreshToken) {
    const query = {
      text: 'SELECT * FROM authentications WHERE refresh_token = $1',
      values: [refreshToken],
    };

    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async cleanTable() {
    await pool.query('TRUNCATE TABLE authentications CASCADE');
  },
};

export default AuthenticationsTableTestHelper;

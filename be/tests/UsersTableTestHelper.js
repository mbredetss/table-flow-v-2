import { Pool } from 'pg';

const pool = new Pool();

const UsersTableTestHelper = {
  async addUser({
    id = '00000000-0000-4000-8000-000000000001',
    name = 'Test Customer',
    email = 'customer@example.com',
    password = 'hashed_password_example',
    role = 'customer',
  } = {}) {
    const query = {
      text: 'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      values: [id, name, email, password, role],
    };

    const result = await pool.query(query);
    return result.rows[0];
  },

  async findUserById(id) {
    const query = {
      text: 'SELECT * FROM users WHERE id = $1',
      values: [id],
    };

    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async findUserByEmail(email) {
    const query = {
      text: 'SELECT * FROM users WHERE email = $1',
      values: [email],
    };

    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async cleanTable() {
    await pool.query('TRUNCATE TABLE authentications, users CASCADE');
  },
};

export default UsersTableTestHelper;

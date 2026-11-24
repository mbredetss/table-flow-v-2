import { Pool } from 'pg';

class UserRepositories {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async createUser(name, email, hashedPassword) {
    const result = await this.pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, name, email`,
      [name, email, hashedPassword]
    );

    return result.rows[0];
  }

  async findByEmail(email) {
    const result = await this.pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0];
  }

  async findById(id) {
    const result = await this.pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0];
  }
}

export default new UserRepositories();

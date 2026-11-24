import { Pool } from 'pg';

class TableRepositories {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async createTable({ table_number }) {
    const query = `
      INSERT INTO tables (table_number)
      VALUES ($1)
      RETURNING id, table_number, created_at
    `;
    const result = await this.pool.query(query, [table_number]);
    return result.rows[0];
  }

  async findTableById(id) {
    const query = 'SELECT id, table_number, created_at FROM tables WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findTableByNumber(tableNumber) {
    const query = 'SELECT id, table_number, created_at FROM tables WHERE table_number = $1';
    const result = await this.pool.query(query, [tableNumber]);
    return result.rows[0] || null;
  }

  async getTables() {
    const query = 'SELECT id, table_number, created_at FROM tables ORDER BY table_number ASC';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async deleteTable(id) {
    const query = 'DELETE FROM tables WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

export default new TableRepositories();

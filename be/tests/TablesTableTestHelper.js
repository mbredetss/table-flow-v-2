import { Pool } from 'pg';

const pool = new Pool();

const TablesTableTestHelper = {
  async addTable({
    id = '33333333-3333-4333-8333-333333333333',
    table_number = '1',
  } = {}) {
    const query = {
      text: 'INSERT INTO tables (id, table_number) VALUES ($1, $2) RETURNING *',
      values: [id, table_number],
    };

    const result = await pool.query(query);
    return result.rows[0];
  },

  async findTableById(id) {
    const query = {
      text: 'SELECT * FROM tables WHERE id = $1',
      values: [id],
    };

    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async findTableByNumber(tableNumber) {
    const query = {
      text: 'SELECT * FROM tables WHERE table_number = $1',
      values: [tableNumber],
    };

    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async cleanTable() {
    await pool.query('TRUNCATE TABLE tables CASCADE');
  },
};

export default TablesTableTestHelper;

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MenuTableTestHelper = {
  async addCategory({
    id = '11111111-1111-4111-8111-111111111111',
    name = 'Beverages',
  } = {}) {
    const query = {
      text: 'INSERT INTO menu_categories (id, name) VALUES ($1, $2) RETURNING *',
      values: [id, name],
    };

    const result = await pool.query(query);
    return result.rows[0];
  },

  async findCategoryById(id) {
    const query = {
      text: 'SELECT * FROM menu_categories WHERE id = $1',
      values: [id],
    };

    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async addItem({
    id = '22222222-2222-4222-8222-222222222222',
    category_id = '11111111-1111-4111-8111-111111111111',
    name = 'Iced Latte',
    description = 'Cold brew coffee with fresh milk',
    photo = 'https://example.com/iced-latte.jpg',
    price = 25000,
    is_available = true,
  } = {}) {
    const query = {
      text: `INSERT INTO menu_items (id, category_id, name, description, photo, price, is_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
      values: [id, category_id, name, description, photo, price, is_available],
    };

    const result = await pool.query(query);
    return result.rows[0];
  },

  async findItemById(id) {
    const query = {
      text: 'SELECT * FROM menu_items WHERE id = $1',
      values: [id],
    };

    const result = await pool.query(query);
    return result.rows[0] || null;
  },

  async updateItemPrice(id, price) {
    const query = {
      text: 'UPDATE menu_items SET price = $1, updated_at = now() WHERE id = $2 RETURNING *',
      values: [price, id],
    };

    const result = await pool.query(query);
    return result.rows[0];
  },

  async cleanTable() {
    await pool.query('TRUNCATE TABLE menu_items, menu_categories CASCADE');
  },
};

export default MenuTableTestHelper;

import { Pool } from 'pg';

class MenuRepositories {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async getCategories() {
    const result = await this.pool.query(
      'SELECT id, name, created_at FROM menu_categories ORDER BY name ASC'
    );
    return result.rows;
  }

  async getItems(categoryId) {
    let query = `SELECT mi.id, mi.category_id, mi.name, mi.description, mi.photo, mi.price,
                        mi.is_available, mc.name AS category, mi.created_at, mi.updated_at
                 FROM menu_items mi
                 JOIN menu_categories mc ON mi.category_id = mc.id`;
    const params = [];

    if (categoryId) {
      query += ' WHERE mi.category_id = $1';
      params.push(categoryId);
    }

    query += ' ORDER BY mc.name ASC, mi.name ASC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getItemById(id) {
    const result = await this.pool.query(
      `SELECT mi.id, mi.category_id, mi.name, mi.description, mi.photo, mi.price,
              mi.is_available, mc.name AS category, mi.created_at, mi.updated_at
       FROM menu_items mi
       JOIN menu_categories mc ON mi.category_id = mc.id
       WHERE mi.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async verifyCategoryExists(categoryId) {
    const result = await this.pool.query(
      'SELECT id FROM menu_categories WHERE id = $1',
      [categoryId]
    );
    return result.rowCount > 0;
  }

  async createItem({ category_id, name, description, photo, price }) {
    const query = `
      INSERT INTO menu_items (category_id, name, description, photo, price, is_available)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id
    `;
    const result = await this.pool.query(query, [category_id, name, description, photo, price]);
    return this.getItemById(result.rows[0].id);
  }

  async updateItem(id, updates) {
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }

    fields.push('updated_at = now()');
    values.push(id);

    const query = `
      UPDATE menu_items
      SET ${fields.join(', ')}
      WHERE id = $${index}
      RETURNING id
    `;

    const result = await this.pool.query(query, values);
    if (result.rowCount === 0) return null;
    return this.getItemById(id);
  }

  async toggleAvailability(id) {
    const query = `
      UPDATE menu_items
      SET is_available = NOT is_available, updated_at = now()
      WHERE id = $1
      RETURNING id, is_available
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async deleteItem(id) {
    const result = await this.pool.query('DELETE FROM menu_items WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async hasOrderReferences(id) {
    const result = await this.pool.query(
      'SELECT 1 FROM order_items WHERE menu_item_id = $1 LIMIT 1',
      [id]
    );
    return result.rowCount > 0;
  }
}

export default new MenuRepositories();

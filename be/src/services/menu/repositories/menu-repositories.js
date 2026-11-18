import { Pool } from 'pg';

class MenuRepositories {
  constructor() {
    this.pool = new Pool();
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
}

export default new MenuRepositories();

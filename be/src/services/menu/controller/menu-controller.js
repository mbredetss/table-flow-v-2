import { response } from '../../../utils/index.js';
import menuRepositories from '../repositories/menu-repositories.js';

export const getCategories = async (req, res) => {
  const categories = await menuRepositories.getCategories();
  return response(res, 200, null, categories);
};

export const getItems = async (req, res) => {
  const { category_id } = req.validatedQuery || {};

  if (category_id) {
    const exists = await menuRepositories.verifyCategoryExists(category_id);
    if (!exists) return response(res, 400, 'category_id tidak ditemukan', null);
  }

  const items = await menuRepositories.getItems(category_id);
  return response(res, 200, null, items);
};

export const getItemById = async (req, res) => {
  const { id } = req.params;

  try {
    const item = await menuRepositories.getItemById(id);
    if (!item) {
      return response(res, 404, 'Menu item tidak ditemukan', null);
    }

    return response(res, 200, null, item);
  } catch (err) {
    // PostgreSQL error 22P02: invalid input syntax for type uuid
    if (err.code === '22P02') return response(res, 404, 'Menu item tidak ditemukan', null);

    throw err;
  }
};

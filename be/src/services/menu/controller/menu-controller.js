import fs from 'fs';
import path from 'path';
import { response } from '../../../utils/index.js';
import menuRepositories from '../repositories/menu-repositories.js';
import { createMenuItemSchema, updateMenuItemSchema } from '../validator/schema.js';

const deleteFileIfLocal = (filePath) => {
  if (!filePath) return;
  try {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fullPath = path.resolve(process.cwd(), cleanPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Failed to delete file:', err);
  }
};

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
    if (err.code === '22P02') return response(res, 404, 'Menu item tidak ditemukan', null);
    throw err;
  }
};

export const getAdminItems = async (req, res) => {
  const items = await menuRepositories.getItems();
  return response(res, 200, null, items);
};

export const createMenuItem = async (req, res) => {
  const { error, value } = createMenuItemSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    if (req.file) deleteFileIfLocal(req.file.path);
    return response(res, 400, error.details[0].message, null);
  }

  if (!req.file) {
    return response(res, 400, 'Photo is required', null);
  }

  const { category_id, name, description, price } = value;

  const categoryExists = await menuRepositories.verifyCategoryExists(category_id);
  if (!categoryExists) {
    deleteFileIfLocal(req.file.path);
    return response(res, 404, 'Category not found', null);
  }

  const photo = `/uploads/menu/${req.file.filename}`;

  const createdItem = await menuRepositories.createItem({
    category_id,
    name,
    description,
    photo,
    price,
  });

  return response(res, 201, null, createdItem);
};

export const updateMenuItem = async (req, res) => {
  const { id } = req.params;

  let existingItem;
  try {
    existingItem = await menuRepositories.getItemById(id);
  } catch (err) {
    if (err.code === '22P02') existingItem = null;
    else throw err;
  }

  if (!existingItem) {
    if (req.file) deleteFileIfLocal(req.file.path);
    return response(res, 404, 'Menu item tidak ditemukan', null);
  }

  const { error, value } = updateMenuItemSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    if (req.file) deleteFileIfLocal(req.file.path);
    return response(res, 400, error.details[0].message, null);
  }

  const hasFields = Object.keys(value).length > 0;
  if (!hasFields && !req.file) {
    return response(res, 400, 'No fields to update', null);
  }

  if (value.category_id) {
    const categoryExists = await menuRepositories.verifyCategoryExists(value.category_id);
    if (!categoryExists) {
      if (req.file) deleteFileIfLocal(req.file.path);
      return response(res, 404, 'Category not found', null);
    }
  }

  const updates = { ...value };
  if (req.file) {
    updates.photo = `/uploads/menu/${req.file.filename}`;
    deleteFileIfLocal(existingItem.photo);
  }

  const updatedItem = await menuRepositories.updateItem(id, updates);
  return response(res, 200, null, updatedItem);
};

export const toggleAvailability = async (req, res) => {
  const { id } = req.params;

  let existingItem;
  try {
    existingItem = await menuRepositories.getItemById(id);
  } catch (err) {
    if (err.code === '22P02') existingItem = null;
    else throw err;
  }

  if (!existingItem) {
    return response(res, 404, 'Menu item tidak ditemukan', null);
  }

  const updated = await menuRepositories.toggleAvailability(id);
  return response(res, 200, null, updated);
};

export const deleteMenuItem = async (req, res) => {
  const { id } = req.params;

  let existingItem;
  try {
    existingItem = await menuRepositories.getItemById(id);
  } catch (err) {
    if (err.code === '22P02') existingItem = null;
    else throw err;
  }

  if (!existingItem) {
    return response(res, 404, 'Menu item tidak ditemukan', null);
  }

  const hasOrders = await menuRepositories.hasOrderReferences(id);
  if (hasOrders) {
    return response(
      res,
      409,
      'Cannot delete an item that appears in existing orders. Mark it as Sold Out instead.',
      null
    );
  }

  deleteFileIfLocal(existingItem.photo);
  await menuRepositories.deleteItem(id);

  return res.status(204).send();
};

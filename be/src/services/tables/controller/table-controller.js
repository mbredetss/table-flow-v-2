import QRCode from 'qrcode';
import { response } from '../../../utils/index.js';
import tableRepositories from '../repositories/table-repositories.js';
import { createTableSchema } from '../validator/schema.js';

export const createTable = async (req, res) => {
  const { error, value } = createTableSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    return response(res, 400, error.details[0].message, null);
  }

  const { table_number } = value;

  const existingTable = await tableRepositories.findTableByNumber(table_number);
  if (existingTable) {
    return response(res, 409, 'Table number already exists', null);
  }

  const createdTable = await tableRepositories.createTable({ table_number });
  return response(res, 201, null, createdTable);
};

export const getTables = async (req, res) => {
  const tables = await tableRepositories.getTables();
  return response(res, 200, null, tables);
};

export const deleteTable = async (req, res) => {
  const { id } = req.params;

  let existingTable;
  try {
    existingTable = await tableRepositories.findTableById(id);
  } catch (err) {
    if (err.code === '22P02') existingTable = null;
    else throw err;
  }

  if (!existingTable) {
    return response(res, 404, 'Table not found', null);
  }

  await tableRepositories.deleteTable(id);
  return res.status(204).send();
};

export const getTableQrCode = async (req, res) => {
  const { id } = req.params;

  let table;
  try {
    table = await tableRepositories.findTableById(id);
  } catch (err) {
    if (err.code === '22P02') table = null;
    else throw err;
  }

  if (!table) {
    return response(res, 404, 'Table not found', null);
  }

  const qrData = `table:${table.table_number}`;
  const qrBuffer = await QRCode.toBuffer(qrData, {
    type: 'png',
    errorCorrectionLevel: 'M',
  });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="table-${table.table_number}-qr.png"`
  );

  return res.send(qrBuffer);
};

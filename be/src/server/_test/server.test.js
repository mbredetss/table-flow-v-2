// File: ./src/server/_test/server.test.js
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { vi } from 'vitest';
import app from '../index.js';
import authenticate from '../../middlewares/authenticate.js';
import UsersTableTestHelper from '../../../tests/UsersTableTestHelper.js';
import AuthenticationsTableTestHelper from '../../../tests/AuthenticationsTableTestHelper.js';
import MenuTableTestHelper from '../../../tests/MenuTableTestHelper.js';
import TablesTableTestHelper from '../../../tests/TablesTableTestHelper.js';
import OrdersTableTestHelper from '../../../tests/OrdersTableTestHelper.js';
import PaymentsTableTestHelper from '../../../tests/PaymentsTableTestHelper.js';
import seedAdmin from '../../../scripts/seed-admin.js';

const { mockMidtransCharge } = vi.hoisted(() => ({
  mockMidtransCharge: vi.fn(),
}));

vi.mock('midtrans-client', () => {
  class CoreApi {
    constructor(config) {
      this.config = config;
    }

    charge(payload) {
      return mockMidtransCharge(payload);
    }
  }

  return {
    default: {
      CoreApi,
    },
    CoreApi,
  };
});

describe('HTTP Server', () => {

  const deleteUploadedFile = (photoPath) => {
    if (!photoPath) return;
    const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    const filePath = path.resolve(process.cwd(), cleanPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  };

  const getAdminAccessToken = async () => {
    await seedAdmin();
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      });
    return loginResponse.body?.data?.accessToken;
  };

  const getCustomerAccessToken = async ({
    id = '00000000-0000-4000-8000-000000000003',
    name = 'Customer Test',
    email = 'customer.auth.test@example.com',
    password = 'password123',
  } = {}) => {
    const hashedPassword = await bcrypt.hash(password, 12);
    await UsersTableTestHelper.addUser({
      id,
      name,
      email,
      password: hashedPassword,
      role: 'customer',
    });
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email,
        password,
      });
    return loginResponse.body?.data?.accessToken;
  };

  const getCashierAccessToken = async ({
    id = '00000000-0000-4000-8000-000000000006',
    name = 'Cashier Test',
    email = 'cashier.dashboard.test@example.com',
    password = 'password123',
  } = {}) => {
    const hashedPassword = await bcrypt.hash(password, 12);
    await UsersTableTestHelper.addUser({
      id,
      name,
      email,
      password: hashedPassword,
      role: 'cashier',
    });
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email,
        password,
      });
    return loginResponse.body?.data?.accessToken;
  };

  describe('when POST /users', () => {

    afterEach(async () => {
      await UsersTableTestHelper.cleanTable();
    });

    it('should response 201 when registering with valid request body', async () => {
      // Arrange
      const requestPayload = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      // Act
      const response = await request(app)
        .post('/users')
        .send(requestPayload);

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('name', requestPayload.name);
      expect(response.body.data.user).toHaveProperty('email', requestPayload.email);

      // Verify refreshToken cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes('refreshToken='))).toBe(true);
    });

    it('should response 409 when email is already registered', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({
        email: 'duplicate@example.com',
      });

      const requestPayload = {
        name: 'Jane Doe',
        email: 'duplicate@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      // Act
      const response = await request(app)
        .post('/users')
        .send(requestPayload);

      // Assert
      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message', 'Email already registered');
    });

    it('should response 400 when password and confirmPassword do not match', async () => {
      // Arrange
      const requestPayload = {
        name: 'Mismatched User',
        email: 'mismatch@example.com',
        password: 'password123',
        confirmPassword: 'differentpassword',
      };

      // Act
      const response = await request(app)
        .post('/users')
        .send(requestPayload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/Passwords do not match/i);
    });

    it('should response 400 when password is shorter than 8 characters', async () => {
      // Arrange
      const requestPayload = {
        name: 'Short Password User',
        email: 'short@example.com',
        password: 'short',
        confirmPassword: 'short',
      };

      // Act
      const response = await request(app)
        .post('/users')
        .send(requestPayload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/Password must be at least 8 characters/i);
    });

    it('should response 400 when name is missing', async () => {
      // Arrange
      const requestPayload = {
        email: 'noname@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      // Act
      const response = await request(app)
        .post('/users')
        .send(requestPayload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when POST /auth/login', () => {
    let user;
    const plainPassword = 'validPassword123';

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash(plainPassword, 12);
      user = await UsersTableTestHelper.addUser({
        email: 'login.success@example.com',
        password: hashedPassword,
        name: 'Login Success User',
      });
    });

    afterAll(async () => {
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 when credentials are correct', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: user.email,
          password: plainPassword,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id', user.id);
      expect(response.body.data.user).toHaveProperty('name', user.name);
      expect(response.body.data.user).toHaveProperty('email', user.email);

      // Verify refreshToken cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes('refreshToken='))).toBe(true);
    });

    it('should response 401 with generic message when password is wrong', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'incorrectPassword123',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should response 401 with generic message when email does not exist', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent.user@example.com',
          password: 'anyPassword123',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

  });

  describe('when POST /auth/refresh', () => {
    let user;

    beforeAll(async () => {
      user = await UsersTableTestHelper.addUser({
        email: 'refresh.valid@example.com',
      });
    });

    afterAll(async () => {
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    afterEach(async () => {
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 with new accessToken when refreshToken cookie is valid', async () => {
      // Arrange
      const refreshToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await AuthenticationsTableTestHelper.addRefreshToken(user.id, refreshToken, expiresAt);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.body.data.accessToken).toBeTruthy();
    });

    it('should response 401 when refreshToken cookie is missing', async () => {
      // Act
      const response = await request(app)
        .post('/auth/refresh');

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 401 when refreshToken is expired', async () => {
      // Arrange
      const expiredRefreshToken = crypto.randomUUID();
      const expiredAt = new Date(Date.now() - 60 * 1000); // 1 minute in the past
      await AuthenticationsTableTestHelper.addRefreshToken(user.id, expiredRefreshToken, expiredAt);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=${expiredRefreshToken}`]);

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 401 when refreshToken is invalid or revoked', async () => {
      // Arrange
      const nonExistentRefreshToken = crypto.randomUUID();

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=${nonExistentRefreshToken}`]);

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when DELETE /auth/logout', () => {

    afterEach(async () => {
      await AuthenticationsTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
    });

    it('should response 204 and clear cookie when valid refreshToken cookie is sent', async () => {
      // Arrange
      const user = await UsersTableTestHelper.addUser({
        email: 'logout.user@example.com',
      });
      const refreshToken = crypto.randomUUID();
      await AuthenticationsTableTestHelper.addRefreshToken(user.id, refreshToken);

      // Act
      const response = await request(app)
        .delete('/auth/logout')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      // Assert
      expect(response.status).toBe(204);

      // Verify token is deleted in authentications table
      const tokenInDb = await AuthenticationsTableTestHelper.findRefreshToken(refreshToken);
      expect(tokenInDb).toBeNull();

      // Subsequent refresh with same token must fail
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);
      expect(refreshResponse.status).toBe(401);
    });

    it('should response 204 when no refreshToken cookie is present', async () => {
      // Act
      const response = await request(app)
        .delete('/auth/logout');

      // Assert
      expect(response.status).toBe(204);
    });

  });

  describe('when GET /menu/categories', () => {

    afterEach(async () => {
      await MenuTableTestHelper.cleanTable();
    });

    it('should response 200 with array of categories ordered alphabetically', async () => {
      // Arrange
      await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Drinks',
      });
      await MenuTableTestHelper.addCategory({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Food',
      });

      // Act
      const response = await request(app)
        .get('/menu/categories');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // Validate required schema properties from OpenAPI spec: id, name, created_at
      response.body.data.forEach((category) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('created_at');
      });
    });

  });

  describe('when GET /menu/items', () => {

    afterEach(async () => {
      await MenuTableTestHelper.cleanTable();
    });

    it('should response 200 with all items containing required fields including availability', async () => {
      // Arrange
      const category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Food',
      });

      await MenuTableTestHelper.addItem({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        category_id: category.id,
        name: 'Nasi Goreng',
        description: 'Fried rice with egg and chicken',
        photo: 'https://example.com/nasgor.jpg',
        price: 25000,
        is_available: true,
      });

      await MenuTableTestHelper.addItem({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        category_id: category.id,
        name: 'Mie Goreng',
        description: 'Fried noodles (sold out)',
        photo: 'https://example.com/miegor.jpg',
        price: 22000,
        is_available: false,
      });

      // Act
      const response = await request(app)
        .get('/menu/items');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // Validate required schema properties from OpenAPI spec
      response.body.data.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('category_id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('photo');
        expect(item).toHaveProperty('price');
        expect(item).toHaveProperty('is_available');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('created_at');
        expect(item).toHaveProperty('updated_at');
      });

      // Confirm both available and sold-out items are returned
      const availableItem = response.body.data.find((item) => item.name === 'Nasi Goreng');
      const soldOutItem = response.body.data.find((item) => item.name === 'Mie Goreng');
      expect(availableItem.is_available).toBe(true);
      expect(soldOutItem.is_available).toBe(false);
    });

    it('should response 200 with items filtered by category_id', async () => {
      // Arrange
      const foodCategory = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Food',
      });
      const drinkCategory = await MenuTableTestHelper.addCategory({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Drinks',
      });

      await MenuTableTestHelper.addItem({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        category_id: foodCategory.id,
        name: 'Nasi Goreng',
      });
      await MenuTableTestHelper.addItem({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        category_id: drinkCategory.id,
        name: 'Es Teh Manis',
      });

      // Act
      const response = await request(app)
        .get('/menu/items')
        .query({ category_id: foodCategory.id });

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].category_id).toBe(foodCategory.id);
      expect(response.body.data[0].name).toBe('Nasi Goreng');
    });

    it('should response 400 when category_id query param is not a valid UUID', async () => {
      // Act
      const response = await request(app)
        .get('/menu/items')
        .query({ category_id: 'not-a-valid-uuid' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should return fresh updated data without stale cached values', async () => {
      // Arrange
      const category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Beverages',
      });
      const item = await MenuTableTestHelper.addItem({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        category_id: category.id,
        name: 'Americano',
        price: 20000,
      });

      // Act 1: Initial fetch
      const firstResponse = await request(app).get('/menu/items');
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.data[0].price).toBe(20000);

      // Mutate: Direct DB update to change price
      await MenuTableTestHelper.updateItemPrice(item.id, 25000);

      // Act 2: Fetch immediately without cache
      const secondResponse = await request(app).get('/menu/items');

      // Assert
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.headers['content-type']).toMatch(/application\/json/);
      expect(secondResponse.body).toBeTypeOf('object');
      expect(secondResponse.body).toHaveProperty('status', 'success');
      expect(secondResponse.body.data[0].price).toBe(25000);
    });

    it('should response 200 with empty array when no items exist', async () => {
      // Act
      const response = await request(app)
        .get('/menu/items');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    // TODO: No test case covers AC — "loading indicator is shown while menu data is being fetched"
    // TODO: No test case covers AC — "QR code scan successfully captures and stores the table number in the customer session"

  });

  describe('when GET /menu/items/:id', () => {

    afterEach(async () => {
      await MenuTableTestHelper.cleanTable();
    });

    it('should response 200 with full item detail when item exists', async () => {
      // Arrange
      const category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Desserts',
      });
      const item = await MenuTableTestHelper.addItem({
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        category_id: category.id,
        name: 'Cheesecake',
        description: 'New York style classic cheesecake',
        photo: 'https://example.com/cheesecake.jpg',
        price: 35000,
        is_available: true,
      });

      // Act
      const response = await request(app)
        .get(`/menu/items/${item.id}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', item.id);
      expect(response.body.data).toHaveProperty('category_id', category.id);
      expect(response.body.data).toHaveProperty('name', item.name);
      expect(response.body.data).toHaveProperty('description', item.description);
      expect(response.body.data).toHaveProperty('photo', item.photo);
      expect(response.body.data).toHaveProperty('price', item.price);
      expect(response.body.data).toHaveProperty('is_available', true);
      expect(response.body.data).toHaveProperty('category', category.name);
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
    });

    it('should response 404 when item id does not exist', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await request(app)
        .get(`/menu/items/${nonExistentId}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when POST /admin/menu/items', () => {
    let adminAccessToken;
    let category;
    let createdPhotoPath;

    beforeAll(async () => {
      adminAccessToken = await getAdminAccessToken();
      category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Main Course',
      });
    });

    afterAll(async () => {
      if (createdPhotoPath) {
        deleteUploadedFile(createdPhotoPath);
      }
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    afterEach(async () => {
      if (createdPhotoPath) {
        deleteUploadedFile(createdPhotoPath);
        createdPhotoPath = null;
      }
    });

    it('should response 201 with created menu item when request body is valid multipart', async () => {
      // Act
      const response = await request(app)
        .post('/admin/menu/items')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('name', 'Nasi Padang Komplit')
        .field('description', 'Authentic nasi padang with rendang and sambal')
        .field('price', 35000)
        .field('category_id', category.id)
        .attach('photo', Buffer.from('fake-image-content'), 'nasipadang.jpg');

      createdPhotoPath = response.body?.data?.photo;

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('category_id', category.id);
      expect(response.body.data).toHaveProperty('name', 'Nasi Padang Komplit');
      expect(response.body.data).toHaveProperty('description', 'Authentic nasi padang with rendang and sambal');
      expect(response.body.data).toHaveProperty('photo');
      expect(response.body.data).toHaveProperty('price', 35000);
      expect(response.body.data).toHaveProperty('is_available', true);
      expect(response.body.data).toHaveProperty('category', category.name);
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
    });

    it('should response 400 when missing name', async () => {
      // Act
      const response = await request(app)
        .post('/admin/menu/items')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('description', 'Delicious food without name')
        .field('price', 20000)
        .field('category_id', category.id)
        .attach('photo', Buffer.from('fake-image-content'), 'food.jpg');

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 400 when missing price', async () => {
      // Act
      const response = await request(app)
        .post('/admin/menu/items')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('name', 'Nasi Goreng')
        .field('description', 'Fried rice')
        .field('category_id', category.id)
        .attach('photo', Buffer.from('fake-image-content'), 'nasgor.jpg');

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 400 when missing category_id', async () => {
      // Act
      const response = await request(app)
        .post('/admin/menu/items')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('name', 'Nasi Goreng')
        .field('description', 'Fried rice')
        .field('price', 25000)
        .attach('photo', Buffer.from('fake-image-content'), 'nasgor.jpg');

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when PATCH /admin/menu/items/:id', () => {
    let adminAccessToken;
    let category;
    let item;

    beforeAll(async () => {
      adminAccessToken = await getAdminAccessToken();
      category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Food',
      });
      item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222222',
        category_id: category.id,
        name: 'Sate Ayam',
        price: 20000,
      });
    });

    afterAll(async () => {
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 with updated menu item when name is updated', async () => {
      // Act
      const response = await request(app)
        .patch(`/admin/menu/items/${item.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('name', 'Sate Ayam Madura');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', item.id);
      expect(response.body.data).toHaveProperty('category_id', category.id);
      expect(response.body.data).toHaveProperty('name', 'Sate Ayam Madura');
      expect(response.body.data).toHaveProperty('description', item.description);
      expect(response.body.data).toHaveProperty('photo', item.photo);
      expect(response.body.data).toHaveProperty('price', item.price);
      expect(response.body.data).toHaveProperty('is_available', true);
      expect(response.body.data).toHaveProperty('category', category.name);
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
    });

  });

  describe('when PATCH /admin/menu/items/:id/availability', () => {
    let adminAccessToken;
    let item;

    beforeAll(async () => {
      adminAccessToken = await getAdminAccessToken();
      const category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Drinks',
      });
      item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222222',
        category_id: category.id,
        name: 'Es Teh Manis',
        is_available: true,
      });
    });

    afterAll(async () => {
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 with is_available false when toggling an available item', async () => {
      // Act
      const response = await request(app)
        .patch(`/admin/menu/items/${item.id}/availability`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', item.id);
      expect(response.body.data).toHaveProperty('is_available', false);
    });

  });

  describe('when DELETE /admin/menu/items/:id', () => {
    let adminAccessToken;

    beforeAll(async () => {
      adminAccessToken = await getAdminAccessToken();
    });

    afterAll(async () => {
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    afterEach(async () => {
      await OrdersTableTestHelper.cleanTable();
      await MenuTableTestHelper.cleanTable();
    });

    it('should response 204 when deleting item with no order references', async () => {
      // Arrange
      const category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
      });
      const item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222222',
        category_id: category.id,
      });

      // Act
      const response = await request(app)
        .delete(`/admin/menu/items/${item.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Assert
      expect(response.status).toBe(204);
    });

    it('should response 409 when deleting item referenced in order_items', async () => {
      // Arrange
      const category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
      });
      const item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222222',
        category_id: category.id,
      });
      const customer = await UsersTableTestHelper.addUser({
        id: '00000000-0000-4000-8000-000000000002',
        email: 'buyer.orders@example.com',
      });
      const order = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444444',
        customer_id: customer.id,
      });
      await OrdersTableTestHelper.addOrderItem({
        order_id: order.id,
        menu_item_id: item.id,
      });

      // Act
      const response = await request(app)
        .delete(`/admin/menu/items/${item.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Assert
      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message', 'Cannot delete an item that appears in existing orders. Mark it as Sold Out instead.');
    });

  });

  describe('when POST /admin/tables', () => {
    let adminAccessToken;

    beforeAll(async () => {
      adminAccessToken = await getAdminAccessToken();
    });

    afterAll(async () => {
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    afterEach(async () => {
      await TablesTableTestHelper.cleanTable();
    });

    it('should response 201 with created table when table_number is unique', async () => {
      // Act
      const response = await request(app)
        .post('/admin/tables')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ table_number: '12' });

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('table_number', '12');
      expect(response.body.data).toHaveProperty('created_at');
    });

    it('should response 409 when table_number already exists', async () => {
      // Arrange
      await TablesTableTestHelper.addTable({ table_number: '12' });

      // Act
      const response = await request(app)
        .post('/admin/tables')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ table_number: '12' });

      // Assert
      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when DELETE /admin/tables/:id', () => {
    let adminAccessToken;

    beforeAll(async () => {
      adminAccessToken = await getAdminAccessToken();
    });

    afterAll(async () => {
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    afterEach(async () => {
      await TablesTableTestHelper.cleanTable();
    });

    it('should response 204 when deleting existing table', async () => {
      // Arrange
      const table = await TablesTableTestHelper.addTable({
        id: '33333333-3333-4333-8333-333333333333',
        table_number: '5',
      });

      // Act
      const response = await request(app)
        .delete(`/admin/tables/${table.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Assert
      expect(response.status).toBe(204);
    });

  });

  describe('when GET /admin/tables/:id/qrcode', () => {
    let adminAccessToken;
    let table;

    beforeAll(async () => {
      adminAccessToken = await getAdminAccessToken();
      table = await TablesTableTestHelper.addTable({
        id: '33333333-3333-4333-8333-333333333333',
        table_number: '5',
      });
    });

    afterAll(async () => {
      await TablesTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 with PNG image and attachment header when table exists', async () => {
      // Act
      const response = await request(app)
        .get(`/admin/tables/${table.id}/qrcode`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/image\/png/);
      expect(response.headers['content-disposition']).toMatch(/attachment;\s*filename="table-5-qr\.png"/);
      expect(response.body).toBeDefined();
    });

  });

  describe('when accessing /admin endpoints', () => {
    let customerAccessToken;

    beforeAll(async () => {
      customerAccessToken = await getCustomerAccessToken();
    });

    afterAll(async () => {
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 403 when accessed with customer JWT', async () => {
      // Act
      const response = await request(app)
        .get('/admin/tables')
        .set('Authorization', `Bearer ${customerAccessToken}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 401 when accessed without Authorization header', async () => {
      // Act
      const response = await request(app)
        .get('/admin/tables');

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when GET /menu/items (menu update reflection)', () => {
    let adminAccessToken;
    let createdPhotoPath;

    beforeAll(async () => {
      adminAccessToken = await getAdminAccessToken();
    });

    afterAll(async () => {
      if (createdPhotoPath) {
        deleteUploadedFile(createdPhotoPath);
      }
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    afterEach(async () => {
      if (createdPhotoPath) {
        deleteUploadedFile(createdPhotoPath);
        createdPhotoPath = null;
      }
      await MenuTableTestHelper.cleanTable();
    });

    it('should response 200 with item still in list and is_available false after toggling availability', async () => {
      // Arrange
      const category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Drinks',
      });
      const item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222222',
        category_id: category.id,
        name: 'Es Cendol',
        is_available: true,
      });

      // Admin toggles availability
      await request(app)
        .patch(`/admin/menu/items/${item.id}/availability`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Act
      const response = await request(app)
        .get('/menu/items');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);

      const foundItem = response.body.data.find((menuItem) => menuItem.id === item.id);
      expect(foundItem).toBeDefined();
      expect(foundItem.is_available).toBe(false);
    });

    it('should response 200 with newly created item immediately reflected without caching', async () => {
      // Arrange
      const category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Food',
      });

      // Admin creates new item
      const createResponse = await request(app)
        .post('/admin/menu/items')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('name', 'Rendang Sapi Spesial')
        .field('description', 'Slow-cooked beef rendang in rich coconut spices')
        .field('price', 40000)
        .field('category_id', category.id)
        .attach('photo', Buffer.from('fake-image-content'), 'rendang.jpg');

      createdPhotoPath = createResponse.body?.data?.photo;

      // Act
      const response = await request(app)
        .get('/menu/items');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);

      const foundItem = response.body.data.find((menuItem) => menuItem.name === 'Rendang Sapi Spesial');
      expect(foundItem).toBeDefined();
      expect(foundItem.price).toBe(40000);
    });

  });

  describe('when POST /orders', () => {
    let customerAccessToken;
    let category;
    let item;

    beforeAll(async () => {
      customerAccessToken = await getCustomerAccessToken();
      category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Food',
      });
      item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222222',
        category_id: category.id,
        name: 'Ayam Geprek',
        price: 25000,
        is_available: true,
      });
    });

    afterEach(async () => {
      await PaymentsTableTestHelper.cleanTable();
    });

    beforeEach(async () => {
      mockMidtransCharge.mockResolvedValue({
        status_code: '201',
        actions: [
          {
            name: 'generate-qr-code',
            method: 'GET',
            url: 'https://api.sandbox.midtrans.com/v2/qris/mock-qris.png',
          },
          {
            name: 'deeplink-redirect',
            method: 'GET',
            url: 'https://api.sandbox.midtrans.com/v2/qris/mock-deeplink.png',
          },
        ],
      });
    });

    afterAll(async () => {
      await OrdersTableTestHelper.cleanTable();
      await PaymentsTableTestHelper.cleanTable();
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    afterEach(async () => {
      await OrdersTableTestHelper.cleanTable();
    });

    it('should response 201 with payment details when payload is valid', async () => {
      // Arrange
      const requestPayload = {
        table_number: '12',
        payment_reference: 'ORDER-PAY-001',
        items: [
          {
            menu_item_id: item.id,
            quantity: 2,
            note: 'extra spicy',
          },
        ],
      };

      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.data.payment_id).toBe('string');
      expect(response.body.data).toHaveProperty('qris_url');
      expect(typeof response.body.data.qris_url).toBe('string');
      expect(response.body.data).toHaveProperty('expires_at');
      expect(typeof response.body.data.expires_at).toBe('string');
    });

    it('should response 201 with a new payment_id and new QRIS code when called again after expiry with same cart contents', async () => {
      // Arrange
      const requestPayload = {
        table_number: '12',
        payment_reference: 'ORDER-PAY-001',
        items: [
          {
            menu_item_id: item.id,
            quantity: 2,
            note: 'extra spicy',
          },
        ],
      };

      // Act 1: Initial call
      const firstResponse = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send(requestPayload);

      // Act 2: Re-initiate with same cart
      const secondResponse = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send(requestPayload);

      // Assert
      expect(secondResponse.status).toBe(201);
      expect(secondResponse.headers['content-type']).toMatch(/application\/json/);
      expect(secondResponse.body).toBeTypeOf('object');
      expect(secondResponse.body).toHaveProperty('status', 'success');
      expect(secondResponse.body).toHaveProperty('data');
      expect(secondResponse.body.data).toHaveProperty('payment_id');
      expect(secondResponse.body.data).toHaveProperty('qris_url');
      expect(secondResponse.body.data).toHaveProperty('expires_at');
      expect(secondResponse.body.data.payment_id).not.toBe(firstResponse.body?.data?.payment_id);
    });

    it('should response 400 when items is empty', async () => {
      // Arrange
      const requestPayload = {
        amount: 50000,
        table_number: '12',
        items: [],
      };

      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 401 when Authorization header is missing', async () => {
      // Act
      const response = await request(app)
        .post('/orders')
        .send({
          table_number: '12',
          payment_reference: 'ORDER-PAY-002',
          items: [
            {
              menu_item_id: item.id,
              quantity: 1,
            },
          ],
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 400 when items array is empty', async () => {
      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({
          table_number: '12',
          payment_reference: 'ORDER-PAY-003',
          items: [],
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 400 when table_number is missing', async () => {
      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({
          payment_reference: 'ORDER-PAY-004',
          items: [
            {
              menu_item_id: item.id,
              quantity: 1,
            },
          ],
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 400 when item quantity is 0', async () => {
      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({
          table_number: '12',
          payment_reference: 'ORDER-PAY-009',
          items: [
            {
              menu_item_id: item.id,
              quantity: 0,
            },
          ],
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 400 when note exceeds 255 characters', async () => {
      // Arrange
      const longNote = 'a'.repeat(256);

      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({
          table_number: '12',
          payment_reference: 'ORDER-PAY-010',
          items: [
            {
              menu_item_id: item.id,
              quantity: 1,
              note: longNote,
            },
          ],
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 404 when menu_item_id does not exist', async () => {
      // Arrange
      const nonExistentMenuItemId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({
          table_number: '12',
          payment_reference: 'ORDER-PAY-005',
          items: [
            {
              menu_item_id: nonExistentMenuItemId,
              quantity: 1,
            },
          ],
        });

      // Assert
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 422 with item name when menu item is sold out', async () => {
      // Arrange
      const soldOutItem = await MenuTableTestHelper.addItem({
        id: '77777777-7777-4777-8777-777777777777',
        category_id: category.id,
        name: 'Es Cendol',
        is_available: false,
      });

      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({
          table_number: '12',
          payment_reference: 'ORDER-PAY-006',
          items: [
            {
              menu_item_id: soldOutItem.id,
              quantity: 1,
            },
          ],
        });

      // Assert
      expect(response.status).toBe(422);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Es Cendol');
    });

    it('should response 502 with gateway-unavailable message when Midtrans API is unavailable', async () => {
      // Arrange: Midtrans error simulation
      mockMidtransCharge.mockRejectedValueOnce(new Error('Payment gateway timeout'));

      const requestPayload = {
        table_number: '12',
        payment_reference: 'ORDER-PAY-001',
        items: [
          {
            menu_item_id: item.id,
            quantity: 2,
            note: 'extra spicy',
          },
        ],
      };

      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toBe(502);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message', 'Payment gateway is unreachable. Please try again.');
    });

    it('should response 409 when payment_reference is duplicate', async () => {
      // Arrange
      await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444444',
        customer_id: '00000000-0000-4000-8000-000000000003',
        payment_reference: 'ORDER-PAY-DUPLICATE',
      });

      // Act
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({
          table_number: '12',
          payment_reference: 'ORDER-PAY-DUPLICATE',
          items: [
            {
              menu_item_id: item.id,
              quantity: 1,
            },
          ],
        });

      // Assert
      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when GET /orders/:id', () => {
    let customerId;
    let customerAccessToken;
    let otherCustomerAccessToken;
    let category;
    let item;
    let order;

    beforeAll(async () => {
      customerId = '00000000-0000-4000-8000-000000000003';
      customerAccessToken = await getCustomerAccessToken({
        id: customerId,
        name: 'Customer Test',
        email: 'customer.auth.test@example.com',
      });
      otherCustomerAccessToken = await getCustomerAccessToken({
        id: '00000000-0000-4000-8000-000000000004',
        name: 'Customer Other',
        email: 'customer.other@example.com',
      });

      category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111111',
      });
      item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222222',
        category_id: category.id,
        price: 25000,
      });
      order = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444444',
        customer_id: customerId,
        table_number: '12',
        payment_reference: 'ORDER-PAY-011',
        total_price: 25000,
        status: 'pending',
      });
      await OrdersTableTestHelper.addOrderItem({
        id: '55555555-5555-4555-8555-555555555555',
        order_id: order.id,
        menu_item_id: item.id,
        quantity: 1,
        note: 'extra lime',
        unit_price: 25000,
      });
    });

    afterAll(async () => {
      await OrdersTableTestHelper.cleanTable();
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 with full order detail when requested by owning customer', async () => {
      // Act
      const response = await request(app)
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${customerAccessToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', order.id);
      expect(response.body.data).toHaveProperty('customer_id', customerId);
      expect(response.body.data).toHaveProperty('table_number', '12');
      expect(response.body.data).toHaveProperty('total_price', 25000);
      expect(response.body.data).toHaveProperty('payment_reference', 'ORDER-PAY-011');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0]).toHaveProperty('id');
      expect(response.body.data.items[0]).toHaveProperty('order_id', order.id);
      expect(response.body.data.items[0]).toHaveProperty('menu_item_id', item.id);
      expect(response.body.data.items[0]).toHaveProperty('quantity', 1);
      expect(response.body.data.items[0]).toHaveProperty('note', 'extra lime');
      expect(response.body.data.items[0]).toHaveProperty('unit_price', 25000);
      expect(response.body.data.items[0]).toHaveProperty('created_at');
    });

    it('should response 403 when requested by a different authenticated customer', async () => {
      // Act
      const response = await request(app)
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${otherCustomerAccessToken}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 404 when order id does not exist', async () => {
      // Arrange
      const nonExistentOrderId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await request(app)
        .get(`/orders/${nonExistentOrderId}`)
        .set('Authorization', `Bearer ${customerAccessToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when POST /payments/webhook', () => {
    let customerId;
    let category;
    let item;
    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'test-midtrans-server-key';

    const generateSignature = (orderId, statusCode, grossAmount) => {
      return crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');
    };

    beforeAll(async () => {
      customerId = '00000000-0000-4000-8000-000000000003';
      await UsersTableTestHelper.addUser({
        id: customerId,
        name: 'Customer Webhook Test',
        email: 'customer.webhook@example.com',
        role: 'customer',
      });
      category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111112',
        name: 'Beverage',
      });
      item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222223',
        category_id: category.id,
        name: 'Iced Tea',
        price: 15000,
      });
    });

    afterAll(async () => {
      await OrdersTableTestHelper.cleanTable();
      await PaymentsTableTestHelper.cleanTable();
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
    });

    afterEach(async () => {
      await OrdersTableTestHelper.cleanTable();
      await PaymentsTableTestHelper.cleanTable();
    });

    it('should response 200, mark payment as paid, and create order when settlement payload has valid signature', async () => {
      // Arrange
      const midtransOrderId = 'TF-00000000-0000-4000-8000-000000000001';
      const payment = await PaymentsTableTestHelper.addPayment({
        id: '77777777-7777-4777-8777-777777777771',
        customer_id: customerId,
        midtrans_order_id: midtransOrderId,
        amount: 30000,
        status: 'pending',
        cart_snapshot: {
          table_number: '5',
          orderItemsData: [{
            menu_item_id: item.id,
            quantity: 2,
            note: 'less sugar',
            unit_price: 15000,
          }],
          total_price: 3000,
        },
      });

      const payload = {
        order_id: midtransOrderId,
        status_code: '200',
        gross_amount: '30000.00',
        transaction_status: 'settlement',
        signature_key: generateSignature(midtransOrderId, '200', '30000.00'),
      };

      // Act
      const response = await request(app)
        .post('/payments/webhook')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');

      // Verify payment status updated in DB
      const updatedPayment = await PaymentsTableTestHelper.findPaymentById(payment.id);
      expect(updatedPayment.status).toBe('paid');
      expect(updatedPayment.order_id).toBeTruthy();

      // Verify order created in DB
      const order = await OrdersTableTestHelper.findOrderById(updatedPayment.order_id);
      expect(order).toBeDefined();
      expect(order.customer_id).toBe(customerId);
      expect(order.table_number).toBe('5');
    });

    it('should response 200 and not create duplicate order when settlement is sent twice', async () => {
      // Arrange
      const midtransOrderId = 'TF-00000000-0000-4000-8000-000000000002';
      const existingOrder = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444445',
        customer_id: customerId,
        table_number: '5',
        payment_reference: midtransOrderId,
        total_price: 30000,
        status: 'pending',
      });

      await PaymentsTableTestHelper.addPayment({
        id: '77777777-7777-4777-8777-777777777772',
        customer_id: customerId,
        midtrans_order_id: midtransOrderId,
        amount: 30000,
        status: 'paid',
        order_id: existingOrder.id,
        cart_snapshot: {
          table_number: '5',
          items: [{ menu_item_id: item.id, quantity: 2 }],
        },
      });

      const payload = {
        order_id: midtransOrderId,
        status_code: '200',
        gross_amount: '30000.00',
        transaction_status: 'settlement',
        signature_key: generateSignature(midtransOrderId, '200', '30000.00'),
      };

      // Act
      const response = await request(app)
        .post('/payments/webhook')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');

      // Verify no duplicate order created
      const order = await OrdersTableTestHelper.findOrderById(existingOrder.id);
      expect(order).toBeDefined();
    });

    it('should response 200, mark payment as expired, and not create order when status is expire', async () => {
      // Arrange
      const midtransOrderId = 'TF-00000000-0000-4000-8000-000000000003';
      const payment = await PaymentsTableTestHelper.addPayment({
        id: '77777777-7777-4777-8777-777777777773',
        customer_id: customerId,
        midtrans_order_id: midtransOrderId,
        amount: 30000,
        status: 'pending',
        cart_snapshot: {
          table_number: '5',
          items: [{ menu_item_id: item.id, quantity: 2 }],
        },
      });

      const payload = {
        order_id: midtransOrderId,
        status_code: '200',
        gross_amount: '30000.00',
        transaction_status: 'expire',
        signature_key: generateSignature(midtransOrderId, '200', '30000.00'),
      };

      // Act
      const response = await request(app)
        .post('/payments/webhook')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');

      const updatedPayment = await PaymentsTableTestHelper.findPaymentById(payment.id);
      expect(updatedPayment.status).toBe('expired');
      expect(updatedPayment.order_id).toBeNull();
    });

    it('should response 200, mark payment as failed, and not create order when status is cancel or deny', async () => {
      // Arrange
      const midtransOrderId = 'TF-00000000-0000-4000-8000-000000000004';
      const payment = await PaymentsTableTestHelper.addPayment({
        id: '77777777-7777-4777-8777-777777777774',
        customer_id: customerId,
        midtrans_order_id: midtransOrderId,
        amount: 30000,
        status: 'pending',
        cart_snapshot: {
          table_number: '5',
          items: [{ menu_item_id: item.id, quantity: 2 }],
        },
      });

      const payload = {
        order_id: midtransOrderId,
        status_code: '200',
        gross_amount: '30000.00',
        transaction_status: 'cancel',
        signature_key: generateSignature(midtransOrderId, '200', '30000.00'),
      };

      // Act
      const response = await request(app)
        .post('/payments/webhook')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');

      const updatedPayment = await PaymentsTableTestHelper.findPaymentById(payment.id);
      expect(updatedPayment.status).toBe('failed');
      expect(updatedPayment.order_id).toBeNull();
    });

    it('should response 201 and snapshot unit_price in order_items correctly even when menu item price later changes', async () => {
      // Arrange
      const priceTestItem = await MenuTableTestHelper.addItem({
        id: '66666666-6666-4666-8666-666666666666',
        category_id: category.id,
        name: 'Nasi Bakar',
        price: 25000,
        is_available: true,
      });

      // Act 1: Add order at initial price 25000
      await UsersTableTestHelper.addUser();
      const orderTest = await OrdersTableTestHelper.addOrder();
      await PaymentsTableTestHelper.addPayment({
        order_id: orderTest.id, 
      });
      await OrdersTableTestHelper.addOrderItem({
        menu_item_id: priceTestItem.id
      });


      // Act 2: Later update menu item price to 35000
      await MenuTableTestHelper.updateItemPrice(priceTestItem.id, 35000);

      // Assert: Historical unit_price snapshot in order_items is still 25000
      const orderItems = await OrdersTableTestHelper.findOrderItemsByOrderId(orderTest.id);
      expect(orderItems).toHaveLength(1);
      expect(orderItems[0].unit_price).toBe(25000);
    });

    it('should response 400 when signature is invalid', async () => {
      // Arrange
      const payload = {
        order_id: 'TF-00000000-0000-4000-8000-000000000005',
        status_code: '200',
        gross_amount: '30000.00',
        transaction_status: 'settlement',
        signature_key: 'invalid-signature-hash-value',
      };

      // Act
      const response = await request(app)
        .post('/payments/webhook')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message', 'Invalid signature');
    });

  });

  describe('when GET /payments/:payment_id/status', () => {
    let customerId;
    let customerAccessToken;
    let otherCustomerAccessToken;
    let payment;

    beforeAll(async () => {
      customerId = '00000000-0000-4000-8000-000000000003';
      customerAccessToken = await getCustomerAccessToken({
        id: customerId,
        name: 'Customer Status Test',
        email: 'customer.status@example.com',
      });
      otherCustomerAccessToken = await getCustomerAccessToken({
        id: '00000000-0000-4000-8000-000000000004',
        name: 'Customer Other Status',
        email: 'customer.other.status@example.com',
      });

      payment = await PaymentsTableTestHelper.addPayment({
        id: '77777777-7777-4777-8777-777777777775',
        customer_id: customerId,
        midtrans_order_id: 'TF-00000000-0000-4000-8000-000000000006',
        amount: 25000,
        status: 'pending',
        cart_snapshot: { table_number: '1', items: [] },
      });
    });

    afterAll(async () => {
      await PaymentsTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 with payment status while awaiting payment', async () => {
      // Act
      const response = await request(app)
        .get(`/payments/${payment.id}/status`)
        .set('Authorization', `Bearer ${customerAccessToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('payment_id', payment.id);
      expect(response.body.data).toHaveProperty('status', 'pending');
    });

    it('should response 403 when payment is polled by a different customer', async () => {
      // Act
      const response = await request(app)
        .get(`/payments/${payment.id}/status`)
        .set('Authorization', `Bearer ${otherCustomerAccessToken}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 404 when payment_id does not exist', async () => {
      // Arrange
      const nonExistentPaymentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await request(app)
        .get(`/payments/${nonExistentPaymentId}/status`)
        .set('Authorization', `Bearer ${customerAccessToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when GET /orders', () => {
    // NOTE (TDD): OrdersTableTestHelper is at tests/OrdersTableTestHelper.js
    // It needs: addOrder(), addOrderItem(), findOrderById(), cleanTable()
    let cashierAccessToken;
    let customerAccessToken;
    let customerId;
    let category;
    let item;
    let pendingOrder1;
    let pendingOrder2;
    let preparingOrder;
    let readyOrder;
    let completedOrder;

    beforeAll(async () => {
      customerId = '00000000-0000-4000-8000-000000000007';
      cashierAccessToken = await getCashierAccessToken({
        id: '00000000-0000-4000-8000-000000000006',
        name: 'Cashier Orders Test',
        email: 'cashier.orders.test@example.com',
      });
      customerAccessToken = await getCustomerAccessToken({
        id: customerId,
        name: 'Customer Orders Test',
        email: 'customer.orders.test@example.com',
      });

      category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111113',
        name: 'Main Dish',
      });
      item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222224',
        category_id: category.id,
        name: 'Nasi Goreng Spesial',
        price: 30000,
        is_available: true,
      });

      // Older pending order
      pendingOrder1 = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444451',
        customer_id: customerId,
        table_number: '3',
        payment_reference: 'ORDER-REF-001',
        total_price: 30000,
        status: 'pending',
      });
      await OrdersTableTestHelper.addOrderItem({
        id: '55555555-5555-4555-8555-555555555561',
        order_id: pendingOrder1.id,
        menu_item_id: item.id,
        quantity: 1,
        note: 'pedas sedang',
        unit_price: 30000,
      });

      // Newer pending order
      pendingOrder2 = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444452',
        customer_id: customerId,
        table_number: '4',
        payment_reference: 'ORDER-REF-002',
        total_price: 60000,
        status: 'pending',
      });
      await OrdersTableTestHelper.addOrderItem({
        id: '55555555-5555-4555-8555-555555555562',
        order_id: pendingOrder2.id,
        menu_item_id: item.id,
        quantity: 2,
        note: 'tidak pedas',
        unit_price: 30000,
      });

      // Preparing order
      preparingOrder = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444453',
        customer_id: customerId,
        table_number: '5',
        payment_reference: 'ORDER-REF-003',
        total_price: 30000,
        status: 'preparing',
      });
      await OrdersTableTestHelper.addOrderItem({
        id: '55555555-5555-4555-8555-555555555563',
        order_id: preparingOrder.id,
        menu_item_id: item.id,
        quantity: 1,
        note: 'bungkus',
        unit_price: 30000,
      });

      // Ready order
      readyOrder = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444454',
        customer_id: customerId,
        table_number: '6',
        payment_reference: 'ORDER-REF-004',
        total_price: 30000,
        status: 'ready',
      });
      await OrdersTableTestHelper.addOrderItem({
        id: '55555555-5555-4555-8555-555555555564',
        order_id: readyOrder.id,
        menu_item_id: item.id,
        quantity: 1,
        note: null,
        unit_price: 30000,
      });

      // Completed order
      completedOrder = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444455',
        customer_id: customerId,
        table_number: '7',
        payment_reference: 'ORDER-REF-005',
        total_price: 30000,
        status: 'completed',
      });
      await OrdersTableTestHelper.addOrderItem({
        id: '55555555-5555-4555-8555-555555555565',
        order_id: completedOrder.id,
        menu_item_id: item.id,
        quantity: 1,
        note: null,
        unit_price: 30000,
      });
    });

    afterAll(async () => {
      await OrdersTableTestHelper.cleanTable();
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 with active orders grouped by status and sorted by created_at ascending when requested by cashier', async () => {
      // Act
      const response = await request(app)
        .get('/orders')
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('preparing');
      expect(response.body.data).toHaveProperty('ready');
      expect(Array.isArray(response.body.data.pending)).toBe(true);
      expect(Array.isArray(response.body.data.preparing)).toBe(true);
      expect(Array.isArray(response.body.data.ready)).toBe(true);
      expect(response.body.data.pending.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.preparing.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.ready.length).toBeGreaterThanOrEqual(1);

      response.body.data.pending.forEach((order) => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('customer_id');
        expect(order).toHaveProperty('table_number');
        expect(order).toHaveProperty('status');
        expect(order).toHaveProperty('total_price');
        expect(order).toHaveProperty('payment_reference');
        expect(order).toHaveProperty('created_at');
        expect(order).toHaveProperty('updated_at');
        expect(Array.isArray(order.items)).toBe(true);
        order.items.forEach((orderItem) => {
          expect(orderItem).toHaveProperty('id');
          expect(orderItem).toHaveProperty('order_id');
          expect(orderItem).toHaveProperty('menu_item_id');
          expect(orderItem).toHaveProperty('quantity');
          expect(orderItem).toHaveProperty('note');
          expect(orderItem).toHaveProperty('unit_price');
          expect(orderItem).toHaveProperty('created_at');
        });
      });

      const firstPending = response.body.data.pending[0];
      const secondPending = response.body.data.pending[1];
      expect(new Date(firstPending.created_at).getTime()).toBeLessThanOrEqual(new Date(secondPending.created_at).getTime());
    });

    it('should response 200 returning only active orders where status is not completed', async () => {
      // Act
      const response = await request(app)
        .get('/orders')
        .set('Authorization', `Bearer ${cashierAccessToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');

      const allActiveOrderIds = [
        ...response.body.data.pending.map((order) => order.id),
        ...response.body.data.preparing.map((order) => order.id),
        ...response.body.data.ready.map((order) => order.id),
      ];
      expect(allActiveOrderIds).not.toContain(completedOrder.id);
      expect(response.body.data.completed).toBeUndefined();
    });

    it('should response 401 when Authorization header is missing', async () => {
      // Act
      const response = await request(app)
        .get('/orders');

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 403 when accessed with customer token', async () => {
      // Act
      const response = await request(app)
        .get('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when GET /sse/dashboard', () => {
    let cashierAccessToken;
    let customerAccessToken;
    let customerId;
    let category;
    let item;

    beforeAll(async () => {
      cashierAccessToken = await getCashierAccessToken({
        id: '00000000-0000-4000-8000-000000000008',
        name: 'Cashier SSE Test',
        email: 'cashier.sse.test@example.com',
      });
      customerId = '00000000-0000-4000-8000-000000000009';
      customerAccessToken = await getCustomerAccessToken({
        id: customerId,
        name: 'Customer SSE Test',
        email: 'customer.sse.test@example.com',
      });

      category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111114',
        name: 'Snacks',
      });
      item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222225',
        category_id: category.id,
        name: 'French Fries',
        price: 20000,
        is_available: true,
      });
    });

    beforeEach(async () => {
      mockMidtransCharge.mockResolvedValue({
        status_code: '201',
        actions: [
          {
            name: 'generate-qr-code',
            method: 'GET',
            url: 'https://api.sandbox.midtrans.com/v2/qris/mock-qris.png',
          },
        ],
      });
    });

    afterEach(async () => {
      await OrdersTableTestHelper.cleanTable();
      await PaymentsTableTestHelper.cleanTable();
    });

    afterAll(async () => {
      await OrdersTableTestHelper.cleanTable();
      await PaymentsTableTestHelper.cleanTable();
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 with text/event-stream and keep connection open when token is valid cashier JWT', async () => {
      // Act & Assert
      await new Promise((resolve, reject) => {
        const sseRequest = request(app)
          .get('/sse/dashboard')
          .query({ token: cashierAccessToken })
          .buffer(false);

        sseRequest.on('response', (res) => {
          try {
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/event-stream/);
            sseRequest.abort();
            resolve();
          } catch (err) {
            sseRequest.abort();
            reject(err);
          }
        });

        sseRequest.on('error', (err) => {
          if (sseRequest.aborted) return;
          reject(err);
        });
      });
    });

    it('should receive new_order event with full order payload on connected cashier SSE client after order is placed', async () => {
      // Arrange
      const requestPayload = {
        table_number: '8',
        payment_reference: 'ORDER-PAY-SSE-02',
        items: [
          {
            menu_item_id: item.id,
            quantity: 1,
            note: 'extra mayo',
          },
        ],
      };

      let sseResponse = null;
      let receivedChunk = '';

      const ssePromise = new Promise((resolve, reject) => {
        const sseRequest = request(app)
          .get('/sse/dashboard')
          .query({ token: cashierAccessToken })
          .buffer(false);

        const timeout = setTimeout(() => {
          sseRequest.abort();
          resolve();
        }, 3000);

        sseRequest.on('response', (res) => {
          sseResponse = res;
          if (res.status !== 200) {
            clearTimeout(timeout);
            sseRequest.abort();
            return resolve();
          }

          res.on('data', (chunk) => {
            receivedChunk += chunk.toString();
            if (receivedChunk.includes('event: new_order')) {
              clearTimeout(timeout);
              sseRequest.abort();
              resolve();
            }
          });
        });

        sseRequest.on('error', (err) => {
          if (sseRequest.aborted) return;
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Act
      const postResponse = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send(requestPayload);

      await ssePromise;

      // Assert
      expect(postResponse.status).toBe(201);
      expect(sseResponse).not.toBeNull();
      expect(sseResponse.status).toBe(200);
      expect(sseResponse.headers['content-type']).toMatch(/text\/event-stream/);
      expect(receivedChunk).toContain('event: new_order');
      expect(receivedChunk).toContain('data:');
    });

    it('should response 401 when token query param is invalid or missing', async () => {
      // Act
      const response = await request(app)
        .get('/sse/dashboard')
        .query({ token: 'invalid-token' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 403 when token query param carries customer role', async () => {
      // Act
      const response = await request(app)
        .get('/sse/dashboard')
        .query({ token: customerAccessToken });

      // Assert
      expect(response.status).toBe(403);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  describe('when PATCH /orders/:id/status', () => {
    let cashierAccessToken;
    let customerId;
    let category;
    let item;
    let pendingOrder;

    beforeAll(async () => {
      cashierAccessToken = await getCashierAccessToken({
        id: '00000000-0000-4000-8000-000000000010',
        name: 'Cashier Patch Test',
        email: 'cashier.patch.test@example.com',
      });
      customerId = '00000000-0000-4000-8000-000000000011';
      await UsersTableTestHelper.addUser({
        id: customerId,
        name: 'Customer Patch Test',
        email: 'customer.patch.test@example.com',
        role: 'customer',
      });

      category = await MenuTableTestHelper.addCategory({
        id: '11111111-1111-4111-8111-111111111115',
        name: 'Dessert Patch',
      });
      item = await MenuTableTestHelper.addItem({
        id: '22222222-2222-4222-8222-222222222226',
        category_id: category.id,
        name: 'Pancake',
        price: 25000,
        is_available: true,
      });
    });

    beforeEach(async () => {
      pendingOrder = await OrdersTableTestHelper.addOrder({
        id: '44444444-4444-4444-8444-444444444461',
        customer_id: customerId,
        table_number: '9',
        payment_reference: 'ORDER-PAY-PATCH-01',
        total_price: 25000,
        status: 'pending',
      });
      await OrdersTableTestHelper.addOrderItem({
        id: '55555555-5555-4555-8555-555555555571',
        order_id: pendingOrder.id,
        menu_item_id: item.id,
        quantity: 1,
        note: 'extra maple syrup',
        unit_price: 25000,
      });
    });

    afterEach(async () => {
      await OrdersTableTestHelper.cleanTable();
    });

    afterAll(async () => {
      await OrdersTableTestHelper.cleanTable();
      await MenuTableTestHelper.cleanTable();
      await UsersTableTestHelper.cleanTable();
      await AuthenticationsTableTestHelper.cleanTable();
    });

    it('should response 200 and advance order status to preparing while emitting order_status_updated event', async () => {
      // Arrange
      let sseResponse = null;
      let receivedChunk = '';

      const ssePromise = new Promise((resolve, reject) => {
        const sseRequest = request(app)
          .get('/sse/dashboard')
          .query({ token: cashierAccessToken })
          .buffer(false);

        const timeout = setTimeout(() => {
          sseRequest.abort();
          resolve();
        }, 3000);

        sseRequest.on('response', (res) => {
          sseResponse = res;
          if (res.status !== 200) {
            clearTimeout(timeout);
            sseRequest.abort();
            return resolve();
          }

          res.on('data', (chunk) => {
            receivedChunk += chunk.toString();
            if (receivedChunk.includes('event: order_status_updated')) {
              clearTimeout(timeout);
              sseRequest.abort();
              resolve();
            }
          });
        });

        sseRequest.on('error', (err) => {
          if (sseRequest.aborted) return;
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Act
      const response = await request(app)
        .patch(`/orders/${pendingOrder.id}/status`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({ status: 'preparing' });

      await ssePromise;

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', pendingOrder.id);
      expect(response.body.data).toHaveProperty('customer_id');
      expect(response.body.data).toHaveProperty('table_number');
      expect(response.body.data).toHaveProperty('status', 'preparing');
      expect(response.body.data).toHaveProperty('total_price');
      expect(response.body.data).toHaveProperty('payment_reference');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
      expect(Array.isArray(response.body.data.items)).toBe(true);

      const updatedOrder = await OrdersTableTestHelper.findOrderById(pendingOrder.id);
      expect(updatedOrder.status).toBe('preparing');

      expect(sseResponse).not.toBeNull();
      expect(sseResponse.status).toBe(200);
      expect(sseResponse.headers['content-type']).toMatch(/text\/event-stream/);
      expect(receivedChunk).toContain('event: order_status_updated');
      expect(receivedChunk).toContain('data:');
    });

    it('should response 400 when status is invalid or set back to pending', async () => {
      // Act
      const response = await request(app)
        .patch(`/orders/${pendingOrder.id}/status`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({ status: 'pending' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

    it('should response 422 when attempting an invalid status transition', async () => {
      // Act
      const response = await request(app)
        .patch(`/orders/${pendingOrder.id}/status`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({ status: 'completed' });

      // Assert
      expect(response.status).toBe(422);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/Invalid status transition/i);
    });

    it('should response 404 when order id does not exist', async () => {
      // Arrange
      const nonExistentOrderId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await request(app)
        .patch(`/orders/${nonExistentOrderId}/status`)
        .set('Authorization', `Bearer ${cashierAccessToken}`)
        .send({ status: 'preparing' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });

  });

  // TODO: No test case covers AC — "audio notification and visual highlight when a new order arrives"

  // TODO: No test case covers AC — "payment success screen shows order number and confirmation message"
  // TODO: No test case covers AC — "QRIS code expires after 15 minutes — a countdown timer is displayed"
  // TODO: No test case covers AC — "cart is not cleared after a payment timeout — customer can retry from the same cart"

});

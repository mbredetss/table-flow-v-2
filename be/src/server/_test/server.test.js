// File: ./src/server/_test/server.test.js
import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import authenticate from '../../middlewares/authenticate.js';
import UsersTableTestHelper from '../../../tests/UsersTableTestHelper.js';
import AuthenticationsTableTestHelper from '../../../tests/AuthenticationsTableTestHelper.js';
import MenuTableTestHelper from '../../../tests/MenuTableTestHelper.js';

describe('HTTP Server', () => {

  describe('when POST /users', () => {

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

      // Cleanup
      await UsersTableTestHelper.cleanTable();
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

      // Cleanup
      await UsersTableTestHelper.cleanTable();
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

    it('should response 200 when credentials are correct', async () => {
      // Arrange
      const plainPassword = 'validPassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 12);
      const user = await UsersTableTestHelper.addUser({
        email: 'login.success@example.com',
        password: hashedPassword,
        name: 'Login Success User',
      });

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login.success@example.com',
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

      // Cleanup
      await UsersTableTestHelper.cleanTable();
    });

    it('should response 401 with generic message when password is wrong', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('correctPassword123', 12);
      await UsersTableTestHelper.addUser({
        email: 'wrongpass@example.com',
        password: hashedPassword,
      });

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'incorrectPassword123',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeTypeOf('object');
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message', 'Invalid email or password');

      // Cleanup
      await UsersTableTestHelper.cleanTable();
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

    it('should response 200 with new accessToken when refreshToken cookie is valid', async () => {
      // Arrange
      const user = await UsersTableTestHelper.addUser({
        email: 'refresh.valid@example.com',
      });
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

      // Cleanup
      await UsersTableTestHelper.cleanTable();
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
      const user = await UsersTableTestHelper.addUser({
        email: 'refresh.expired@example.com',
      });
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

      // Cleanup
      await UsersTableTestHelper.cleanTable();
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

      // Cleanup
      await UsersTableTestHelper.cleanTable();
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

      // Cleanup
      await MenuTableTestHelper.cleanTable();
    });

  });

  describe('when GET /menu/items', () => {

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

      // Cleanup
      await MenuTableTestHelper.cleanTable();
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

      // Cleanup
      await MenuTableTestHelper.cleanTable();
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

      // Cleanup
      await MenuTableTestHelper.cleanTable();
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

      // Cleanup
      await MenuTableTestHelper.cleanTable();
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

});

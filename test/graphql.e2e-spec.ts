import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/infrastructure/database/prisma.service';

describe('GraphQL E2E - Fluxo Ponta a Ponta', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let moduleFixture: TestingModule;

  const generateEmail = () =>
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "order_items" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "orders" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "products" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');

    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "order_items" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "orders" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "products" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
  });

  describe('Criar Usuário', () => {
    it('should create a user and return with id', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation CreateUser($name: String!, $email: String!) {
              createUser(input: { name: $name, email: $email }) {
                id
                name
                email
                createdAt
              }
            }
          `,
          variables: {
            name: 'João Silva',
            email: 'joao@test.com',
          },
        });

      const result = response.body;
      expect(result.data.createUser).toBeDefined();
      expect(result.data.createUser.id).toBeDefined();
      expect(result.data.createUser.name).toBe('João Silva');
      expect(result.data.createUser.email).toBe('joao@test.com');
    });
  });

  describe('Buscar Usuário por ID', () => {
    it('should find user by id', async () => {
      const email = generateEmail();
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createUser(input: { name: "Test", email: "${email}" }) {
                id
              }
            }
          `,
        });

      const createResult = createResponse.body;
      if (!createResult.data) {
        console.error(
          'CreateUser response:',
          JSON.stringify(createResult, null, 2),
        );
        throw new Error('Failed to create user');
      }
      const userId = createResult.data.createUser.id;

      const getResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query GetUser($id: String!) {
              user(id: $id) {
                id
                name
                email
              }
            }
          `,
          variables: { id: userId },
        });

      const getResult = getResponse.body;
      if (!getResult.data) {
        console.error('GetUser response:', JSON.stringify(getResult, null, 2));
        throw new Error('Failed to get user');
      }
      expect(getResult.data.user).toBeDefined();
      expect(getResult.data.user.id).toBe(userId);
      expect(getResult.data.user.name).toBe('Test');
    });

    it('should return null when user not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              user(id: "nonexistent-id") {
                id
              }
            }
          `,
        });

      const result = response.body;
      expect(result.data.user).toBeNull();
    });
  });

  describe('Criar Produto', () => {
    it('should create a product', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation CreateProduct($name: String!, $price: Float!, $stock: Int!) {
              createProduct(input: { name: $name, price: $price, stock: $stock }) {
                id
                name
                price
                stock
              }
            }
          `,
          variables: {
            name: 'Xbox Series X',
            price: 4999.99,
            stock: 10,
          },
        });

      const result = response.body;
      expect(result.data.createProduct).toBeDefined();
      expect(result.data.createProduct.name).toBe('Xbox Series X');
      expect(result.data.createProduct.price).toBe(4999.99);
      expect(result.data.createProduct.stock).toBe(10);
    });
  });

  describe('Listar Produtos', () => {
    it('should list all products', async () => {
      await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createProduct(input: { name: "Product 1", price: 100, stock: 5 }) {
                id
              }
            }
          `,
        });

      await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createProduct(input: { name: "Product 2", price: 200, stock: 10 }) {
                id
              }
            }
          `,
        });

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              products {
                id
                name
                price
                stock
              }
            }
          `,
        });

      const result = response.body;
      expect(result.data.products).toHaveLength(2);
    });
  });

  describe('Criar Pedido', () => {
    it('should create an order with products', async () => {
      const userRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createUser(input: { name: "User", email: "user@test.com" }) {
                id
              }
            }
          `,
        });
      const userId = userRes.body.data.createUser.id;

      const productRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createProduct(input: { name: "Product", price: 100, stock: 10 }) {
                id
              }
            }
          `,
        });
      const productId = productRes.body.data.createProduct.id;

      const orderRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation CreateOrder($userId: ID!, $items: [OrderItemInput!]!) {
              createOrder(input: { userId: $userId, items: $items }) {
                id
                userId
                total
                items {
                  productId
                  quantity
                  price
                }
              }
            }
          `,
          variables: {
            userId,
            items: [{ productId, quantity: 2 }],
          },
        });

      const result = orderRes.body;
      expect(result.data.createOrder).toBeDefined();
      expect(result.data.createOrder.userId).toBe(userId);
      expect(result.data.createOrder.items).toHaveLength(1);
      expect(result.data.createOrder.total).toBe(200);
    });
  });

  describe('Erro: Usuário não encontrado', () => {
    it('should return USER_NOT_FOUND error', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createOrder(
                input: {
                  userId: "nonexistent-user"
                  items: [{ productId: "any", quantity: 1 }]
                }
              ) {
                id
              }
            }
          `,
        });

      const result = response.body;
      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Erro: Produto não encontrado', () => {
    it('should return PRODUCT_NOT_FOUND error', async () => {
      const userRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createUser(input: { name: "User", email: "user@test.com" }) {
                id
              }
            }
          `,
        });
      const userId = userRes.body.data.createUser.id;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createOrder(
                input: {
                  userId: "${userId}"
                  items: [{ productId: "nonexistent-product", quantity: 1 }]
                }
              ) {
                id
              }
            }
          `,
        });

      const result = response.body;
      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('Erro: Estoque insuficiente', () => {
    it('should return INSUFFICIENT_STOCK error', async () => {
      const userRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createUser(input: { name: "User", email: "user@test.com" }) {
                id
              }
            }
          `,
        });
      const userId = userRes.body.data.createUser.id;

      const productRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createProduct(input: { name: "Product", price: 100, stock: 1 }) {
                id
              }
            }
          `,
        });
      const productId = productRes.body.data.createProduct.id;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createOrder(
                input: {
                  userId: "${userId}"
                  items: [{ productId: "${productId}", quantity: 999 }]
                }
              ) {
                id
              }
            }
          `,
        });

      const result = response.body;
      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('Campo Resolver: Listar pedidos de um usuário', () => {
    it('should list user orders using field resolver', async () => {
      const email = generateEmail();
      const userRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createUser(input: { name: "User", email: "${email}" }) {
                id
              }
            }
          `,
        });
      const userId = userRes.body.data.createUser.id;

      const productRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createProduct(input: { name: "Product", price: 100, stock: 10 }) {
                id
              }
            }
          `,
        });
      const productId = productRes.body.data.createProduct.id;

      await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createOrder(
                input: { userId: "${userId}", items: [{ productId: "${productId}", quantity: 1 }] }
              ) {
                id
              }
            }
          `,
        });

      await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createOrder(
                input: { userId: "${userId}", items: [{ productId: "${productId}", quantity: 2 }] }
              ) {
                id
              }
            }
          `,
        });

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
             query GetUserWithOrders($id: String!) {
               user(id: $id) {
                 id
                 name
                 orders {
                   id
                   total
                   items {
                     productId
                     quantity
                   }
                 }
               }
             }
           `,
          variables: { id: userId },
        });

      const result = response.body;
      if (!result.data) {
        console.error(
          'GetUserWithOrders response:',
          JSON.stringify(result, null, 2),
        );
        throw new Error('Failed to get user with orders');
      }
      expect(result.data.user.orders).toHaveLength(2);
      expect(result.data.user.orders[0].total).toBe(100);
      expect(result.data.user.orders[1].total).toBe(200);
    });
  });
});

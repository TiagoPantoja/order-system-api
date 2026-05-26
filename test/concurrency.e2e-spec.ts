import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/infrastructure/database/prisma.service';

describe('GraphQL E2E - Concorrência de Estoque', () => {
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

  describe('Validação de Concorrência', () => {
    it('should never oversell: 10 stock with 10 concurrent orders', async () => {
      const email = generateEmail();
      const userRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
              mutation {
                createUser(input: { name: "test", email: "${email}" }) {
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
               createProduct(input: { name: "Limited", price: 100, stock: 10 }) {
                 id
               }
             }
           `,
        });
      const productId = productRes.body.data.createProduct.id;

      const createOrderQuery = (userId: string, productId: string) => ({
        query: `
           mutation {
             createOrder(
               input: {
                 userId: "${userId}"
                 items: [{ productId: "${productId}", quantity: 1 }]
               }
             ) {
               id
               total
             }
           }
         `,
      });

      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/graphql')
            .send(createOrderQuery(userId, productId)),
        );

      const responses = await Promise.all(promises);

      let successCount = 0;
      let failureCount = 0;

      for (const response of responses) {
        const result = response.body;
        if (result.data?.createOrder) {
          successCount++;
        } else if (result.errors) {
          failureCount++;
        }
      }

      console.log(`\nSucessos: ${successCount}`);
      console.log(`Falhas: ${failureCount}`);

      expect(successCount).toBe(10);
      expect(failureCount).toBe(0);

      const finalProduct = await prisma.product.findUnique({
        where: { id: productId },
      });

      console.log(`Estoque final: ${finalProduct.stock}`);
      expect(finalProduct.stock).toBe(0);

      const orderCount = await prisma.order.count({
        where: { userId },
      });

      expect(orderCount).toBe(10);
    });

    it('should reject excess orders when stock is insufficient', async () => {
      const email = generateEmail();
      const userRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
              mutation {
                createUser(input: { name: "test2", email: "${email}" }) {
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
               createProduct(input: { name: "Limited2", price: 50, stock: 5 }) {
                 id
               }
             }
           `,
        });
      const productId = productRes.body.data.createProduct.id;

      const createOrderQuery = (userId: string, productId: string) => ({
        query: `
           mutation {
             createOrder(
               input: {
                 userId: "${userId}"
                 items: [{ productId: "${productId}", quantity: 1 }]
               }
             ) {
               id
             }
           }
         `,
      });

      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/graphql')
            .send(createOrderQuery(userId, productId)),
        );

      const responses = await Promise.all(promises);

      let successCount = 0;
      let insufficientStockCount = 0;

      for (const response of responses) {
        const result = response.body;
        if (result.data?.createOrder) {
          successCount++;
        } else if (
          result.errors &&
          result.errors[0].extensions.code === 'INSUFFICIENT_STOCK'
        ) {
          insufficientStockCount++;
        }
      }

      console.log(`\nSucessos: ${successCount}`);
      console.log(`INSUFFICIENT_STOCK errors: ${insufficientStockCount}`);

      expect(successCount).toBe(5);
      expect(insufficientStockCount).toBe(5);

      const finalProduct = await prisma.product.findUnique({
        where: { id: productId },
      });

      console.log(`Estoque final: ${finalProduct.stock}`);
      expect(finalProduct.stock).toBeGreaterThanOrEqual(0);
      expect(finalProduct.stock).toBe(0);
    });

    it('should handle race condition with multiple items', async () => {
      const email = generateEmail();
      const userRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
             mutation {
               createUser(input: { name: "test3", email: "${email}" }) {
                 id
               }
             }
           `,
        });
      const userId = userRes.body.data.createUser.id;

      const product1Res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
             mutation {
               createProduct(input: { name: "Product1", price: 100, stock: 5 }) {
                 id
               }
             }
           `,
        });
      const product1Id = product1Res.body.data.createProduct.id;

      const product2Res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
             mutation {
               createProduct(input: { name: "Product2", price: 200, stock: 5 }) {
                 id
               }
             }
           `,
        });
      const product2Id = product2Res.body.data.createProduct.id;

      const createOrderQuery = (
        userId: string,
        product1Id: string,
        product2Id: string,
      ) => ({
        query: `
           mutation {
             createOrder(
               input: {
                 userId: "${userId}"
                 items: [
                   { productId: "${product1Id}", quantity: 1 }
                   { productId: "${product2Id}", quantity: 1 }
                 ]
               }
             ) {
               id
               items {
                 productId
                 quantity
               }
             }
           }
         `,
      });

      const promises = Array(6)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/graphql')
            .send(createOrderQuery(userId, product1Id, product2Id)),
        );

      const responses = await Promise.all(promises);

      let successCount = 0;
      let failureCount = 0;

      for (const response of responses) {
        const result = response.body;
        if (result.data?.createOrder) {
          successCount++;
        } else if (result.errors) {
          failureCount++;
        }
      }

      console.log(`\nSucessos: ${successCount}`);
      console.log(`Falhas: ${failureCount}`);

      expect(successCount).toBe(5);
      expect(failureCount).toBe(1);

      const finalProduct1 = await prisma.product.findUnique({
        where: { id: product1Id },
      });
      const finalProduct2 = await prisma.product.findUnique({
        where: { id: product2Id },
      });

      console.log(`Produto 1 estoque final: ${finalProduct1.stock}`);
      console.log(`Produto 2 estoque final: ${finalProduct2.stock}`);

      expect(finalProduct1.stock).toBeGreaterThanOrEqual(0);
      expect(finalProduct2.stock).toBeGreaterThanOrEqual(0);
    });
  });
});

import { CreateProductUseCase } from './create-product.use-case';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product.entity';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    mockProductRepository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      decrementStock: jest.fn(),
    };

    useCase = new CreateProductUseCase(mockProductRepository);
  });

  describe('execute', () => {
    it('should create a product successfully', async () => {
      const name = 'Xbox Series X';
      const price = 4999.99;
      const stock = 10;

      const result = await useCase.execute(name, price, stock);

      expect(result).toBeInstanceOf(Product);
      expect(result.name).toBe(name);
      expect(result.price).toBe(price);
      expect(result.stock).toBe(stock);
      expect(mockProductRepository.save).toHaveBeenCalledWith(result);
    });

    it('should create product with correct attributes', async () => {
      const name = 'PlayStation 5';
      const price = 4500;
      const stock = 5;

      await useCase.execute(name, price, stock);

      expect(mockProductRepository.save).toHaveBeenCalledTimes(1);
      const savedProduct = mockProductRepository.save.mock.calls[0][0];
      expect(savedProduct.name).toBe(name);
      expect(savedProduct.price).toBe(price);
      expect(savedProduct.stock).toBe(stock);
    });

    it('should generate unique id for each product', async () => {
      const product1Promise = useCase.execute('Product 1', 100, 10);
      const product2Promise = useCase.execute('Product 2', 200, 20);

      const product1 = await product1Promise;
      const product2 = await product2Promise;

      expect(product1.id).not.toBe(product2.id);
    });

    it('should set createdAt timestamp', async () => {
      const beforeCreate = new Date();
      const product = await useCase.execute('Test Product', 99.99, 5);
      const afterCreate = new Date();

      expect(product.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(product.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );
    });

    it('should handle product with zero stock', async () => {
      const product = await useCase.execute('Sold Out', 50, 0);

      expect(product.stock).toBe(0);
    });
  });
});

import { CreateOrderUseCase } from './create-order.use-case';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { InsufficientStockException } from '../../domain/exceptions/insufficient-stock.exception';
import { ProductNotFoundException } from '../../domain/exceptions/product-not-found.exception';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { InvalidOrderException } from '../../domain/exceptions/invalid-order.exception';
import { User } from '../../domain/entities/user.entity';
import { Product } from '../../domain/entities/product.entity';
import { Order } from '../../domain/entities/order.entity';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockOrderRepository = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
    };

    mockProductRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      decrementStock: jest.fn(),
    };

    mockUserRepository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    useCase = new CreateOrderUseCase(
      mockOrderRepository,
      mockProductRepository,
      mockUserRepository,
    );
  });

  describe('execute', () => {
    const mockUser = new User('user-123', 'João', 'joao@test.com', new Date());
    const mockProduct = new Product(
      'product-123',
      'Xbox',
      4999.99,
      10,
      new Date(),
    );

    it('should create order successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.decrementStock.mockResolvedValue(true);

      const result = await useCase.execute({
        userId: 'user-123',
        items: [{ productId: 'product-123', quantity: 2 }],
      });

      expect(result).toBeInstanceOf(Order);
      expect(result.userId).toBe('user-123');
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(9999.98);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(result);
    });

    it('should throw UserNotFoundException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId: 'nonexistent-user',
          items: [{ productId: 'product-123', quantity: 1 }],
        }),
      ).rejects.toThrow(UserNotFoundException);
    });

    it('should throw ProductNotFoundException when product not found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId: 'user-123',
          items: [{ productId: 'nonexistent-product', quantity: 1 }],
        }),
      ).rejects.toThrow(ProductNotFoundException);
    });

    it('should throw InsufficientStockException when stock is insufficient', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.decrementStock.mockResolvedValue(false);

      await expect(
        useCase.execute({
          userId: 'user-123',
          items: [{ productId: 'product-123', quantity: 999 }],
        }),
      ).rejects.toThrow(InsufficientStockException);
    });

    it('should throw InvalidOrderException when quantity is invalid', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(
        useCase.execute({
          userId: 'user-123',
          items: [{ productId: 'product-123', quantity: 0 }],
        }),
      ).rejects.toThrow(InvalidOrderException);
    });

    it('should throw InvalidOrderException when items array is empty', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(
        useCase.execute({
          userId: 'user-123',
          items: [],
        }),
      ).rejects.toThrow(InvalidOrderException);
    });

    it('should throw InvalidOrderException when quantity is negative', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(
        useCase.execute({
          userId: 'user-123',
          items: [{ productId: 'product-123', quantity: -5 }],
        }),
      ).rejects.toThrow(InvalidOrderException);
    });

    it('should decrement stock for each item in order', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.decrementStock.mockResolvedValue(true);

      await useCase.execute({
        userId: 'user-123',
        items: [
          { productId: 'product-123', quantity: 2 },
          { productId: 'product-456', quantity: 3 },
        ],
      });

      expect(mockProductRepository.decrementStock).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.decrementStock).toHaveBeenCalledWith(
        'product-123',
        2,
      );
      expect(mockProductRepository.decrementStock).toHaveBeenCalledWith(
        'product-456',
        3,
      );
    });

    it('should calculate total correctly with multiple items', async () => {
      const product1 = new Product('p1', 'Product 1', 100, 10, new Date());
      const product2 = new Product('p2', 'Product 2', 50, 20, new Date());

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);
      mockProductRepository.decrementStock.mockResolvedValue(true);

      const result = await useCase.execute({
        userId: 'user-123',
        items: [
          { productId: 'p1', quantity: 2 },
          { productId: 'p2', quantity: 3 },
        ],
      });

      expect(result.total).toBe(350);
    });

    it('should stop processing items if one fails', async () => {
      const product1 = new Product('p1', 'Product 1', 100, 10, new Date());
      const product2 = new Product('p2', 'Product 2', 50, 20, new Date());

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      mockProductRepository.decrementStock
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        useCase.execute({
          userId: 'user-123',
          items: [
            { productId: 'p1', quantity: 1 },
            { productId: 'p2', quantity: 1 },
          ],
        }),
      ).rejects.toThrow(InsufficientStockException);

      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should respect Product.hasEnoughStock method', () => {
      const product = new Product('p1', 'Product', 100, 5, new Date());

      expect(product.hasEnoughStock(3)).toBe(true);
      expect(product.hasEnoughStock(5)).toBe(true);
      expect(product.hasEnoughStock(6)).toBe(false);
    });

    it('should handle multiple products with same ID in order', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.decrementStock.mockResolvedValue(true);

      await useCase.execute({
        userId: 'user-123',
        items: [
          { productId: 'product-123', quantity: 1 },
          { productId: 'product-123', quantity: 2 },
        ],
      });

      expect(mockProductRepository.decrementStock).toHaveBeenCalledTimes(2);
    });
  });
});

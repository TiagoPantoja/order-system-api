import { Injectable } from '@nestjs/common';
import { Order, OrderItem } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { InsufficientStockException } from '../../domain/exceptions/insufficient-stock.exception';
import { ProductNotFoundException } from '../../domain/exceptions/product-not-found.exception';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { InvalidOrderException } from '../../domain/exceptions/invalid-order.exception';
import { randomUUID } from 'crypto';

export interface CreateOrderDto {
  userId: string;
  items: { productId: string; quantity: number }[];
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateOrderDto): Promise<Order> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }

    if (!input.items || input.items.length === 0) {
      throw new InvalidOrderException('Um pedido deve ter pelo menos um item');
    }

    let total = 0;
    const orderItems: OrderItem[] = [];

    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new InvalidOrderException(`Quantidade deve ser maior que zero`);
      }

      const product = await this.productRepository.findById(item.productId);

      if (!product) {
        throw new ProductNotFoundException(item.productId);
      }

      const stockDecremented = await this.productRepository.decrementStock(
        item.productId,
        item.quantity,
      );

      if (!stockDecremented) {
        throw new InsufficientStockException(product.id, product.name);
      }

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      orderItems.push(new OrderItem(product.id, item.quantity, product.price));
    }

    const order = new Order(
      randomUUID(),
      input.userId,
      total,
      orderItems,
      new Date(),
    );
    await this.orderRepository.save(order);

    return order;
  }
}

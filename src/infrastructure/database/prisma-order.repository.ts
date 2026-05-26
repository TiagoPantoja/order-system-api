import { Injectable } from '@nestjs/common';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order, OrderItem } from '../../domain/entities/order.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(order: Order): Promise<void> {
    await this.prisma.order.create({
      data: {
        id: order.id,
        userId: order.userId,
        total: order.total,
        orderItems: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const data = await this.prisma.order.findMany({
      where: { userId },
      include: { orderItems: true },
    });

    return data.map(
      (o) =>
        new Order(
          o.id,
          o.userId,
          o.total,
          o.orderItems.map(
            (i) => new OrderItem(i.productId, i.quantity, i.price),
          ),
          o.createdAt,
        ),
    );
  }

  async findById(id: string): Promise<Order | null> {
    const data = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });
    if (!data) return null;
    return new Order(
      data.id,
      data.userId,
      data.total,
      data.orderItems.map(
        (i) => new OrderItem(i.productId, i.quantity, i.price),
      ),
      data.createdAt,
    );
  }
}

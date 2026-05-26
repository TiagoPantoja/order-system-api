import { Order } from '../entities/order.entity';

export abstract class OrderRepository {
  abstract save(order: Order): Promise<void>;
  abstract findByUserId(userId: string): Promise<Order[]>;
  abstract findById(id: string): Promise<Order | null>;
}

import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    const data = await this.prisma.product.findUnique({ where: { id } });
    if (!data) return null;
    return new Product(
      data.id,
      data.name,
      data.price,
      data.stock,
      data.createdAt,
    );
  }

  async findAll(): Promise<Product[]> {
    const data = await this.prisma.product.findMany();
    return data.map(
      (p) => new Product(p.id, p.name, p.price, p.stock, p.createdAt),
    );
  }

  async save(product: Product): Promise<void> {
    await this.prisma.product.create({
      data: {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
      },
    });
  }

  async decrementStock(id: string, quantity: number): Promise<boolean> {
    const { count } = await this.prisma.product.updateMany({
      where: {
        id: id,
        stock: { gte: quantity },
      },
      data: {
        stock: { decrement: quantity },
      },
    });

    return count > 0;
  }
}

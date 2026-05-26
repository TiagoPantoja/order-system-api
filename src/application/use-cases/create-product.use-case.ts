import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class CreateProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(name: string, price: number, stock: number): Promise<Product> {
    const product = new Product(randomUUID(), name, price, stock, new Date());
    await this.productRepository.save(product);
    return product;
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prismaClient: PrismaClient;
  private pool: Pool;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'Missing DATABASE_URL environment variable. Set DATABASE_URL before starting the application.',
      );
    }

    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);

    this.prismaClient = new PrismaClient({ adapter });
    this.pool = pool;
  }

  get $queryRaw() {
    return this.prismaClient.$queryRaw;
  }

  get $executeRaw() {
    return this.prismaClient.$executeRaw;
  }

  async $executeRawUnsafe(...args: Parameters<PrismaClient['$executeRawUnsafe']>) {
    return this.prismaClient.$executeRawUnsafe(...args);
  }

  get order() {
    return this.prismaClient.order;
  }

  get product() {
    return this.prismaClient.product;
  }

  get user() {
    return this.prismaClient.user;
  }

  async $connect(): Promise<void> {
    await this.prismaClient.$connect();
  }

  async $disconnect(): Promise<void> {
    await this.prismaClient.$disconnect();
  }

  async onModuleInit(): Promise<void> {
    await this.prismaClient.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prismaClient.$disconnect();
    await this.pool.end();
  }
}

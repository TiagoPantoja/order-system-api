export class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: number,
  ) {}
}

export class Order {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly total: number,
    public readonly items: OrderItem[],
    public readonly createdAt: Date,
  ) {}
}

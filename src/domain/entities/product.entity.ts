export class Product {
  constructor(
    public readonly id: string,
    public name: string,
    public price: number,
    public stock: number,
    public createdAt: Date,
  ) {}

  hasEnoughStock(quantity: number): boolean {
    return this.stock >= quantity;
  }
}

import { User } from '../entities/user.entity';

export abstract class UserRepository {
  abstract save(user: User): Promise<void>;
  abstract findAll(): Promise<User[]>;
  abstract findById(id: string): Promise<User | null>;
}

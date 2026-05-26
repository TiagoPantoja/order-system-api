import { CreateUserUseCase } from './create-user.use-case';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    useCase = new CreateUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('should create a user successfully', async () => {
      const name = 'João Silva';
      const email = 'joao@example.com';

      const result = await useCase.execute(name, email);

      expect(result).toBeInstanceOf(User);
      expect(result.name).toBe(name);
      expect(result.email).toBe(email);
      expect(mockUserRepository.save).toHaveBeenCalledWith(result);
    });

    it('should call repository.save with correct user', async () => {
      const name = 'Maria Santos';
      const email = 'maria@example.com';

      await useCase.execute(name, email);

      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      const savedUser = mockUserRepository.save.mock.calls[0][0];
      expect(savedUser.name).toBe(name);
      expect(savedUser.email).toBe(email);
    });

    it('should generate unique id for each user', async () => {
      const user1Promise = useCase.execute('User 1', 'user1@test.com');
      const user2Promise = useCase.execute('User 2', 'user2@test.com');

      const user1 = await user1Promise;
      const user2 = await user2Promise;

      expect(user1.id).not.toBe(user2.id);
    });

    it('should set createdAt timestamp', async () => {
      const beforeCreate = new Date();
      const user = await useCase.execute('Test User', 'test@test.com');
      const afterCreate = new Date();

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserCredential } from '../user-credential/entities/user-credential.entity';
import { UserRole } from '../../shares/enums/user-role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let credentialRepository: jest.Mocked<Repository<UserCredential>>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.NORMAL_USER,
    is_active: true,
    refresh_token: null,
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    books: [],
    credential: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserCredential),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    credentialRepository = module.get(getRepositoryToken(UserCredential));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['credential'],
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['credential'],
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateUserLastLoginAt', () => {
    it('should update user last login timestamp', async () => {
      userRepository.update.mockResolvedValue(undefined);

      await service.updateUserLastLoginAt(1);

      expect(userRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ last_login_at: expect.any(Date) }),
      );
    });
  });

  describe('aboutMe', () => {
    it('should return current user info', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.aboutMe(1);

      expect(result).toEqual(mockUser);
    });
  });

  describe('saveUser', () => {
    it('should save a user', async () => {
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.saveUser(mockUser);

      expect(result).toEqual(mockUser);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      userRepository.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sort: 'created_at',
        order: 'DESC',
      });

      expect(result.data).toEqual(users);
      expect(result.total).toBe(1);
    });
  });
});

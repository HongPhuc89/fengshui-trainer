import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserCredentialService } from '../user-credential/user-credential.service';
import { AuthCommonService } from './auth.common.service';
import { ConfigService } from '../core/config.service';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { RefreshTokenRequestDto } from './dtos/refresh-token-request.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shares/enums/user-role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let userCredentialService: jest.Mocked<UserCredentialService>;
  let authCommonService: jest.Mocked<AuthCommonService>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    role: UserRole.NORMAL_USER,
    refresh_token: 'hashed_refresh_token',
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const mockTokens = {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
  };

  beforeEach(async () => {
    const mockDataSource = {
      transaction: jest.fn((callback) => callback({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            addNewUser: jest.fn(),
            updateUserLastLoginAt: jest.fn(),
            getUserById: jest.fn(),
            aboutMe: jest.fn(),
          },
        },
        {
          provide: UserCredentialService,
          useValue: {
            getUserWithUsernameAndPassword: jest.fn(),
          },
        },
        {
          provide: AuthCommonService,
          useValue: {
            getTokens: jest.fn(),
            setTokenActive: jest.fn(),
            decodeRefreshToken: jest.fn(),
            clearTokenOfUser: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getAuthConfiguration: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    userCredentialService = module.get(UserCredentialService);
    authCommonService = module.get(AuthCommonService);
    configService = module.get(ConfigService);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUserWithUsernameAndPassword', () => {
    it('should validate user with correct credentials', async () => {
      userCredentialService.getUserWithUsernameAndPassword.mockResolvedValue(mockUser);

      const result = await service.validateUserWithUsernameAndPassword('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(userCredentialService.getUserWithUsernameAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });

    it('should return null for invalid credentials', async () => {
      userCredentialService.getUserWithUsernameAndPassword.mockResolvedValue(null);

      const result = await service.validateUserWithUsernameAndPassword('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    const registerDto: RegisterRequestDto = {
      email: 'newuser@example.com',
      password: 'password123',
      full_name: 'New User',
    };

    it('should register a new user successfully', async () => {
      usersService.addNewUser.mockResolvedValue(mockUser);
      authCommonService.getTokens.mockResolvedValue(mockTokens);
      authCommonService.setTokenActive.mockResolvedValue(undefined);
      usersService.updateUserLastLoginAt.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        access_token: mockTokens.access_token,
        refresh_token: mockTokens.refresh_token,
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(authCommonService.getTokens).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(authCommonService.setTokenActive).toHaveBeenCalledWith(
        mockUser.id,
        mockTokens.access_token,
        mockTokens.refresh_token,
      );
      expect(usersService.updateUserLastLoginAt).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('login', () => {
    const userDto: UserResponseDto = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      full_name: 'Test User',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should login user successfully', async () => {
      authCommonService.getTokens.mockResolvedValue(mockTokens);
      authCommonService.setTokenActive.mockResolvedValue(undefined);
      usersService.updateUserLastLoginAt.mockResolvedValue(undefined);

      const result = await service.login(userDto);

      expect(result).toEqual({
        user: {
          id: userDto.id,
          email: userDto.email,
          role: userDto.role,
        },
        access_token: mockTokens.access_token,
        refresh_token: mockTokens.refresh_token,
      });

      expect(authCommonService.getTokens).toHaveBeenCalledWith({
        id: userDto.id,
        email: userDto.email,
        role: userDto.role,
      });
      expect(usersService.updateUserLastLoginAt).toHaveBeenCalledWith(userDto.id);
      expect(authCommonService.setTokenActive).toHaveBeenCalledWith(
        userDto.id,
        mockTokens.access_token,
        mockTokens.refresh_token,
      );
    });
  });

  describe('me', () => {
    it('should return current user info', async () => {
      usersService.aboutMe.mockResolvedValue(mockUser);

      const result = await service.me(mockUser.id);

      expect(result).toBeDefined();
      expect(usersService.aboutMe).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenRequestDto = {
      refresh_token: 'valid_refresh_token',
    };

    const decodedToken = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    };

    it('should refresh token successfully', async () => {
      authCommonService.decodeRefreshToken.mockResolvedValue(decodedToken);
      usersService.getUserById.mockResolvedValue(mockUser as any);
      configService.getAuthConfiguration.mockReturnValue({
        refreshToken: {
          secretKeyActivateToken: 'secret',
        },
      } as any);
      authCommonService.getTokens.mockResolvedValue({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      });
      authCommonService.setTokenActive.mockResolvedValue(undefined);

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toEqual({
        access_token: 'new_access_token',
        refresh_token: refreshTokenDto.refresh_token,
      });

      expect(authCommonService.decodeRefreshToken).toHaveBeenCalledWith(refreshTokenDto.refresh_token);
      expect(usersService.getUserById).toHaveBeenCalledWith(decodedToken.id);
    });

    it('should throw error for invalid refresh token', async () => {
      authCommonService.decodeRefreshToken.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when refresh token not found in user', async () => {
      authCommonService.decodeRefreshToken.mockResolvedValue(decodedToken);
      usersService.getUserById.mockResolvedValue({ ...mockUser, refresh_token: null } as any);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for mismatched refresh token', async () => {
      authCommonService.decodeRefreshToken.mockResolvedValue(decodedToken);
      usersService.getUserById.mockResolvedValue({ ...mockUser, refresh_token: 'different_hash' } as any);
      configService.getAuthConfiguration.mockReturnValue({
        refreshToken: {
          secretKeyActivateToken: 'secret',
        },
      } as any);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      authCommonService.clearTokenOfUser.mockResolvedValue(undefined);

      await service.logout(mockUser.id);

      expect(authCommonService.clearTokenOfUser).toHaveBeenCalledWith(mockUser.id);
    });
  });
});

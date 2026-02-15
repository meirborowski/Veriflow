import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

jest.mock('bcrypt');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  password: 'hashedpassword',
  name: 'Test User',
  refreshTokenHash: 'hashedrefreshtoken',
  createdAt: new Date('2025-01-01'),
};

const mockQueryBuilder = {
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
};

const mockRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    };
    return map[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.addSelect.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
  });

  describe('register', () => {
    const dto = {
      email: 'New@Example.com',
      password: 'Pass1234',
      name: 'New User',
    };

    it('should register a new user and return tokens', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedpass');
      mockRepository.create.mockReturnValue({
        ...dto,
        email: 'new@example.com',
        password: 'hashedpass',
      });
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      (mockBcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-refresh');
      mockRepository.update.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });

    it('should throw ConflictException if email exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on unique constraint violation (race condition)', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedpass');
      mockRepository.create.mockReturnValue({
        ...dto,
        email: 'new@example.com',
        password: 'hashedpass',
      });
      mockRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should rethrow non-unique-constraint errors', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedpass');
      mockRepository.create.mockReturnValue({
        ...dto,
        email: 'new@example.com',
        password: 'hashedpass',
      });
      const dbError = new Error('connection lost');
      mockRepository.save.mockRejectedValue(dbError);

      await expect(service.register(dto)).rejects.toThrow('connection lost');
    });
  });

  describe('login', () => {
    const dto = { email: 'Test@Example.com', password: 'Pass1234' };

    it('should return tokens for valid credentials', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      mockRepository.update.mockResolvedValue(undefined);

      const result = await service.login(dto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.email = :email',
        { email: 'test@example.com' },
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const dto = { refreshToken: 'valid-refresh-token' };

    it('should return new token pair for valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-refresh');
      mockRepository.update.mockResolvedValue(undefined);

      const result = await service.refresh(dto);

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if stored refresh token is null', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });

      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        createdAt: mockUser.createdAt,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

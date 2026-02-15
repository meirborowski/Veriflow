import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  getProfile: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register and return tokens', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Pass1234',
        name: 'Test',
      };
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.register.mockResolvedValue(tokens);

      const result = await controller.register(dto);

      expect(result).toEqual(tokens);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login and return tokens', async () => {
      const dto = { email: 'test@example.com', password: 'Pass1234' };
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login(dto);

      expect(result).toEqual(tokens);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh and return tokens', async () => {
      const dto = { refreshToken: 'old-rt' };
      const tokens = { accessToken: 'new-at', refreshToken: 'new-rt' };
      mockAuthService.refresh.mockResolvedValue(tokens);

      const result = await controller.refresh(dto);

      expect(result).toEqual(tokens);
      expect(mockAuthService.refresh).toHaveBeenCalledWith(dto);
    });
  });

  describe('getProfile', () => {
    it('should call authService.getProfile with userId', async () => {
      const user = { userId: 'uuid-123', email: 'test@example.com' };
      const profile = {
        id: 'uuid-123',
        email: 'test@example.com',
        name: 'Test',
        createdAt: new Date(),
      };
      mockAuthService.getProfile.mockResolvedValue(profile);

      const result = await controller.getProfile(user);

      expect(result).toEqual(profile);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith('uuid-123');
    });
  });
});

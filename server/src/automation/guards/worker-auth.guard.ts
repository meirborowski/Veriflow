import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class WorkerAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-worker-api-key'];
    const expectedKey = this.configService.get<string>('WORKER_API_KEY');

    if (!expectedKey || !apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid worker API key');
    }

    return true;
  }
}

import {
  HttpException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockHost: { switchToHttp: jest.Mock };

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    };
  });

  it('should handle HttpException with object response', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      errors: [{ field: 'email', message: 'must be valid' }],
    });

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Validation failed',
      errors: [{ field: 'email', message: 'must be valid' }],
    });
  });

  it('should handle HttpException with string response', () => {
    const exception = new HttpException('Something went wrong', 422);

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(422);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 422,
      message: 'Something went wrong',
    });
  });

  it('should handle NotFoundException', () => {
    const exception = new NotFoundException('User not found');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should handle unknown exceptions as 500', () => {
    const exception = new Error('Unexpected DB error');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('should handle non-Error exceptions as 500', () => {
    filter.catch('string error', mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});

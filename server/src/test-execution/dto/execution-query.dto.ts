import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsInt, IsUUID, Min, Max } from 'class-validator';
import { TestStatus } from '../../common/types/enums';

export class ExecutionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsUUID('4')
  storyId?: string;

  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus;
}

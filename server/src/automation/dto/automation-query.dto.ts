import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AutomationRunStatus } from '../../common/types/enums';

export class AutomationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsUUID('4')
  linkedStoryId?: string;

  @IsOptional()
  @IsEnum(AutomationRunStatus)
  status?: AutomationRunStatus;

  @IsOptional()
  @IsUUID('4')
  testId?: string;

  @IsOptional()
  @IsUUID('4')
  releaseId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

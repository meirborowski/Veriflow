import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { AutomationRunStatus } from '../../common/types/enums';

export class ReportRunDto {
  @IsUUID('4')
  testId: string;

  @IsEnum(AutomationRunStatus)
  status: AutomationRunStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  logs?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalRunId?: string;

  @IsOptional()
  @IsUUID('4')
  releaseId?: string;
}

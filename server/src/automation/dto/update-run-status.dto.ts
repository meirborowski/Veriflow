import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AutomationRunStatus } from '../../common/types/enums';

export class UpdateRunStatusDto {
  @IsEnum(AutomationRunStatus)
  status: AutomationRunStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  logs?: string;
}

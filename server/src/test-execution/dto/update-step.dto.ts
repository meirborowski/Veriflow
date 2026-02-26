import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { StepStatus } from '../../common/types/enums';

export class UpdateStepDto {
  @IsUUID('4')
  executionId: string;

  @IsUUID('4')
  stepId: string;

  @IsEnum(StepStatus)
  status: StepStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

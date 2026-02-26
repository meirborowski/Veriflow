import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TestStatus, BugSeverity } from '../../common/types/enums';

export class BugReportDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsEnum(BugSeverity)
  severity: BugSeverity;
}

export class SubmitResultDto {
  @IsUUID('4')
  executionId: string;

  @IsEnum(TestStatus, {
    message:
      'status must be one of: PASS, FAIL, PARTIALLY_TESTED, CANT_BE_TESTED',
  })
  status: TestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BugReportDto)
  bug?: BugReportDto;
}

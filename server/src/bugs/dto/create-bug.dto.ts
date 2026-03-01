import {
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BugSeverity } from '../../common/types/enums';

export class CreateBugDto {
  @IsUUID('4')
  storyId: string;

  @IsOptional()
  @IsUUID('4')
  executionId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description: string;

  @IsEnum(BugSeverity)
  severity: BugSeverity;
}

import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { BugSeverity, BugStatus } from '../../common/types/enums';

export class BugExportQueryDto {
  @IsIn(['csv', 'pdf'])
  format: string;

  @IsOptional()
  @IsEnum(BugStatus)
  status?: BugStatus;

  @IsOptional()
  @IsEnum(BugSeverity)
  severity?: BugSeverity;

  @IsOptional()
  @IsString()
  search?: string;
}

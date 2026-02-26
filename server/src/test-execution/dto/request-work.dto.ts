import { IsUUID } from 'class-validator';

export class RequestWorkDto {
  @IsUUID('4')
  releaseId: string;
}

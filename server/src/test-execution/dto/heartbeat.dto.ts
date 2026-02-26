import { IsUUID } from 'class-validator';

export class HeartbeatDto {
  @IsUUID('4')
  releaseId: string;
}

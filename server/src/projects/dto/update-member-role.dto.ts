import { IsEnum } from 'class-validator';
import { UserRole } from '../../common/types/enums';

export class UpdateMemberRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

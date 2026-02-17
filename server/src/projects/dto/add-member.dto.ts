import { IsEmail, IsEnum } from 'class-validator';
import { UserRole } from '../../common/types/enums';

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;
}

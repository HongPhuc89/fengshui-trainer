import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/constant';
import { UserRole } from '../enums/user-role.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);


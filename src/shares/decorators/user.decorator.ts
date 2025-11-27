import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserProperties } from '../constants/constant';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  if (user) {
    switch (data) {
      case UserProperties.USER_ID:
        return user[UserProperties.USER_ID];
      case UserProperties.USER_EMAIL:
        return user[UserProperties.USER_EMAIL];
      case UserProperties.USER_ROLE:
        return user[UserProperties.USER_ROLE];
      default:
        return user;
    }
  }
  return null;
});


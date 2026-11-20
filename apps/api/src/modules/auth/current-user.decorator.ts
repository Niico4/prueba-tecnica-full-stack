import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { PublicUserDto } from "../users/dto/public-user.dto.js";
import { AuthenticatedRequest } from "./auth.guard.js";
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUserDto => {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new UnauthorizedException("Authentication required");
    return user;
  },
);

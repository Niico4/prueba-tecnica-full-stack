import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { isUUID } from "class-validator";
import { PublicUserDto } from "../users/dto/public-user.dto.js";
import { UsersService } from "../users/users.service.js";

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: PublicUserDto;
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([^\s]+)$/i.exec(
      request.headers.authorization ?? "",
    );
    const token = match?.[1];
    if (!token) throw new UnauthorizedException("Authentication required");
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(token);
      if (
        typeof payload.sub !== "string" ||
        !isUUID(payload.sub) ||
        !Number.isInteger(payload.exp)
      )
        throw new Error();
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    // Fetch current public data; a signed token does not keep a deleted account alive.
    const user = await this.users.findPublicById(String(payload.sub));
    if (!user) throw new UnauthorizedException("Invalid or expired token");
    request.user = user;
    return true;
  }
}

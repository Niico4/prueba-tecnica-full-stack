import { randomBytes } from "node:crypto";
import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcrypt";
import { PublicUserDto } from "../users/dto/public-user.dto.js";
import { UsersService } from "../users/users.service.js";
import { AuthResponseDto } from "./dto/auth-response.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Unknown accounts still perform a bcrypt comparison to reduce timing differences.
    this.dummyHash = await hash(randomBytes(32).toString("hex"), 12);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.users.create({
      username: dto.username,
      email: dto.email,
      passwordHash: await hash(dto.password, 12),
    });
    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const stored = await this.users.findForAuthentication(dto.identifier);
    const matches = await compare(
      dto.password,
      stored?.passwordHash ?? this.dummyHash,
    );
    if (!stored || !matches)
      throw new UnauthorizedException("Invalid credentials");
    return this.issueToken({
      id: stored.id,
      username: stored.username,
      email: stored.email,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    });
  }

  private async issueToken(user: PublicUserDto): Promise<AuthResponseDto> {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      tokenType: "Bearer",
      expiresIn: this.config.getOrThrow<number>("JWT_EXPIRES_IN_SECONDS"),
      user,
    };
  }
}

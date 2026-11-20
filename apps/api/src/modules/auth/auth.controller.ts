import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { PublicUserDto } from "../users/dto/public-user.dto.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { AuthResponseDto } from "./dto/auth-response.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
@ApiTags("auth")
@ApiServiceUnavailableResponse({ description: "User storage unavailable" })
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @Header("Cache-Control", "no-store")
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: "Invalid registration data" })
  @ApiConflictResponse({ description: "Email or username already registered" })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: "Invalid login data" })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: "Missing, invalid or expired token" })
  me(@CurrentUser() user: PublicUserDto): PublicUserDto {
    return user;
  }
}

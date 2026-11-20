import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";
import { IsBcryptInput } from "./is-bcrypt-input.js";
import { normalizeInput } from "./register.dto.js";
export class LoginDto {
  @ApiProperty({
    example: "player@example.com",
    description: "Email or username; case-insensitive.",
    maxLength: 255,
  })
  @Transform(normalizeInput)
  @IsString()
  @Length(1, 255)
  identifier!: string;

  @ApiProperty({ format: "password", writeOnly: true, maxLength: 72 })
  @IsString()
  @Length(1, 72)
  @IsBcryptInput()
  password!: string;
}

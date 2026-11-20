import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, Length, Matches, MaxLength } from "class-validator";
import { normalizeIdentity } from "../../users/normalize-identity.js";
import { IsBcryptInput } from "./is-bcrypt-input.js";

export function normalizeInput({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? normalizeIdentity(value) : value;
}

export class RegisterDto {
  @ApiProperty({
    example: "player_one",
    minLength: 3,
    maxLength: 50,
    pattern: "^[a-z0-9_]+$",
  })
  @Transform(normalizeInput)
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-z0-9_]+$/)
  username!: string;

  @ApiProperty({ example: "player@example.com", maxLength: 255 })
  @Transform(normalizeInput)
  @IsEmail({ allow_utf8_local_part: false })
  @MaxLength(255)
  @Matches(/^[\x21-\x7e]+$/)
  email!: string;

  @ApiProperty({
    format: "password",
    writeOnly: true,
    minLength: 12,
    maxLength: 72,
    description:
      "12+ characters, at most 72 UTF-8 bytes; no NUL; whitespace is preserved.",
  })
  @IsString()
  @Length(12, 72)
  @Matches(/\S/u, {
    message: "password must contain a non-whitespace character",
  })
  @IsBcryptInput()
  password!: string;
}

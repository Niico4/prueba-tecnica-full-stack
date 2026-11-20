import { ApiProperty } from "@nestjs/swagger";
import { PublicUserDto } from "../../users/dto/public-user.dto.js";
export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;
  @ApiProperty({ enum: ["Bearer"] })
  tokenType!: "Bearer";
  @ApiProperty({ example: 3600, description: "Token lifetime in seconds" })
  expiresIn!: number;
  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;
}

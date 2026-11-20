import { ApiProperty } from "@nestjs/swagger";
export class PublicUserDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ example: "player_one" })
  username!: string;
  @ApiProperty({ example: "player@example.com" })
  email!: string;
  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

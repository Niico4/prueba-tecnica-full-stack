import { ApiProperty } from "@nestjs/swagger";

export class VoteDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ format: "uuid" })
  mapId!: string;
  @ApiProperty({ format: "uuid" })
  agentId!: string;
  @ApiProperty({ format: "uuid" })
  weaponId!: string;
  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

import { ApiProperty } from "@nestjs/swagger";
export class MapDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({})
  displayName!: string;
  @ApiProperty({ type: String, nullable: true })
  tacticalDescription!: string | null;
  @ApiProperty({ type: String, nullable: true })
  displayIcon!: string | null;
  @ApiProperty({ type: String, nullable: true })
  splash!: string | null;
  @ApiProperty({})
  isActive!: boolean;
}

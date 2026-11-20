import { ApiProperty } from "@nestjs/swagger";

export class RankedChoiceDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  displayName!: string;
  @ApiProperty({ type: String, nullable: true })
  displayIcon!: string | null;
  @ApiProperty({ type: "integer", minimum: 1 })
  votes!: number;
  @ApiProperty({
    minimum: 0,
    maximum: 100,
    example: 66.67,
    description: "Percentage of map votes, rounded to at most two decimals",
  })
  percentage!: number;
}

export class MapResultsDto {
  @ApiProperty({ format: "uuid" })
  mapId!: string;
  @ApiProperty({ type: "integer", minimum: 0 })
  totalVotes!: number;
  @ApiProperty({ type: [RankedChoiceDto] })
  agents!: RankedChoiceDto[];
  @ApiProperty({ type: [RankedChoiceDto] })
  weapons!: RankedChoiceDto[];
}

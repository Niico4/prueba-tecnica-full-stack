import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Matches } from "class-validator";
import { CATALOG_ID_PATTERN } from "../../../common/catalog-id.pipe.js";

function lowercaseId({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.toLowerCase() : value;
}

export class UpsertVoteDto {
  @ApiProperty({
    format: "uuid",
    pattern: CATALOG_ID_PATTERN.source,
    description: "Active agent Valorant GUID",
  })
  @Transform(lowercaseId)
  @IsString()
  @Matches(CATALOG_ID_PATTERN)
  agentId!: string;

  @ApiProperty({
    format: "uuid",
    pattern: CATALOG_ID_PATTERN.source,
    description: "Active weapon Valorant GUID",
  })
  @Transform(lowercaseId)
  @IsString()
  @Matches(CATALOG_ID_PATTERN)
  weaponId!: string;
}

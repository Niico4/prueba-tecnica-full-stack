import { ApiProperty } from "@nestjs/swagger";
export class HealthDto {
  @ApiProperty({ enum: ["ok", "error"] })
  status!: "ok" | "error";
  @ApiProperty({ enum: ["up", "down"] })
  database!: "up" | "down";
}

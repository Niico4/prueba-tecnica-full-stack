import { ApiProperty } from "@nestjs/swagger";
export class AgentRoleDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({})
  displayName!: string;
  @ApiProperty({})
  description!: string;
  @ApiProperty({ type: String, nullable: true })
  displayIcon!: string | null;
}
export class AgentAbilityDto {
  @ApiProperty({ format: "uuid" })
  agentId!: string;
  @ApiProperty({})
  slot!: string;
  @ApiProperty({})
  displayName!: string;
  @ApiProperty({})
  description!: string;
  @ApiProperty({ type: String, nullable: true })
  displayIcon!: string | null;
}
export class AgentDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ format: "uuid" })
  roleId!: string;
  @ApiProperty({})
  displayName!: string;
  @ApiProperty({})
  description!: string;
  @ApiProperty({ type: String, nullable: true })
  displayIcon!: string | null;
  @ApiProperty({ type: String, nullable: true })
  fullPortrait!: string | null;
  @ApiProperty({ type: String, nullable: true })
  background!: string | null;
  @ApiProperty({ type: [String] })
  backgroundGradientColors!: string[];
  @ApiProperty({})
  isActive!: boolean;
  @ApiProperty({ type: AgentRoleDto })
  role!: AgentRoleDto;
  @ApiProperty({ type: [AgentAbilityDto] })
  abilities!: AgentAbilityDto[];
}

import { ApiProperty } from "@nestjs/swagger";
export class WeaponDamageRangeDto {
  @ApiProperty({ format: "uuid" })
  weaponId!: string;
  @ApiProperty({})
  rangeStartMeters!: number;
  @ApiProperty({})
  rangeEndMeters!: number;
  @ApiProperty({})
  headDamage!: number;
  @ApiProperty({})
  bodyDamage!: number;
  @ApiProperty({})
  legDamage!: number;
}
export class WeaponDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({})
  displayName!: string;
  @ApiProperty({ type: String, nullable: true })
  displayIcon!: string | null;
  @ApiProperty({})
  category!: string;
  @ApiProperty({ type: Number, nullable: true })
  cost!: number | null;
  @ApiProperty({})
  isActive!: boolean;
  @ApiProperty({ type: [WeaponDamageRangeDto] })
  damageRanges!: WeaponDamageRangeDto[];
}

import { Controller, Get } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HealthDto } from "./health.dto.js";
import { HealthService } from "./health.service.js";
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get()
  @ApiOkResponse({
    type: HealthDto,
    description: "Backend and PostgreSQL are available",
  })
  @ApiServiceUnavailableResponse({
    type: HealthDto,
    description: "PostgreSQL is unavailable",
  })
  check(): Promise<HealthDto> {
    return this.health.check();
  }
}

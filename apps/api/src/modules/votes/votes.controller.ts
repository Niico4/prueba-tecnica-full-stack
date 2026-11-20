import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { CatalogIdPipe } from '../../common/catalog-id.pipe.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PublicUserDto } from '../users/dto/public-user.dto.js';
import { UpsertVoteDto } from './dto/upsert-vote.dto.js';
import { VoteDto } from './dto/vote.dto.js';
import { VotesService } from './votes.service.js';

@ApiTags('votes')
@ApiBearerAuth()
@ApiExtraModels(VoteDto)
@ApiParam({
  name: 'mapId',
  format: 'uuid',
  description: 'Valorant GUID; RFC version bits are not required',
})
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@ApiBadRequestResponse({ description: 'Malformed GUID or invalid body' })
@ApiNotFoundResponse({ description: 'Catalog item not found' })
@ApiServiceUnavailableResponse({ description: 'Storage unavailable' })
@UseGuards(AuthGuard)
@Controller('maps/:mapId/vote')
export class VotesController {
  constructor(private readonly service: VotesService) {}

  @Put()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Create or update your vote for an active map' })
  @ApiOkResponse({ type: VoteDto })
  @ApiUnprocessableEntityResponse({
    description: 'Map, agent or weapon is inactive',
  })
  upsert(
    @CurrentUser() user: PublicUserDto,
    @Param('mapId', CatalogIdPipe) mapId: string,
    @Body() input: UpsertVoteDto,
  ): Promise<VoteDto> {
    return this.service.upsert(user.id, mapId, input);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Read your vote, including retired catalog choices',
  })
  @ApiOkResponse({
    description: 'Your vote, or JSON null if you have not voted',
    schema: {
      anyOf: [
        { $ref: getSchemaPath(VoteDto) },
        { type: 'object', nullable: true, enum: [null] },
      ],
    },
  })
  async get(
    @CurrentUser() user: PublicUserDto,
    @Param('mapId', CatalogIdPipe) mapId: string,
    @Res() response: { json(value: VoteDto | null): void },
  ): Promise<void> {
    response.json(await this.service.get(user.id, mapId));
  }
}

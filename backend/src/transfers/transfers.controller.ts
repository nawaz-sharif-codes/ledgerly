import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import {
  ApiErrorResponseDto,
  TransferResponseDto,
} from '../common/dto/api-response.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Transfer money between matching-currency wallets' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'UUID v4 retained for every retry of one submission.',
    required: true,
    schema: { format: 'uuid', type: 'string' },
  })
  @ApiCreatedResponse({
    description: 'Transfer completed or replayed.',
    headers: {
      'idempotency-replayed': {
        description: 'True when the stored response was replayed.',
        schema: { type: 'boolean' },
      },
    },
    type: TransferResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body or idempotency key.',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'A wallet was not found.',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The idempotent request is in progress.',
    type: ApiErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Business rule or idempotency conflict.',
    type: ApiErrorResponseDto,
  })
  async create(
    @Body() input: CreateTransferDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.transfersService.create(input, idempotencyKey);
    response.header('idempotency-replayed', String(result.replayed));
    return result.value;
  }
}

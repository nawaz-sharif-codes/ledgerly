import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import {
  ApiErrorResponseDto,
  DepositResponseDto,
  TransactionHistoryPageResponseDto,
  WalletCollectionResponseDto,
  WalletResponseDto,
} from '../common/dto/api-response.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DepositDto } from './dto/deposit.dto';
import { ListWalletsQueryDto } from './dto/list-wallets-query.dto';
import { TransactionHistoryQueryDto } from './dto/transaction-history-query.dto';
import { WalletsService } from './wallets.service';

@ApiTags('wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer wallet' })
  @ApiCreatedResponse({
    description: 'Wallet created.',
    type: WalletResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body.',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The wallet already exists.',
    type: ApiErrorResponseDto,
  })
  create(@Body() input: CreateWalletDto) {
    return this.walletsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List wallets for a demo user' })
  @ApiOkResponse({
    description: 'Wallet collection.',
    type: WalletCollectionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid user ID.',
    type: ApiErrorResponseDto,
  })
  list(@Query() query: ListWalletsQueryDto) {
    return this.walletsService.list(query.userId);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get cursor-paginated wallet transactions' })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  @ApiOkResponse({
    description: 'Transaction history page.',
    type: TransactionHistoryPageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid wallet ID, cursor, or limit.',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found.',
    type: ApiErrorResponseDto,
  })
  history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TransactionHistoryQueryDto,
  ) {
    return this.walletsService.history(id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wallet and its cached balance' })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  @ApiOkResponse({ description: 'Wallet details.', type: WalletResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid wallet ID.',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found.',
    type: ApiErrorResponseDto,
  })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.walletsService.get(id);
  }

  @Post(':id/deposit')
  @ApiOperation({ summary: 'Deposit money into a wallet' })
  @ApiParam({ name: 'id', format: 'uuid', type: String })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'UUID v4 retained for every retry of one submission.',
    required: true,
    schema: { format: 'uuid', type: 'string' },
  })
  @ApiCreatedResponse({
    description: 'Deposit completed or replayed.',
    headers: {
      'idempotency-replayed': {
        description: 'True when the stored response was replayed.',
        schema: { type: 'boolean' },
      },
    },
    type: DepositResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid wallet, amount, or idempotency key.',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found.',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The idempotent request is in progress.',
    type: ApiErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The key was reused for different input.',
    type: ApiErrorResponseDto,
  })
  async deposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: DepositDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.walletsService.deposit(id, input, idempotencyKey);
    response.header('idempotency-replayed', String(result.replayed));
    return result.value;
  }
}

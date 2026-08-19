import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ApiErrorResponseDto } from '../common/dto/api-response.dto';

export class HealthResponse {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({ enum: ['ledgerly-api'] })
  service!: 'ledgerly-api';

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Check whether the API is ready' })
  @ApiOkResponse({
    description: 'The API is ready to accept requests.',
    type: HealthResponse,
  })
  getHealth(): HealthResponse {
    return this.createResponse();
  }

  @Get('live')
  @ApiOperation({ summary: 'Check whether the API process is alive' })
  @ApiOkResponse({
    description: 'The API process is alive.',
    type: HealthResponse,
  })
  getLiveness(): HealthResponse {
    return this.createResponse();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check whether the API is ready' })
  @ApiOkResponse({
    description: 'The API and PostgreSQL are ready.',
    type: HealthResponse,
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL is unavailable.',
    type: ApiErrorResponseDto,
  })
  async getReadiness(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'PostgreSQL is not ready.',
      });
    }

    return this.createResponse();
  }

  private createResponse(): HealthResponse {
    return {
      status: 'ok',
      service: 'ledgerly-api',
      timestamp: new Date().toISOString(),
    };
  }
}

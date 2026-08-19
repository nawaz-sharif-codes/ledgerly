import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export interface HealthResponse {
  status: 'ok';
  service: 'ledgerly-api';
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check whether the API is ready' })
  @ApiOkResponse({ description: 'The API is ready to accept requests.' })
  getHealth(): HealthResponse {
    return this.createResponse();
  }

  @Get('live')
  @ApiOperation({ summary: 'Check whether the API process is alive' })
  getLiveness(): HealthResponse {
    return this.createResponse();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check whether the API is ready' })
  getReadiness(): HealthResponse {
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

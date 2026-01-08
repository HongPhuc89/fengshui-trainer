import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check API and Database connection status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health check status',
  })
  async getHealth() {
    return this.healthService.checkHealth();
  }
}

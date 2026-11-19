import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Cek apakah PasarTani API berjalan' })
  health() {
    return {
      name: 'PasarTani SUpply Chain API',
      status: 'ok',
      docs: '/docs',
    };
  }
}

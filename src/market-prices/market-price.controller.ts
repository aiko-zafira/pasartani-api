import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MarketPricesService } from './market-prices.service.js';

@ApiTags('Market Prices (PIHPS BI)')
@Controller('market-prices')
export class MarketPricesController {
  constructor(private readonly marketPricesService: MarketPricesService) {}

  @Post('sync-bi')
  @ApiOperation({ summary: 'Tarik & sinkronisasi harga pangan terkini dari PIHPS Bank Indonesia' })
  @ApiQuery({ name: 'priceTypeId', required: false, example: 1, description: '1=Tradisional, 2=Modern, 3=Pedagang Besar, 4=Produsen' })
  syncFromBI(@Query('priceTypeId') priceTypeId?: string) {
    return this.marketPricesService.syncFromBankIndonesia(Number(priceTypeId) || 1);
  }
}
import { Body, Controller, Get, Injectable, Module, NotFoundException, Post, Query } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Repository } from 'typeorm';
import { RequireRoles } from '../common/decorators/auth.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import { MarketPrice, MarketType } from './entities/market-price.entity.js';

export class CreateMarketPriceDto {
  @ApiProperty({ example: 'Bawang Merah' })
  @IsString()
  commodityName: string;

  @ApiPropertyOptional({ example: 'Pasar Tradisional' })
  @IsOptional()
  @IsEnum(MarketType)
  marketType?: MarketType;

  @ApiPropertyOptional({ example: 'Nasional' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ example: 37050 })
  @IsInt()
  @Min(100)
  pricePerUnit: number;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  changePercent?: number;

  @ApiProperty({ example: '2026-11-19' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  recordedDate: string;
}

export class QueryMarketPriceDto {
  @ApiPropertyOptional({ description: 'Cari komoditas (misal: cabai, beras)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter jenis pasar (misal: Pasar Tradisional)' })
  @IsOptional()
  @IsString()
  marketType?: string;

  @ApiPropertyOptional({ description: 'Filter provinsi (misal: Nasional, Jawa Timur)' })
  @IsOptional()
  @IsString()
  province?: string;
}

@Injectable()
export class MarketPricesService {
  constructor(@InjectRepository(MarketPrice) private readonly repo: Repository<MarketPrice>) {}

  findAll(query: QueryMarketPriceDto) {
    const qb = this.repo.createQueryBuilder('mp').orderBy('mp.commodityName', 'ASC');
    if (query.search) qb.andWhere('mp.commodityName ILIKE :s', { s: `%${query.search}%` });
    if (query.marketType) qb.andWhere('mp.marketType = :mt', { mt: query.marketType });
    if (query.province) qb.andWhere('mp.province = :pv', { pv: query.province });
    return qb.getMany();
  }

  async findOne(id: number) {
    const item = await this.repo.findOneBy({ id });
    if (!item) throw new NotFoundException(`Data harga komoditas #${id} tidak ditemukan`);
    return item;
  }

  create(dto: CreateMarketPriceDto) {
    return this.repo.save(this.repo.create(dto));
  }
}

@ApiTags('Market Prices (Harga Pasar Hari Ini)')
@Controller('market-prices')
export class MarketPricesController {
  constructor(private readonly service: MarketPricesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar harga pasar hari ini (publik)' })
  findAll(@Query() query: QueryMarketPriceDto) { return this.service.findAll(query); }

  @Post()
  @RequireRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update / tambah harga pasar hari ini (admin)' })
  create(@Body() dto: CreateMarketPriceDto) { return this.service.create(dto); }
}

@Module({
  imports: [TypeOrmModule.forFeature([MarketPrice])],
  controllers: [MarketPricesController],
  providers: [MarketPricesService],
  exports: [MarketPricesService],
})
export class MarketPricesModule {}

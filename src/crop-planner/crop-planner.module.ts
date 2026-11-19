import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Repository } from 'typeorm';
import { type AuthUser, CurrentUser, RequireRoles } from '../common/decorators/auth.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import { LandsModule, LandsService } from '../lands/lands.module.js';
import { MarketPricesModule, MarketPricesService } from '../market-prices/market-prices.module.js';
import { CropPlan } from './entities/crop-planner.entity.js';

export class CalculateCropPlanDto {
  @ApiProperty({ example: 1, description: 'ID Lahan yang dipilih' })
  @IsInt()
  landId: number;

  @ApiProperty({ example: 2, description: 'ID Komoditas dari Harga Pasar Hari Ini' })
  @IsInt()
  marketPriceId: number;

  @ApiProperty({ example: 5000000, description: 'Modal tanam (Rp)' })
  @IsInt()
  @Min(0)
  capitalRp: number;

  @ApiProperty({ example: 500, description: 'Estimasi hasil panen (kg)' })
  @IsInt()
  @Min(1)
  estimatedYieldKg: number;
}

@Injectable()
export class CropPlannerService {
  constructor(
    @InjectRepository(CropPlan) private readonly repo: Repository<CropPlan>,
    private readonly landsService: LandsService,
    private readonly marketPricesService: MarketPricesService,
  ) {}

  async calculate(farmerId: number, dto: CalculateCropPlanDto) {
    const land = await this.landsService.findOneOwned(dto.landId, farmerId);
    const market = await this.marketPricesService.findOne(dto.marketPriceId);

    const estimatedRevenueRp = market.pricePerUnit * dto.estimatedYieldKg;
    const estimatedProfitRp = estimatedRevenueRp - dto.capitalRp;

    return {
      land: { id: land.id, name: land.name, areaSqm: land.areaSqm },
      commodity: market.commodityName,
      todayMarketPrice: market.pricePerUnit,
      capitalRp: dto.capitalRp,
      estimatedYieldKg: dto.estimatedYieldKg,
      estimatedRevenueRp,
      estimatedProfitRp,
      status: estimatedProfitRp >= 0 ? 'ESTIMASI_UNTUNG' : 'ESTIMASI_RUGI',
    };
  }

  async create(farmerId: number, dto: CalculateCropPlanDto) {
    const calc = await this.calculate(farmerId, dto);
    const plan = this.repo.create({
      farmerId,
      landId: dto.landId,
      marketPriceId: dto.marketPriceId,
      capitalRp: dto.capitalRp,
      estimatedYieldKg: dto.estimatedYieldKg,
      estimatedRevenueRp: calc.estimatedRevenueRp,
      estimatedProfitRp: calc.estimatedProfitRp,
    });
    return this.repo.save(plan);
  }

  findMine(farmerId: number) {
    return this.repo.find({
      where: { farmerId },
      relations: { land: true, marketPrice: true },
      order: { createdAt: 'DESC' },
    });
  }
}

@ApiTags('Smart Crop Planner')
@Controller('crop-planner')
export class CropPlannerController {
  constructor(private readonly service: CropPlannerService) {}

  @Post('calculate')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Hitung simulasi estimasi pendapatan & untung/rugi tanam' })
  calculate(@CurrentUser() user: AuthUser, @Body() dto: CalculateCropPlanDto) {
    return this.service.calculate(user.id, dto);
  }

  @Post()
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Simpan rencana tanam ke daftar aktif petani' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CalculateCropPlanDto) {
    return this.service.create(user.id, dto);
  }

  @Get('my')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Lihat riwayat rencana tanam milik petani' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([CropPlan]), LandsModule, MarketPricesModule],
  controllers: [CropPlannerController],
  providers: [CropPlannerService],
  exports: [CropPlannerService],
})
export class CropPlannerModule {}
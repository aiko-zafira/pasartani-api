import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { type AuthUser, CurrentUser, RequireRoles } from '../common/decorators/auth.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import { Land } from '../lands/entities/land.entity.js';
import { CropPlan } from '../crop-planner/entities/crop-planner.entity.js';
import { Harvest } from '../harvests/entities/harvest.entity.js';
import { Article } from '../articles/entities/article.entity.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Land) private readonly landRepo: Repository<Land>,
    @InjectRepository(CropPlan) private readonly planRepo: Repository<CropPlan>,
    @InjectRepository(Harvest) private readonly harvestRepo: Repository<Harvest>,
    @InjectRepository(Article) private readonly articleRepo: Repository<Article>,
  ) {}

  async getFarmerDashboard(farmerId: number) {
    const [lands, activePlans, harvests, tips] = await Promise.all([
      this.landRepo.find({ where: { farmerId }, order: { createdAt: 'DESC' } }),
      this.planRepo.countBy({ farmerId, status: 'SEDANG_TANAM' }),
      this.harvestRepo.find({ where: { farmerId }, order: { createdAt: 'DESC' } }),
      this.articleRepo.find({ order: { id: 'DESC' }, take: 3 }),
    ]);

    const stockValueRp = harvests.reduce((acc, item) => acc + item.price * item.stock, 0);

    return {
      summary: {
        totalLahan: lands.length,
        sedangTanam: activePlans,
        produkDijual: harvests.length,
        nilaiStokRp: stockValueRp,
      },
      lahanKamu: lands,
      hasilPanenTerbaru: harvests.slice(0, 5),
      tipsHariIni: tips,
    };
  }
}

@ApiTags('Dashboard Petani')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('farmer')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Statistik ringkasan dashboard petani (lahan, nilai stok, tips)' })
  getFarmerDashboard(@CurrentUser() user: AuthUser) {
    return this.service.getFarmerDashboard(user.id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Land, CropPlan, Harvest, Article])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
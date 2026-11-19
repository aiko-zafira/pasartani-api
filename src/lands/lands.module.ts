import { Body, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe, Post } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { type AuthUser, CurrentUser, RequireRoles } from '../common/decorators/auth.decorator.js';
import { Role } from '../users/entities/user.entity.js';
import { Land } from './entities/land.entity.js';

export class CreateLandDto {
  @ApiProperty({ example: 'Sawojajar', description: 'Nama petak lahan' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Dusun Sumberejo, Malang' })
  @IsString()
  location: string;

  @ApiProperty({ example: 1000, description: 'Luas lahan dalam meter persegi (m²)' })
  @IsInt()
  @Min(1)
  areaSqm: number;
}

@Injectable()
export class LandsService {
  constructor(@InjectRepository(Land) private readonly repo: Repository<Land>) {}

  create(farmerId: number, dto: CreateLandDto) {
    return this.repo.save(this.repo.create({ ...dto, farmerId }));
  }

  findMine(farmerId: number) {
    return this.repo.find({ where: { farmerId }, order: { createdAt: 'DESC' } });
  }

  async findOneOwned(id: number, farmerId: number) {
    const land = await this.repo.findOneBy({ id });
    if (!land) throw new NotFoundException(`Lahan #${id} tidak ditemukan`);
    if (land.farmerId !== farmerId) throw new ForbiddenException('Lahan ini bukan milik Anda');
    return land;
  }

  async remove(id: number, farmerId: number) {
    const land = await this.findOneOwned(id, farmerId);
    await this.repo.remove(land);
    return { message: 'Lahan berhasil dihapus' };
  }
}

@ApiTags('Lands (Manajemen Lahan Petani)')
@Controller('lands')
export class LandsController {
  constructor(private readonly service: LandsService) {}

  @Post()
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Tambah petak lahan baru (petani)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLandDto) {
    return this.service.create(user.id, dto);
  }

  @Get('my')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Daftar lahan milik petani yang sedang login' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.id);
  }

  @Delete(':id')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Hapus lahan milik sendiri (petani)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Land])],
  controllers: [LandsController],
  providers: [LandsService],
  exports: [LandsService],
})
export class LandsModule {}

import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  ForbiddenException,
  Get,
  Injectable,
  MaxFileSizeValidator,
  Module,
  NotFoundException,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Repository } from 'typeorm';
import { type AuthUser, CurrentUser, RequireRoles } from '../common/decorators/auth.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { paginated, skipOf } from '../common/utils/paginate.js';
import { Role } from '../users/entities/user.entity.js';
import { Harvest } from './entities/harvest.entity.js';
import 'multer';

export class CreateHarvestDto {
  @ApiProperty({ example: 'Bawang Merah' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Malang' })
  @IsString()
  region: string;

  @ApiProperty({ example: 35000 })
  @IsInt()
  @Min(100)
  price: number;

  @ApiPropertyOptional({ example: 'kg', description: 'Satuan: kg, ons, atau biji' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: '08580452227', description: 'Nomor HP/WhatsApp petani untuk dihubungi pembeli' })
  @IsString()
  whatsappNumber: string;
}

export class UpdateStockPriceDto {
  @ApiPropertyOptional({ example: 34000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  price?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}

export class QueryHarvestsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Cari barang, toko, atau petani' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter daerah (misal: Malang, Kediri)' })
  @IsOptional()
  @IsString()
  region?: string;
}

@Injectable()
export class HarvestsService {
  constructor(
    @InjectRepository(Harvest) private readonly repo: Repository<Harvest>,
    private readonly config: ConfigService,
  ) {}

  private formatWhatsAppLink(phone: string, productName: string) {
    const clean = phone.replace(/\D/g, '');
    const normalized = clean.startsWith('0') ? `62${clean.slice(1)}` : clean;
    const text = encodeURIComponent(`Halo, saya tertarik memesan ${productName} dari Pasartani.`);
    return `https://wa.me/${normalized}?text=${text}`;
  }

  create(farmerId: number, dto: CreateHarvestDto) {
    return this.repo.save(this.repo.create({ ...dto, farmerId }));
  }

  async findAll(query: QueryHarvestsDto) {
    const qb = this.repo
      .createQueryBuilder('h')
      .leftJoin('h.farmer', 'farmer')
      .addSelect(['farmer.id', 'farmer.name', 'farmer.storeName'])
      .orderBy('h.createdAt', 'DESC')
      .skip(skipOf(query.page, query.limit))
      .take(query.limit);

    if (query.search) {
      qb.andWhere(
        '(h.name ILIKE :s OR farmer.name ILIKE :s OR farmer.storeName ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.region) {
      qb.andWhere('h.region ILIKE :reg', { reg: `%${query.region}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    const mapped = items.map((item) => ({
      ...item,
      whatsappLink: this.formatWhatsAppLink(item.whatsappNumber, item.name),
    }));
    return paginated(mapped, total, query.page, query.limit);
  }

  findMine(farmerId: number) {
    return this.repo.find({ where: { farmerId }, order: { createdAt: 'DESC' } });
  }

  async findOneOwned(id: number, farmerId: number) {
    const item = await this.repo.findOneBy({ id });
    if (!item) throw new NotFoundException(`Produk panen #${id} tidak ditemukan`);
    if (item.farmerId !== farmerId) throw new ForbiddenException('Bukan produk panen milik Anda');
    return item;
  }

  async updateStockPrice(id: number, farmerId: number, dto: UpdateStockPriceDto) {
    const item = await this.findOneOwned(id, farmerId);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number, farmerId: number) {
    const item = await this.findOneOwned(id, farmerId);
    await this.repo.remove(item);
    return { message: 'Produk hasil panen berhasil dihapus' };
  }

  async uploadImage(id: number, farmerId: number, file: Express.Multer.File) {
    const item = await this.findOneOwned(id, farmerId);
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_BUCKET') || 'harvest-images';
    if (!url || !key) throw new ServiceUnavailableException('Supabase Storage belum dikonfigurasi');

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const path = `harvests/${id}/${randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw new ServiceUnavailableException(`Gagal upload foto: ${error.message}`);

    item.imagePath = path;
    item.imageUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return this.repo.save(item);
  }
}

@ApiTags('Harvests (Hasil Panen & Katalog Konsumen)')
@Controller('harvests')
export class HarvestsController {
  constructor(private readonly service: HarvestsService) {}

  @Get()
  @ApiOperation({ summary: 'Katalog panen tersedia untuk konsumen + link WhatsApp (publik)' })
  findAll(@Query() query: QueryHarvestsDto) { return this.service.findAll(query); }

  @Get('my')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Daftar hasil panen milik petani yang login (petani)' })
  findMine(@CurrentUser() user: AuthUser) { return this.service.findMine(user.id); }

  @Post()
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Tambah hasil panen baru (petani)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHarvestDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Atur stok & harga produk panen (petani)' })
  updateStockPrice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateStockPriceDto,
  ) {
    return this.service.updateStockPrice(id, user.id, dto);
  }

  @Delete(':id')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Hapus produk hasil panen (petani)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id);
  }

  @Post(':id/image')
  @RequireRoles(Role.PETANI)
  @ApiOperation({ summary: 'Upload foto barang hasil panen ke Supabase Storage (petani)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.service.uploadImage(id, user.id, file);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Harvest])],
  controllers: [HarvestsController],
  providers: [HarvestsService],
  exports: [HarvestsService],
})
export class HarvestsModule {}
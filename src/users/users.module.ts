import { Body, Controller, Injectable, Module, NotFoundException, Patch } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser, LoggedIn } from '../common/decorators/auth.decorator.js';
import type { AuthUser } from '../common/decorators/auth.decorator.js';
import { Role, User } from './entities/user.entity.js';
import { Repository } from 'typeorm';

export class SelectRoleDto {
  @ApiProperty({ enum: [Role.PETANI, Role.KONSUMEN], example: Role.PETANI })
  @IsEnum([Role.PETANI, Role.KONSUMEN], { message: 'Peran hanya boleh PETANI atau KONSUMEN' })
  role: Role.PETANI | Role.KONSUMEN;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'Toko Tani Sejahtera' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  storeName?: string;

  @ApiPropertyOptional({ example: '08580452227' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Malang' })
  @IsOptional()
  @IsString()
  region?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: number) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
    return user;
  }

  async create(data: Partial<User>) {
    const user = this.repo.create(data);
    const saved = await this.repo.save(user);
    const { password, ...safeUser } = saved;
    return safeUser;
  }

  async switchRole(userId: number, role: Role.PETANI | Role.KONSUMEN) {
    const user = await this.findById(userId);
    user.role = role;
    const saved = await this.repo.save(user);
    const accessToken = await this.jwtService.signAsync({
      sub: saved.id,
      email: saved.email,
      role: saved.role,
    });
    return {
      message: `Berhasil masuk sebagai ${role}`,
      user: saved,
      accessToken,
    };
  }

  async updateSettings(userId: number, dto: UpdateSettingsDto) {
    const user = await this.findById(userId);
    Object.assign(user, dto);
    return this.repo.save(user);
  }
}

@ApiTags('Users & Role Settings')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Patch('role')
  @LoggedIn()
  @ApiOperation({ summary: 'Pilih peran awal atau Ganti peran (PETANI / KONSUMEN)' })
  switchRole(@CurrentUser() user: AuthUser, @Body() dto: SelectRoleDto) {
    return this.service.switchRole(user.id, dto.role);
  }

  @Patch('settings')
  @LoggedIn()
  @ApiOperation({ summary: 'Kelola nama toko, nomor WhatsApp, & wilayah (Setting)' })
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(user.id, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
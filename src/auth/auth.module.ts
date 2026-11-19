import { Body, ConflictException, Controller, Get, HttpCode, Injectable, Module, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { type AuthUser, CurrentUser, LoggedIn } from '../common/decorators/auth.decorator.js';
import { UsersModule, UsersService } from '../users/users.module.js';

export class RegisterDto {
  @ApiProperty({ example: 'Aiko' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'aiko@pasartani.id' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Rahasia123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '08580452227' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Malang' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'petani@pasartani.id' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Petani123!' })
  @IsString()
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmailWithPassword(dto.email);
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const password = await bcrypt.hash(dto.password, 10);
    // Role dibiarkan null agar user memilih peran (PETANI/KONSUMEN) di langkah berikutnya
    const user = await this.usersService.create({ ...dto, password, role: null });
    return {
      user,
      needsRoleSelection: true,
      accessToken: await this.jwtService.signAsync({ sub: user.id, email: user.email, role: null }),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    const invalid = new UnauthorizedException('Email atau password salah');
    if (!user) throw invalid;

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw invalid;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        region: user.region,
        role: user.role,
      },
      needsRoleSelection: user.role === null,
      accessToken: await this.jwtService.signAsync({ sub: user.id, email: user.email, role: user.role }),
    };
  }
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Daftar akun baru (role awal null, lanjut pilih peran)' })
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login dan dapatkan token JWT' })
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Get('me')
  @LoggedIn()
  @ApiOperation({ summary: 'Lihat profil pengguna yang sedang login' })
  me(@CurrentUser() user: AuthUser) { return this.usersService.findById(user.id); }
}

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '1d') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

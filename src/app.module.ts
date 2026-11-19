import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { validateEnv } from './config/env.validation.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MarketPricesModule } from './market-prices/market-prices.module.js';
import { LandsModule } from './lands/lands.module.js';
import { CropPlannerModule } from './crop-planner/crop-planner.module.js';
import { HarvestsModule } from './harvests/harvest.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
        ssl: config.get<string>('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    UsersModule,
    AuthModule,
    MarketPricesModule,
    LandsModule,
    CropPlannerModule,
    HarvestsModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
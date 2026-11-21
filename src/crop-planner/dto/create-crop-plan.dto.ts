import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsAllowedCrop } from '../../common/validators/forbiden-crop.validator.js';

export class CreateCropPlanDto {
  @ApiProperty({ example: 'Bawang Merah' })
  @IsString()
  @IsNotEmpty()
  @IsAllowedCrop()
  commodityName: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  landId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  marketPriceId?: number;

  @ApiProperty({ example: '2026-11-25' })
  @IsDateString()
  @IsNotEmpty()
  plantingDate: string;

  @ApiPropertyOptional({ example: '2027-02-10' })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @Min(0)
  estimatedCost: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedYield?: number;
}
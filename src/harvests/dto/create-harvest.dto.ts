import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsAllowedCrop } from '../../common/validators/forbiden-crop.validator.js';

export class CreateHarvestDto {
  @ApiProperty({ example: 'Cabai Merah Keriting' })
  @IsString()
  @IsNotEmpty()
  @IsAllowedCrop()
  productName: string;

  @ApiProperty({ example: 'Kediri, Jawa Timur' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 35000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  stock: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: '6281234567890' })
  @IsString()
  @IsNotEmpty()
  whatsappNumber: string;

  @ApiPropertyOptional({ example: 'Panen segar langsung dari kebun' })
  @IsOptional()
  @IsString()
  description?: string;
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Land } from '../../lands/entities/land.entity.js';
import { MarketPrice } from '../../market-prices/entities/market-price.entity.js';

@Entity('crop_plans')
export class CropPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  farmerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column()
  landId: number;

  @ManyToOne(() => Land, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'landId' })
  land: Land;

  @Column()
  marketPriceId: number;

  @ManyToOne(() => MarketPrice)
  @JoinColumn({ name: 'marketPriceId' })
  marketPrice: MarketPrice;

  @Column({ type: 'int' })
  capitalRp: number;

  @Column({ type: 'int' })
  estimatedYieldKg: number;

  @Column({ type: 'int' })
  estimatedRevenueRp: number;

  @Column({ type: 'int' })
  estimatedProfitRp: number;

  @Column({ default: 'SEDANG_TANAM' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
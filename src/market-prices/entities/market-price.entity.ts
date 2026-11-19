import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum MarketType {
  PASAR_TRADISIONAL = 'Pasar Tradisional',
  PASAR_MODERN = 'Pasar Modern',
  PEDAGANG_BESAR = 'Pedagang Besar',
  PRODUSEN = 'Produsen',
}

@Entity('market_prices')
export class MarketPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  commodityName: string;

  @Column({
    type: 'enum',
    enum: MarketType,
    default: MarketType.PASAR_TRADISIONAL,
  })
  marketType: MarketType;

  @Column({ default: 'Nasional' })
  province: string;

  @Column({ type: 'int' })
  pricePerUnit: number;

  @Column({ default: 'kg' })
  unit: string;

  @Column({ type: 'float', default: 0 })
  changePercent: number;

  @Column({ type: 'date' })
  recordedDate: string;
}
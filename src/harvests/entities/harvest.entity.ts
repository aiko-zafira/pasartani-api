import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('harvests')
export class Harvest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  farmerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column()
  name: string;

  @Column()
  region: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ default: 'kg' })
  unit: string;

  @Column({ type: 'int' })
  stock: number;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ nullable: true })
  imagePath?: string;

  @Column()
  whatsappNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('lands')
export class Land {
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
  location: string;

  @Column({ type: 'int' })
  areaSqm: number;

  @CreateDateColumn()
  createdAt: Date;
}

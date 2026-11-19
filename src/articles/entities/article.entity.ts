import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 'Tips Harian' })
  category: string;
}
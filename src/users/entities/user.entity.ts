import {
Entity,
PrimaryGeneratedColumn,
Column,
CreateDateColumn,
UpdateDateColumn,
} from 'typeorm';

export enum Role{
    ADMIN = 'ADMIN',
    PETANI ='PETANI',
    KONSUMEN = 'KONSUMEN',
}

@Entity('users')
export class User{
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column({unique: true})
    email: string

    @Column({select: false})
    password: string

    @Column({nullable: true})
    phone: string // nomor hp petani

    @Column({nullable: true})
    storeName: string // nama toko petani

    @Column({nullable: true})
    region: string // daerah / lokasi

    @Column({type: 'enum', enum: Role, nullable: true})
    role: Role | null // user memilih peran

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
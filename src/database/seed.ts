import 'reflect-metadata'
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, Role } from '../users/entities/user.entity.js';
import { MarketPrice, MarketType } from '../market-prices/entities/market-price.entity.js';
import { Article } from '../articles/entities/article.entity.js';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [User, MarketPrice, Article],
  synchronize: true,
});

async function runSeed() {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const priceRepo = AppDataSource.getRepository(MarketPrice);
  const articleRepo = AppDataSource.getRepository(Article);

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // 1. Seed Akun Contoh
  const users = [
    { name: 'Admin Pasartani', email: 'admin@pasartani.id', password: await hash('Admin123!'), role: Role.ADMIN, region: 'Malang' },
    { name: 'Aiko', email: 'petani@pasartani.id', password: await hash('Petani123!'), role: Role.PETANI, storeName: 'Toko Tani Makmur', phone: '08580452227', region: 'Malang' },
    { name: 'Siti Pembeli', email: 'konsumen@pasartani.id', password: await hash('Konsumen123!'), role: Role.KONSUMEN, phone: '081234567890', region: 'Malang' },
  ];
  for (const u of users) {
    const exists = await userRepo.findOneBy({ email: u.email });
    if (!exists) await userRepo.save(userRepo.create(u));
  }

  // 2. Seed Harga Pasar Hari Ini (sesuai dashboard Pasartani)
  const prices = [
    { commodityName: 'Beras', marketType: MarketType.PASAR_TRADISIONAL, province: 'Nasional', pricePerUnit: 16400, unit: 'kg', changePercent: 0, recordedDate: '2026-11-19' },
    { commodityName: 'Bawang Merah', marketType: MarketType.PASAR_TRADISIONAL, province: 'Nasional', pricePerUnit: 37050, unit: 'kg', changePercent: 0, recordedDate: '2026-11-19' },
    { commodityName: 'Bawang Putih', marketType: MarketType.PASAR_TRADISIONAL, province: 'Nasional', pricePerUnit: 38600, unit: 'kg', changePercent: 0, recordedDate: '2026-11-19' },
    { commodityName: 'Cabai Merah', marketType: MarketType.PASAR_TRADISIONAL, province: 'Nasional', pricePerUnit: 45000, unit: 'kg', changePercent: 0, recordedDate: '2026-11-19' },
    { commodityName: 'Cabai Rawit', marketType: MarketType.PASAR_TRADISIONAL, province: 'Nasional', pricePerUnit: 80950, unit: 'kg', changePercent: 0, recordedDate: '2026-11-19' },
  ];
  if ((await priceRepo.count()) === 0) {
    await priceRepo.save(priceRepo.create(prices));
  }

  // 3. Seed Tips Edukasi Harian
  if ((await articleRepo.count()) === 0) {
    await articleRepo.save(articleRepo.create({
      title: 'Tips Hari Ini: Pencatatan Jadwal Tanam',
      content: 'Catat tanggal tanam tiap lahan supaya jadwal panen lebih mudah dipantau dan estimasi keuntungan lebih akurat.',
      category: 'Tips Hari Ini',
    }));
  }

  console.log('Seeding Pasartani selesai!');
  await AppDataSource.destroy();
}

runSeed().catch((err) => { console.error(err); process.exit(1); });
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketPrice, MarketType } from './entities/market-price.entity.js';

@Injectable()
export class MarketPricesService {
  private readonly logger = new Logger(MarketPricesService.name);

  constructor(
    @InjectRepository(MarketPrice)
    private readonly priceRepo: Repository<MarketPrice>,
  ) {}

  // Otomatis berjalan setiap hari jam 08:00 pagi WIB
  @Cron('0 8 * * *', { timeZone: 'Asia/Jakarta' })
  async handleDailySync() {
    this.logger.log('Memulai sinkronisasi otomatis harga pangan dari PIHPS Bank Indonesia...');
    await this.syncFromBankIndonesia();
  }

  /**
   * Menarik data harga terbaru dari API publik PIHPS Nasional (Bank Indonesia)
   * price_type_id: 1 = Pasar Tradisional, 2 = Pasar Modern, 3 = Pedagang Besar, 4 = Produsen
   */
  async syncFromBankIndonesia(priceTypeId = 1) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `https://www.bi.go.id/hargapangan/WebSite/Home/GetGridData1?tanggal=${today}&jenispasar=${priceTypeId}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} dari server PIHPS BI`);
      }

      const json = await response.json();
      const rows = Array.isArray(json?.data) ? json.data : [];

      const marketTypeMap: Record<number, MarketType> = {
        1: MarketType.PASAR_TRADISIONAL,
        2: MarketType.PASAR_MODERN,
        3: MarketType.PEDAGANG_BESAR,
        4: MarketType.PRODUSEN,
      };

      let savedCount = 0;

      for (const item of rows) {
        // PIHPS BI mengembalikan nama komoditas (misal: "Cabai Rawit Merah") dan nilai harga per provinsi
        const commodityName: string = item.name || item.komoditas;
        const rawPrice = Number(String(item.harga ?? item.nilai ?? 0).replace(/[^0-9]/g, ''));

        if (!commodityName || !rawPrice) continue;

        // Upsert berdasarkan komoditas, provinsi, jenis pasar, dan tanggal hari ini
        const existing = await this.priceRepo.findOne({
          where: {
            commodityName,
            province: item.provinsi || 'Nasional',
            marketType: marketTypeMap[priceTypeId] ?? MarketType.PASAR_TRADISIONAL,
            recordedDate: today,
          },
        });

        if (existing) {
          existing.pricePerUnit = rawPrice;
          await this.priceRepo.save(existing);
        } else {
          await this.priceRepo.save(
            this.priceRepo.create({
              commodityName,
              province: item.provinsi || 'Nasional',
              marketType: marketTypeMap[priceTypeId] ?? MarketType.PASAR_TRADISIONAL,
              pricePerUnit: rawPrice,
              unit: 'kg',
              recordedDate: today,
            }),
          );
        }
        savedCount++;
      }

      return {
        source: 'PIHPS Nasional - Bank Indonesia',
        date: today,
        syncedRecords: savedCount,
      };
    } catch (error) {
      this.logger.warn(`Gagal tarik data langsung dari BI: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'Server PIHPS Bank Indonesia sedang sibuk atau membatasi akses IP. Gunakan data cache terakhir.',
      );
    }
  }
}
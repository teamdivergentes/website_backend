import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OrderReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genere une reference unique de la forme DVG-AAAA-NNNN.
   * S'appuie sur une sequence PostgreSQL : deux webhooks traites en parallele
   * ne peuvent pas obtenir le meme numero.
   */
  async generate(): Promise<string> {
    const rows = await this.prisma.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('order_reference_seq')`;
    const sequence = Number(rows[0].nextval);
    const year = new Date().getFullYear();
    return `DVG-${year}-${String(sequence).padStart(4, '0')}`;
  }
}

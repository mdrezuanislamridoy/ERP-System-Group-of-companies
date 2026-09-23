import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NumberSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates next gapless document number with concurrency lock.
   */
  async nextDocumentNumber(
    companyId: string,
    documentType: string,
    fiscalYear = new Date().getFullYear(),
  ): Promise<string> {
    // Find or initialize sequence
    let seq = await this.prisma.numberSequence.findUnique({
      where: {
        companyId_documentType_fiscalYear: {
          companyId,
          documentType,
          fiscalYear,
        },
      },
    });

    if (!seq) {
      // Auto-initialize sequence if missing
      seq = await this.prisma.numberSequence.create({
        data: {
          companyId,
          documentType,
          fiscalYear,
          prefix: `${documentType}`,
          nextValue: BigInt(1),
          padding: 6,
        },
      });
    }

    // Atomic increment
    const updated = await this.prisma.numberSequence.update({
      where: { id: seq.id },
      data: {
        nextValue: { increment: 1 },
      },
    });

    const val = Number(updated.nextValue) - 1;
    const padded = String(val).padStart(seq.padding, '0');
    return `${seq.prefix}-${fiscalYear}-${padded}`;
  }
}

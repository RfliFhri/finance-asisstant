import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, type: CategoryType, name: string) {
    try {
      return await this.prisma.category.create({
        data: { userId, type, name: name.trim() },
      });
    } catch (error: any) {
      if (error.code === 'P2002')
        throw new BadRequestException('Kategori tersebut sudah ada.');
      throw error;
    }
  }

  async ensureDefaults(userId: string) {
    const defaults: Array<{ type: CategoryType; name: string }> = [
      { type: 'income', name: 'Gaji' },
      { type: 'income', name: 'Lainnya' },
      { type: 'expense', name: 'Makan' },
      { type: 'expense', name: 'Transportasi' },
      { type: 'expense', name: 'Lainnya' },
    ];
    await Promise.all(
      defaults.map(async (item) => {
        const exists = await this.prisma.category.findFirst({
          where: { userId, type: item.type, name: item.name },
        });
        if (!exists) {
          await this.prisma.category.create({
            data: { ...item, userId, isDefault: true },
          });
        }
      }),
    );
  }

  async list(userId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findByName(userId: string, type: CategoryType, name: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        userId,
        type,
        name: { equals: name.trim(), mode: 'insensitive' },
      },
    });
    if (!category)
      throw new NotFoundException(
        `Kategori ${type} "${name}" tidak ditemukan.`,
      );
    return category;
  }

  async delete(userId: string, type: CategoryType, name: string) {
    const category = await this.findByName(userId, type, name);
    if (category.isDefault) {
      throw new BadRequestException('Kategori default tidak dapat dihapus.');
    }
    try {
      await this.prisma.category.delete({ where: { id: category.id } });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Kategori yang memiliki transaksi tidak dapat dihapus.',
        );
      }
      throw error;
    }
  }
}

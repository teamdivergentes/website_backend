import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { ReorderGamesDto } from './dto/reorder-games.dto';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all games ordered by position
   */
  async findAll() {
    return this.prisma.game.findMany({
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Get active games only
   */
  async findActive() {
    return this.prisma.game.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Get game by key
   */
  async findByKey(key: string) {
    const game = await this.prisma.game.findUnique({
      where: { key },
    });

    if (!game) {
      throw new NotFoundException(`Jeu avec la clé "${key}" non trouvé`);
    }

    return game;
  }

  /**
   * Get game by id
   */
  async findById(id: number) {
    const game = await this.prisma.game.findUnique({
      where: { id },
    });

    if (!game) {
      throw new NotFoundException(`Jeu #${id} non trouvé`);
    }

    return game;
  }

  /**
   * Create a new game
   */
  async create(createGameDto: CreateGameDto) {
    // Check if key already exists
    const existing = await this.prisma.game.findUnique({
      where: { key: createGameDto.key },
    });

    if (existing) {
      throw new BadRequestException(`Un jeu avec la clé "${createGameDto.key}" existe déjà`);
    }

    // Get max position if not provided
    let position = createGameDto.position;
    if (position === undefined) {
      const maxPosition = await this.prisma.game.aggregate({
        _max: { position: true },
      });
      position = (maxPosition._max.position ?? -1) + 1;
    }

    return this.prisma.game.create({
      data: {
        key: createGameDto.key,
        name: createGameDto.name,
        image: createGameDto.image,
        position,
        active: createGameDto.active ?? true,
      },
    });
  }

  /**
   * Update game
   */
  async update(id: number, updateGameDto: UpdateGameDto) {
    // If key is being changed, check for conflicts
    if (updateGameDto.key) {
      const existing = await this.prisma.game.findUnique({
        where: { key: updateGameDto.key },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`Un jeu avec la clé "${updateGameDto.key}" existe déjà`);
      }
    }

    try {
      return await this.prisma.game.update({
        where: { id },
        data: updateGameDto,
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        throw new NotFoundException(`Jeu #${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Delete game
   */
  async delete(id: number) {
    try {
      await this.prisma.game.delete({
        where: { id },
      });

      return { message: 'Jeu supprimé avec succès' };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        throw new NotFoundException(`Jeu #${id} non trouvé`);
      }
      throw error;
    }
  }

  /**
   * Reorder games
   */
  async reorder(reorderDto: ReorderGamesDto) {
    await this.prisma.$transaction(
      reorderDto.items.map((item) =>
        this.prisma.game.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );

    return { message: 'Ordre des jeux mis à jour avec succès' };
  }

  /**
   * Toggle game active status
   */
  async toggleActive(id: number) {
    const game = await this.findById(id);

    return this.prisma.game.update({
      where: { id },
      data: { active: !game.active },
    });
  }

  /**
   * Seed initial games (for migrations)
   */
  async seedGames() {
    const games = [
      { key: 'lol', name: 'League of Legends', position: 0 },
      { key: 'valorant', name: 'Valorant', position: 1 },
      { key: 'rl', name: 'Rocket League', position: 2 },
      { key: 'cs', name: 'Counter-Strike', position: 3 },
      { key: 'tft', name: 'Teamfight Tactics', position: 4 },
    ];

    for (const game of games) {
      await this.prisma.game.upsert({
        where: { key: game.key },
        update: {},
        create: game,
      });
    }

    return { message: 'Jeux initiaux créés avec succès', count: games.length };
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { ReorderGamesDto } from './dto/reorder-games.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * GET /api/games - Liste tous les jeux (public)
   */
  @Public()
  @Get()
  findAll() {
    return this.gamesService.findAll();
  }

  /**
   * GET /api/games/active - Liste uniquement les jeux actifs (public)
   */
  @Public()
  @Get('active')
  findActive() {
    return this.gamesService.findActive();
  }

  /**
   * GET /api/games/:key - Récupère un jeu par sa clé (public)
   */
  @Public()
  @Get(':key')
  findByKey(@Param('key') key: string) {
    return this.gamesService.findByKey(key);
  }

  /**
   * POST /api/games - Crée un jeu (admin)
   */
  @Post()
  create(@Body() createGameDto: CreateGameDto) {
    return this.gamesService.create(createGameDto);
  }

  /**
   * PUT /api/games/:id - Met à jour un jeu (admin)
   */
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateGameDto: UpdateGameDto) {
    return this.gamesService.update(id, updateGameDto);
  }

  /**
   * DELETE /api/games/:id - Supprime un jeu (admin)
   */
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.delete(id);
  }

  /**
   * PATCH /api/games/reorder - Réordonne les jeux (admin)
   */
  @Patch('reorder')
  reorder(@Body() reorderDto: ReorderGamesDto) {
    return this.gamesService.reorder(reorderDto);
  }

  /**
   * PATCH /api/games/:id/toggle - Active/désactive un jeu (admin)
   */
  @Patch(':id/toggle')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.toggleActive(id);
  }

  /**
   * POST /api/games/seed - Seed les jeux initiaux (admin)
   */
  @Post('seed')
  seedGames() {
    return this.gamesService.seedGames();
  }
}

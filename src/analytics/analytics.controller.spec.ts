import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Reflector } from '@nestjs/core';

const mockAnalyticsService = {
  getOverview: jest.fn(),
  getVisitorsByDay: jest.fn(),
  getTopPages: jest.fn(),
  getTrafficSources: jest.fn(),
  getGeography: jest.fn(),
  getDevices: jest.fn(),
  getRealtime: jest.fn(),
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        Reflector,
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverview', () => {
    it('devrait déléguer au service avec les bons paramètres', async () => {
      const expected = { period: {}, metrics: {} };
      mockAnalyticsService.getOverview.mockResolvedValue(expected);

      const result = await controller.getOverview({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(mockAnalyticsService.getOverview).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
      expect(result).toBe(expected);
    });
  });

  describe('getVisitors', () => {
    it('devrait déléguer au service', async () => {
      const expected = { period: {}, data: [] };
      mockAnalyticsService.getVisitorsByDay.mockResolvedValue(expected);

      const result = await controller.getVisitors({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(mockAnalyticsService.getVisitorsByDay).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
      expect(result).toBe(expected);
    });
  });

  describe('getTopPages', () => {
    it('devrait transmettre la limite au service', async () => {
      const expected = { period: {}, data: [] };
      mockAnalyticsService.getTopPages.mockResolvedValue(expected);

      const result = await controller.getTopPages({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 20,
      });

      expect(mockAnalyticsService.getTopPages).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 20);
      expect(result).toBe(expected);
    });

    it('devrait utiliser la limite par défaut si non fournie', async () => {
      mockAnalyticsService.getTopPages.mockResolvedValue({ period: {}, data: [] });

      await controller.getTopPages({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(mockAnalyticsService.getTopPages).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-31',
        undefined,
      );
    });
  });

  describe('getTrafficSources', () => {
    it('devrait déléguer au service', async () => {
      const expected = { period: {}, data: [], byChannel: [] };
      mockAnalyticsService.getTrafficSources.mockResolvedValue(expected);

      const result = await controller.getTrafficSources({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(mockAnalyticsService.getTrafficSources).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
      expect(result).toBe(expected);
    });
  });

  describe('getGeography', () => {
    it('devrait déléguer au service', async () => {
      const expected = { period: {}, byCountry: [], byCity: [] };
      mockAnalyticsService.getGeography.mockResolvedValue(expected);

      const result = await controller.getGeography({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(mockAnalyticsService.getGeography).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
      expect(result).toBe(expected);
    });
  });

  describe('getDevices', () => {
    it('devrait déléguer au service', async () => {
      const expected = { period: {}, byCategory: [], byBrowser: [] };
      mockAnalyticsService.getDevices.mockResolvedValue(expected);

      const result = await controller.getDevices({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(mockAnalyticsService.getDevices).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
      expect(result).toBe(expected);
    });
  });

  describe('getRealtime', () => {
    it('devrait déléguer au service sans paramètres', async () => {
      const expected = { activeUsers: 42, byPage: [], byCountry: [], byDevice: [], updatedAt: '' };
      mockAnalyticsService.getRealtime.mockResolvedValue(expected);

      const result = await controller.getRealtime();

      expect(mockAnalyticsService.getRealtime).toHaveBeenCalledWith();
      expect(result).toBe(expected);
    });
  });

  describe('Métadonnées de sécurité', () => {
    it('devrait avoir le décorateur @Roles(admin) sur la classe', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>('roles', AnalyticsController);
      expect(roles).toContain('admin');
    });
  });
});

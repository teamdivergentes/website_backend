import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/ (GET)', () => {
    it('should return 401 when not authenticated', () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      return request(server).get('/').expect(401);
    });
  });

  describe('/health (GET)', () => {
    it('should return health status without authentication', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = await request(server).get('/health').expect(200);

      const body = response.body as {
        status: string;
        timestamp: string;
        uptime: number;
      };

      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(typeof body.uptime).toBe('number');
    });
  });
});

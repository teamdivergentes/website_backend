import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  name: string;
  version: string;
}

@Controller('api/version')
export class VersionController {
  private readonly packageJson: PackageJson;

  constructor() {
    try {
      const packagePath = join(process.cwd(), 'package.json');
      const packageContent = readFileSync(packagePath, 'utf-8');
      this.packageJson = JSON.parse(packageContent);
    } catch {
      this.packageJson = { name: 'unknown', version: '0.0.0' };
    }
  }

  @Get()
  @Public()
  getVersion() {
    return {
      name: this.packageJson.name,
      version: this.packageJson.version,
      buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    };
  }
}

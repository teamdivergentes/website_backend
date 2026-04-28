import { BadGatewayException } from '@nestjs/common';
import type { MetricWithComparison } from './dto/analytics-response.dto';

// FIX [ALPHA-007] Timeout en ms pour tous les appels vers l'API Google Analytics
export const GA_API_TIMEOUT_MS = 10000;

/** Représente une valeur de dimension GA4 (string ou null selon l'API) */
export interface GaDimensionValue {
  value?: string | null;
}

/** Représente une valeur de métrique GA4 */
export interface GaMetricValue {
  value?: string | null;
}

/** Représente une ligne de résultat GA4 */
export interface GaRow {
  dimensionValues?: GaDimensionValue[];
  metricValues?: GaMetricValue[];
}

/** Représente une ligne de catégorie de device */
export interface DeviceRow {
  category: string;
  totalUsers: number;
  sessions: number;
}

/** Représente une ligne de navigateur */
export interface BrowserRow {
  browser: string;
  totalUsers: number;
  sessions: number;
}

export function gaParseFloat(value: string | undefined): number {
  return parseFloat(value ?? '0') || 0;
}

export function gaParseInt(value: string | undefined): number {
  return parseInt(value ?? '0', 10) || 0;
}

export function calcChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

export function buildComparison(current: number, previous: number): MetricWithComparison {
  return {
    value: current,
    previous,
    changePercent: calcChangePercent(current, previous),
  };
}

export function computePreviousPeriod(
  startDate: string,
  endDate: string,
): { prevStart: string; prevEnd: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new BadGatewayException('Dates de période invalides');
  }
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 86400000); // day before start
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { prevStart: fmt(prevStart), prevEnd: fmt(prevEnd) };
}

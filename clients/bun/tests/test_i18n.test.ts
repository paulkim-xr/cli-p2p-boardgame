import { describe, test, expect } from 'bun:test';
import { t, setLocale } from '../src/framework/i18n';

describe('i18n', () => {
  test('t returns key for missing string', () => {
    setLocale('en');
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  test('t returns english translation', () => {
    setLocale('en');
    expect(t('nim.title')).toBe('Nim');
  });

  test('t interpolates variables', () => {
    setLocale('en');
    const result = t('nim.turn', { player: 'alice' });
    expect(result).toContain('alice');
  });

  test('t korean locale', () => {
    setLocale('ko');
    expect(t('nim.title')).toContain('Nim');
    setLocale('en');
  });

  test('t falls back to english for missing ko key', () => {
    setLocale('ko');
    const result = t('nim.title');
    expect(result.length).toBeGreaterThan(0);
    setLocale('en');
  });
});

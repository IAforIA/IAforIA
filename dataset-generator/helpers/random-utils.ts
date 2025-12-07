/**
 * Random Utilities - Geração de dados sintéticos para datasets
 * Dataset Generator - Agent Zero v3.0
 */

export class RandomUtils {
  private static readonly IPS = [
    '192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.45', 
    '198.51.100.78', '8.8.8.8', '1.1.1.1', '45.33.32.156',
    '151.101.1.69', '185.199.108.153'
  ];

  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'curl/7.64.1', 'PostmanRuntime/7.29.0', 'python-requests/2.28.1',
    'Suspicious-Bot/1.0', 'Scrapy/2.6.0', 'wget/1.21.3'
  ];

  private static readonly EMAILS = [
    'user@example.com', 'admin@test.com', 'attacker@evil.com',
    'bot@automated.net', 'test123@gmail.com', 'hacker@dark.web',
    'normal.user@company.com', 'john.doe@business.org'
  ];

  private static readonly ENDPOINTS = [
    '/api/login', '/api/orders', '/api/payments', '/api/users',
    '/api/admin/settings', '/api/data/export', '/api/health',
    '/api/dashboard', '/api/reports', '/graphql'
  ];

  private static readonly SERVICES = [
    'database', 'redis', 'payment-gateway', 'auth-service',
    'notification-service', 'email-provider', 'sms-gateway',
    'storage-service', 'analytics-api', 'external-api'
  ];

  private static readonly DEPENDENCIES = [
    'express@4.18.2', 'lodash@4.17.21', 'axios@1.3.4',
    'jsonwebtoken@9.0.0', 'bcrypt@5.1.0', 'pg@8.10.0',
    'redis@4.6.5', 'stripe@12.0.0', 'aws-sdk@2.1350.0'
  ];

  static randomIP(): string {
    return this.randomElement(this.IPS);
  }

  static randomUserAgent(): string {
    return this.randomElement(this.USER_AGENTS);
  }

  static randomEmail(): string {
    return this.randomElement(this.EMAILS);
  }

  static randomEndpoint(): string {
    return this.randomElement(this.ENDPOINTS);
  }

  static randomService(): string {
    return this.randomElement(this.SERVICES);
  }

  static randomDependency(): string {
    return this.randomElement(this.DEPENDENCIES);
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  static randomBoolean(): boolean {
    return Math.random() > 0.5;
  }

  static randomTimestamp(daysAgo: number = 30): number {
    const now = Date.now();
    const offset = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
    return now - offset;
  }

  static randomSeverity(): 'baixa' | 'media' | 'alta' | 'critica' {
    const r = Math.random();
    if (r < 0.2) return 'baixa';
    if (r < 0.5) return 'media';
    if (r < 0.8) return 'alta';
    return 'critica';
  }

  static generateUserId(): string {
    return `user_${this.randomInt(1000, 9999)}`;
  }

  static generateOrderId(): string {
    return `order_${Date.now()}_${this.randomInt(100, 999)}`;
  }

  static generateTransactionId(): string {
    return `txn_${Date.now()}_${this.randomInt(1000, 9999)}`;
  }
}

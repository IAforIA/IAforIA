import { Request, Response, NextFunction } from 'express';

/**
 * STRICT COST CONTROL FOR OPENAI API
 * 
 * Pricing (gpt-4o-mini):
 * - Input: $0.150 / 1M tokens
 * - Output: $0.600 / 1M tokens
 * 
 * Average chat: ~200 input + 150 output = ~$0.0001125 per message
 * 
 * Budget Limits:
 * - Max 50 AI messages per user per day
 * - Max 500 AI messages total per day
 * - Cooldown: 30 seconds between AI requests per user
 */

interface RateLimitEntry {
  count: number;
  firstRequest: Date;
  lastRequest: Date;
}

interface CooldownEntry {
  lastRequest: Date;
}

class ChatRateLimiter {
  // Per-user daily limits
  private userDailyLimits: Map<string, RateLimitEntry> = new Map();
  
  // Global daily limit
  private globalDailyLimit: RateLimitEntry = {
    count: 0,
    firstRequest: new Date(),
    lastRequest: new Date(),
  };

  // Per-user cooldowns (prevents rapid-fire requests)
  private userCooldowns: Map<string, CooldownEntry> = new Map();

  // Configuration
  private readonly MAX_REQUESTS_PER_USER_PER_DAY = 50;
  private readonly MAX_REQUESTS_GLOBAL_PER_DAY = 500;
  private readonly COOLDOWN_SECONDS = 30;
  private readonly DAILY_RESET_HOURS = 24;

  /**
   * Check if user can make an AI request
   */
  canMakeRequest(userId: string): { allowed: boolean; reason?: string; retryAfter?: number } {
    const now = new Date();

    // 1. Check global daily limit
    if (this.isExpired(this.globalDailyLimit.firstRequest, this.DAILY_RESET_HOURS)) {
      this.resetGlobalLimit();
    }

    if (this.globalDailyLimit.count >= this.MAX_REQUESTS_GLOBAL_PER_DAY) {
      return {
        allowed: false,
        reason: 'Limite global diário atingido. IA temporariamente indisponível.',
        retryAfter: this.getTimeUntilReset(this.globalDailyLimit.firstRequest, this.DAILY_RESET_HOURS),
      };
    }

    // 2. Check per-user daily limit
    let userLimit = this.userDailyLimits.get(userId);
    
    if (userLimit && this.isExpired(userLimit.firstRequest, this.DAILY_RESET_HOURS)) {
      this.userDailyLimits.delete(userId);
      userLimit = undefined;
    }

    if (userLimit && userLimit.count >= this.MAX_REQUESTS_PER_USER_PER_DAY) {
      return {
        allowed: false,
        reason: `Você atingiu o limite de ${this.MAX_REQUESTS_PER_USER_PER_DAY} mensagens IA por dia.`,
        retryAfter: this.getTimeUntilReset(userLimit.firstRequest, this.DAILY_RESET_HOURS),
      };
    }

    // 3. Check cooldown
    const cooldown = this.userCooldowns.get(userId);
    if (cooldown) {
      const secondsSinceLastRequest = (now.getTime() - cooldown.lastRequest.getTime()) / 1000;
      
      if (secondsSinceLastRequest < this.COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(this.COOLDOWN_SECONDS - secondsSinceLastRequest);
        return {
          allowed: false,
          reason: `Aguarde ${waitSeconds}s antes de enviar outra mensagem.`,
          retryAfter: waitSeconds,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record a successful AI request
   */
  recordRequest(userId: string): void {
    const now = new Date();

    // Update global limit
    this.globalDailyLimit.count++;
    this.globalDailyLimit.lastRequest = now;

    // Update user limit
    let userLimit = this.userDailyLimits.get(userId);
    if (!userLimit) {
      userLimit = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
      };
      this.userDailyLimits.set(userId, userLimit);
    }
    userLimit.count++;
    userLimit.lastRequest = now;

    // Update cooldown
    this.userCooldowns.set(userId, { lastRequest: now });
  }

  /**
   * Get current usage stats for a user
   */
  getUserStats(userId: string): {
    dailyCount: number;
    dailyLimit: number;
    globalCount: number;
    globalLimit: number;
    canRequest: boolean;
    cooldownRemaining: number;
  } {
    const userLimit = this.userDailyLimits.get(userId);
    const cooldown = this.userCooldowns.get(userId);
    const now = new Date();

    let cooldownRemaining = 0;
    if (cooldown) {
      const secondsSinceLastRequest = (now.getTime() - cooldown.lastRequest.getTime()) / 1000;
      cooldownRemaining = Math.max(0, this.COOLDOWN_SECONDS - secondsSinceLastRequest);
    }

    return {
      dailyCount: userLimit?.count || 0,
      dailyLimit: this.MAX_REQUESTS_PER_USER_PER_DAY,
      globalCount: this.globalDailyLimit.count,
      globalLimit: this.MAX_REQUESTS_GLOBAL_PER_DAY,
      canRequest: this.canMakeRequest(userId).allowed,
      cooldownRemaining: Math.ceil(cooldownRemaining),
    };
  }

  private isExpired(startDate: Date, hours: number): boolean {
    const now = new Date();
    const elapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return elapsed >= hours;
  }

  private getTimeUntilReset(startDate: Date, hours: number): number {
    const now = new Date();
    const resetTime = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
    return Math.ceil((resetTime.getTime() - now.getTime()) / 1000);
  }

  private resetGlobalLimit(): void {
    this.globalDailyLimit = {
      count: 0,
      firstRequest: new Date(),
      lastRequest: new Date(),
    };
  }

  /**
   * Admin function to reset all limits (use sparingly)
   */
  resetAllLimits(): void {
    this.userDailyLimits.clear();
    this.userCooldowns.clear();
    this.resetGlobalLimit();
  }
}

// Singleton instance
export const chatRateLimiter = new ChatRateLimiter();

/**
 * Express middleware to enforce rate limits
 */
export function rateLimitChatMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  // Only apply rate limiting to AI-powered categories
  const category = req.body.category;
  const requiresAI = ['suporte', 'problema'].includes(category);

  if (!requiresAI) {
    // status_entrega messages don't use AI, skip rate limiting
    return next();
  }

  const check = chatRateLimiter.canMakeRequest(userId);

  if (!check.allowed) {
    return res.status(429).json({
      error: check.reason,
      retryAfter: check.retryAfter,
      type: 'rate_limit',
    });
  }

  // Allow request to proceed
  next();
}

/**
 * Record successful AI usage (call this after AI response is generated)
 */
export function recordAIUsage(userId: string): void {
  chatRateLimiter.recordRequest(userId);
}

/**
 * Get usage stats endpoint
 */
export function getUserUsageStats(userId: string) {
  return chatRateLimiter.getUserStats(userId);
}

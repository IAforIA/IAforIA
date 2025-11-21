/**
 * COST TRACKING AND BUDGET ENFORCEMENT
 * 
 * Tracks token usage and estimated costs to prevent budget overruns
 */

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  timestamp: Date;
}

interface DailyBudget {
  date: string; // YYYY-MM-DD
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

class CostTracker {
  // Pricing for gpt-4o-mini (as of 2024)
  private readonly INPUT_COST_PER_1M_TOKENS = 0.150; // $0.150 per 1M input tokens
  private readonly OUTPUT_COST_PER_1M_TOKENS = 0.600; // $0.600 per 1M output tokens

  // Budget limits
  private readonly DAILY_BUDGET_USD = 5.00; // $5 per day max
  private readonly WARN_THRESHOLD_PERCENT = 75; // Warn at 75% of budget

  // Storage
  private dailyBudgets: Map<string, DailyBudget> = new Map();
  private recentUsages: TokenUsage[] = [];

  /**
   * Calculate cost for a token usage
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * this.INPUT_COST_PER_1M_TOKENS;
    const outputCost = (outputTokens / 1_000_000) * this.OUTPUT_COST_PER_1M_TOKENS;
    return inputCost + outputCost;
  }

  /**
   * Record token usage
   */
  recordUsage(inputTokens: number, outputTokens: number): void {
    const cost = this.calculateCost(inputTokens, outputTokens);
    const today = this.getTodayKey();

    // Update daily budget
    let budget = this.dailyBudgets.get(today);
    if (!budget) {
      budget = {
        date: today,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        requestCount: 0,
      };
      this.dailyBudgets.set(today, budget);
    }

    budget.totalInputTokens += inputTokens;
    budget.totalOutputTokens += outputTokens;
    budget.totalCost += cost;
    budget.requestCount++;

    // Store recent usage
    this.recentUsages.push({
      inputTokens,
      outputTokens,
      estimatedCost: cost,
      timestamp: new Date(),
    });

    // Keep only last 100 usages in memory
    if (this.recentUsages.length > 100) {
      this.recentUsages.shift();
    }

    // Cleanup old daily budgets (keep last 7 days)
    this.cleanupOldBudgets();

    // Log warning if approaching budget
    if (budget.totalCost >= this.DAILY_BUDGET_USD * (this.WARN_THRESHOLD_PERCENT / 100)) {
      console.warn(`⚠️  COST WARNING: ${Math.round((budget.totalCost / this.DAILY_BUDGET_USD) * 100)}% of daily budget used ($${budget.totalCost.toFixed(4)} / $${this.DAILY_BUDGET_USD})`);
    }
  }

  /**
   * Check if we can afford another request
   */
  canAffordRequest(): { allowed: boolean; reason?: string; budgetInfo?: any } {
    const today = this.getTodayKey();
    const budget = this.dailyBudgets.get(today);

    if (!budget) {
      return { allowed: true };
    }

    if (budget.totalCost >= this.DAILY_BUDGET_USD) {
      return {
        allowed: false,
        reason: `Orçamento diário excedido ($${budget.totalCost.toFixed(4)} / $${this.DAILY_BUDGET_USD}). IA indisponível até amanhã.`,
        budgetInfo: {
          spent: budget.totalCost,
          limit: this.DAILY_BUDGET_USD,
          percentUsed: Math.round((budget.totalCost / this.DAILY_BUDGET_USD) * 100),
        },
      };
    }

    return {
      allowed: true,
      budgetInfo: {
        spent: budget.totalCost,
        limit: this.DAILY_BUDGET_USD,
        percentUsed: Math.round((budget.totalCost / this.DAILY_BUDGET_USD) * 100),
        remaining: this.DAILY_BUDGET_USD - budget.totalCost,
      },
    };
  }

  /**
   * Get today's budget stats
   */
  getTodayStats(): DailyBudget & { percentUsed: number; remaining: number } {
    const today = this.getTodayKey();
    const budget = this.dailyBudgets.get(today) || {
      date: today,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requestCount: 0,
    };

    return {
      ...budget,
      percentUsed: Math.round((budget.totalCost / this.DAILY_BUDGET_USD) * 100),
      remaining: Math.max(0, this.DAILY_BUDGET_USD - budget.totalCost),
    };
  }

  /**
   * Estimate cost for a potential request
   */
  estimateRequestCost(promptLength: number, maxResponseTokens: number = 150): number {
    // Rough estimation: 1 token ≈ 4 characters
    const estimatedInputTokens = Math.ceil(promptLength / 4);
    return this.calculateCost(estimatedInputTokens, maxResponseTokens);
  }

  private getTodayKey(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private cleanupOldBudgets(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffKey = cutoffDate.toISOString().split('T')[0];

    for (const [key] of this.dailyBudgets) {
      if (key < cutoffKey) {
        this.dailyBudgets.delete(key);
      }
    }
  }

  /**
   * Get all budget history
   */
  getBudgetHistory(): DailyBudget[] {
    return Array.from(this.dailyBudgets.values()).sort((a, b) => 
      b.date.localeCompare(a.date)
    );
  }

  /**
   * Reset today's budget (emergency use only)
   */
  resetTodayBudget(): void {
    const today = this.getTodayKey();
    this.dailyBudgets.delete(today);
    console.warn('⚠️  Today\'s budget has been manually reset');
  }
}

// Singleton instance
export const costTracker = new CostTracker();

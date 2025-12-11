/**
 * Claude CLI Wrapper Service
 * Invokes Claude Code CLI to process AI requests, turning Claude Max into a local API
 */

import { spawn } from 'child_process';
import {
  ClaudeCliRequest,
  ClaudeCliResponse,
  ClaudeCliServiceConfig,
  DEFAULT_CONFIG,
  QueueItem,
} from './types';
import { parseClaudeResponse } from './parser';

class ClaudeCliService {
  private config: ClaudeCliServiceConfig;
  private queue: QueueItem[] = [];
  private activeRequests = 0;
  private requestCounter = 0;

  constructor(config: Partial<ClaudeCliServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send a prompt to Claude CLI and get a response
   */
  async query<T = unknown>(request: ClaudeCliRequest): Promise<ClaudeCliResponse<T>> {
    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestCounter}-${Date.now()}`;

      this.queue.push({
        id,
        request,
        resolve: resolve as (response: ClaudeCliResponse) => void,
        reject,
        addedAt: Date.now(),
      });

      // Sort by priority (higher first)
      this.queue.sort((a, b) => (b.request.priority ?? 0) - (a.request.priority ?? 0));

      this.processQueue();
    });
  }

  /**
   * Query with automatic JSON parsing
   * Includes schema hint in prompt for better structured output
   */
  async queryJson<T>(
    prompt: string,
    jsonSchema: string,
    options: Partial<ClaudeCliRequest> = {}
  ): Promise<ClaudeCliResponse<T>> {
    const fullPrompt = `You are an API that returns only valid JSON. No markdown code fences, no explanation, no extra text - just the raw JSON object.

${prompt}

Return a JSON object matching this TypeScript interface:
${jsonSchema}`;

    return this.query<T>({
      ...options,
      prompt: fullPrompt,
      jsonSchema,
    });
  }

  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.config.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeRequests++;

    try {
      const response = await this.executeWithRetry(item.request);
      item.resolve(response);
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private async executeWithRetry(request: ClaudeCliRequest): Promise<ClaudeCliResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.executeRequest(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.config.retryOnError || attempt === this.config.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = this.config.retryDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError?.message ?? 'Unknown error',
      durationMs: 0,
    };
  }

  private executeRequest(request: ClaudeCliRequest): Promise<ClaudeCliResponse> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = request.timeout ?? this.config.defaultTimeout;

      const args = ['--print'];

      const proc = spawn('claude', args, {
        cwd: request.workingDirectory,
        shell: true,
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Send prompt to stdin
      proc.stdin.write(request.prompt);
      proc.stdin.end();

      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        if (killed) {
          resolve({
            success: false,
            error: `Request timed out after ${timeout}ms`,
            rawOutput: stdout,
            durationMs,
          });
          return;
        }

        if (code !== 0) {
          resolve({
            success: false,
            error: stderr || `Claude CLI exited with code ${code}`,
            rawOutput: stdout,
            durationMs,
          });
          return;
        }

        // Try to parse as JSON if schema was provided
        const parsed = parseClaudeResponse(stdout, !!request.jsonSchema);

        resolve({
          success: true,
          data: parsed.data,
          rawOutput: stdout,
          durationMs,
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Failed to spawn Claude CLI: ${error.message}`,
          durationMs: Date.now() - startTime,
        });
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  getStatus(): { queueLength: number; activeRequests: number } {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
    };
  }

  /**
   * Clear pending requests (does not cancel active ones)
   */
  clearQueue(): number {
    const cleared = this.queue.length;
    this.queue.forEach((item) => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    return cleared;
  }
}

// Singleton instance
let serviceInstance: ClaudeCliService | null = null;

export function getClaudeCliService(config?: Partial<ClaudeCliServiceConfig>): ClaudeCliService {
  if (!serviceInstance) {
    serviceInstance = new ClaudeCliService(config);
  }
  return serviceInstance;
}

export function resetClaudeCliService(): void {
  if (serviceInstance) {
    serviceInstance.clearQueue();
    serviceInstance = null;
  }
}

export { ClaudeCliService };

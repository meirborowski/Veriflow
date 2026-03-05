import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface RunResultPayload {
  status: string;
  duration?: number;
  completedAt?: string;
  errorMessage?: string;
  logs?: string;
}

@Injectable()
export class ReporterService {
  private readonly logger = new Logger(ReporterService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = config.get<string>('VERIFLOW_API_URL', 'http://localhost:3001/api/v1');
    this.apiKey = config.get<string>('WORKER_API_KEY', '');
  }

  async updateStatus(runId: string, status: string): Promise<void> {
    // Intermediate status update — swallow errors so transient failures don't abort the run
    try {
      await axios.patch(
        `${this.apiUrl}/automation/runs/${runId}/status`,
        { status },
        { headers: { 'x-worker-api-key': this.apiKey } },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to update status for run ${runId}: ${message}`);
    }
  }

  async reportResult(runId: string, payload: RunResultPayload): Promise<void> {
    // Final result — let errors propagate so the caller knows the outcome was not persisted
    await axios.patch(
      `${this.apiUrl}/automation/runs/${runId}/status`,
      payload,
      { headers: { 'x-worker-api-key': this.apiKey } },
    );
  }
}

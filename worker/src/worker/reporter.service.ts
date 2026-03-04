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
    await this.patch(runId, { status });
  }

  async reportResult(runId: string, payload: RunResultPayload): Promise<void> {
    await this.patch(runId, payload);
  }

  private async patch(runId: string, body: object): Promise<void> {
    try {
      await axios.patch(`${this.apiUrl}/automation/runs/${runId}/status`, body, {
        headers: { 'x-worker-api-key': this.apiKey },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to PATCH run ${runId}: ${message}`);
      // Do not rethrow — a reporting failure should not mask the original test result
    }
  }
}

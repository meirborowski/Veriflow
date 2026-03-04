import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path/posix';
import simpleGit, { SimpleGit } from 'simple-git';

const CACHE_ROOT = '/tmp/veriflow-repos';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  /**
   * Prepares a local clone of the repo at the given branch.
   * Uses a SHA-256-based cache directory: cache hit → git pull, miss → git clone --depth 1.
   * Returns the absolute path to the local repo directory.
   */
  async prepare(repoUrl: string, branch: string, authToken?: string): Promise<string> {
    const authenticatedUrl = authToken ? this.injectToken(repoUrl, authToken) : repoUrl;
    const cacheKey = createHash('sha256').update(`${repoUrl}::${branch}`).digest('hex');
    const repoDir = join(CACHE_ROOT, cacheKey);

    if (existsSync(join(repoDir, '.git'))) {
      this.logger.log(`Cache hit for ${repoUrl}@${branch} — pulling`);
      const git: SimpleGit = simpleGit(repoDir);
      await git.pull('origin', branch);
    } else {
      this.logger.log(`Cache miss for ${repoUrl}@${branch} — cloning`);
      await simpleGit().clone(authenticatedUrl, repoDir, [
        '--depth', '1',
        '--branch', branch,
      ]);
    }

    return repoDir;
  }

  private injectToken(repoUrl: string, token: string): string {
    // Insert token into HTTPS URL: https://token@host/path
    return repoUrl.replace(/^(https?:\/\/)/, `$1${token}@`);
  }
}

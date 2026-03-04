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
      try {
        await git.pull('origin', branch);
      } catch (err: unknown) {
        throw this.wrapGitError(err, repoUrl, branch);
      }
    } else {
      this.logger.log(`Cache miss for ${repoUrl}@${branch} — cloning`);
      try {
        await simpleGit().clone(authenticatedUrl, repoDir, [
          '--depth', '1',
          '--branch', branch,
        ]);
      } catch (err: unknown) {
        throw this.wrapGitError(err, repoUrl, branch);
      }
    }

    return repoDir;
  }

  private wrapGitError(err: unknown, repoUrl: string, branch: string): Error {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('Remote branch') && raw.includes('not found')) {
      return new Error(`Branch "${branch}" not found in remote repository. Update your project's repo config to a valid branch.`);
    }
    if (raw.includes('Authentication failed') || raw.includes('could not read Username')) {
      return new Error(`Git authentication failed for ${repoUrl}. Check your auth token in the repo config.`);
    }
    if (raw.includes('Repository not found') || raw.includes('does not exist')) {
      return new Error(`Repository not found: ${repoUrl}. Check the repo URL in the project config.`);
    }
    return new Error(`Git operation failed: ${raw}`);
  }

  private injectToken(repoUrl: string, token: string): string {
    // Insert token into HTTPS URL: https://token@host/path
    return repoUrl.replace(/^(https?:\/\/)/, `$1${token}@`);
  }
}

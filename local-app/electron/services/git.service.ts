/**
 * Git Service - Manages git worktrees for journeys
 *
 * Each journey gets an isolated worktree in {projectRoot}/.worktrees/{journey-slug}/
 * with its own branch prefixed with "journey/"
 */

import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git'
import * as path from 'path'
import * as fs from 'fs'

// Types
export interface Worktree {
  path: string
  branch: string
  commit: string
  isMain: boolean
}

export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  isClean: boolean
  modified: number
  staged: number
  untracked: number
}

export interface CreateWorktreeOptions {
  projectPath: string
  branchName: string
  journeySlug: string
}

export interface CreateWorktreeResult {
  success: boolean
  worktreePath: string
  branchName: string
  error?: string
}

export interface RemoveWorktreeOptions {
  projectPath: string
  worktreePath: string
}

export interface RemoveWorktreeResult {
  success: boolean
  error?: string
}

// Helper to create kebab-case slug from journey name
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) // Limit length
}

// Helper to create branch name from journey name
export function toBranchName(journeyName: string): string {
  return `journey/${slugify(journeyName)}`
}

class GitService {
  private getGit(projectPath: string): SimpleGit {
    const options: Partial<SimpleGitOptions> = {
      baseDir: projectPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: true,
    }
    return simpleGit(options)
  }

  /**
   * Check if a path is a git repository
   */
  async isGitRepo(projectPath: string): Promise<boolean> {
    try {
      const git = this.getGit(projectPath)
      await git.revparse(['--git-dir'])
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the default branch (main or master)
   */
  async getDefaultBranch(projectPath: string): Promise<string> {
    const git = this.getGit(projectPath)

    // Try to get the default branch from remote
    try {
      const remoteInfo = await git.remote(['show', 'origin'])
      const match = remoteInfo?.match(/HEAD branch: (\S+)/)
      if (match) {
        return match[1]
      }
    } catch {
      // Remote might not be configured, fall through
    }

    // Check if main or master exists locally
    const branches = await git.branchLocal()
    if (branches.all.includes('main')) return 'main'
    if (branches.all.includes('master')) return 'master'

    // Return current branch as fallback
    return branches.current || 'main'
  }

  /**
   * List all worktrees in a project
   */
  async listWorktrees(projectPath: string): Promise<Worktree[]> {
    const git = this.getGit(projectPath)

    try {
      const result = await git.raw(['worktree', 'list', '--porcelain'])
      const worktrees: Worktree[] = []
      let current: Partial<Worktree> = {}

      for (const line of result.split('\n')) {
        if (line.startsWith('worktree ')) {
          current.path = line.substring(9)
        } else if (line.startsWith('HEAD ')) {
          current.commit = line.substring(5)
        } else if (line.startsWith('branch ')) {
          // Branch is refs/heads/xxx, extract just the name
          current.branch = line.substring(7).replace('refs/heads/', '')
        } else if (line === '') {
          if (current.path) {
            worktrees.push({
              path: current.path,
              branch: current.branch || 'detached',
              commit: current.commit || '',
              isMain: !current.path.includes('.worktrees'),
            })
          }
          current = {}
        }
      }

      return worktrees
    } catch {
      return []
    }
  }

  /**
   * Create a worktree for a journey
   */
  async createWorktree(options: CreateWorktreeOptions): Promise<CreateWorktreeResult> {
    const { projectPath, branchName, journeySlug } = options

    // Validate project is a git repo
    if (!(await this.isGitRepo(projectPath))) {
      return {
        success: false,
        worktreePath: '',
        branchName: '',
        error: 'Not a git repository',
      }
    }

    const git = this.getGit(projectPath)
    const worktreesDir = path.join(projectPath, '.worktrees')
    const worktreePath = path.join(worktreesDir, journeySlug)

    // Ensure .worktrees directory exists
    if (!fs.existsSync(worktreesDir)) {
      fs.mkdirSync(worktreesDir, { recursive: true })
    }

    // Check if worktree already exists
    if (fs.existsSync(worktreePath)) {
      // Check if it's already a worktree for this branch
      const worktrees = await this.listWorktrees(projectPath)
      const existing = worktrees.find((w) => w.path === worktreePath)
      if (existing) {
        return {
          success: true,
          worktreePath,
          branchName: existing.branch,
        }
      }

      // Directory exists but not a worktree - error
      return {
        success: false,
        worktreePath: '',
        branchName: '',
        error: `Directory already exists: ${worktreePath}`,
      }
    }

    try {
      // Get default branch to branch from
      const defaultBranch = await this.getDefaultBranch(projectPath)

      // Check if branch already exists
      const branches = await git.branchLocal()
      const branchExists = branches.all.includes(branchName)

      if (branchExists) {
        // Use existing branch
        await git.raw(['worktree', 'add', worktreePath, branchName])
      } else {
        // Create new branch from default branch
        await git.raw(['worktree', 'add', '-b', branchName, worktreePath, defaultBranch])
      }

      return {
        success: true,
        worktreePath,
        branchName,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create worktree'
      return {
        success: false,
        worktreePath: '',
        branchName: '',
        error: errorMessage,
      }
    }
  }

  /**
   * Remove a worktree
   */
  async removeWorktree(options: RemoveWorktreeOptions): Promise<RemoveWorktreeResult> {
    const { projectPath, worktreePath } = options

    if (!(await this.isGitRepo(projectPath))) {
      return {
        success: false,
        error: 'Not a git repository',
      }
    }

    const git = this.getGit(projectPath)

    try {
      // Try to remove the worktree (--force to remove even if dirty)
      await git.raw(['worktree', 'remove', worktreePath, '--force'])

      // Prune worktree references
      await git.raw(['worktree', 'prune'])

      return { success: true }
    } catch (err) {
      // Worktree might already be gone
      if (!fs.existsSync(worktreePath)) {
        // Clean up any stale worktree references
        try {
          await git.raw(['worktree', 'prune'])
        } catch {
          // Ignore prune errors
        }
        return { success: true }
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to remove worktree'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Get git status for a worktree
   */
  async getStatus(worktreePath: string): Promise<GitStatus | null> {
    if (!fs.existsSync(worktreePath)) {
      return null
    }

    const git = this.getGit(worktreePath)

    try {
      const status = await git.status()

      return {
        branch: status.current || 'unknown',
        ahead: status.ahead,
        behind: status.behind,
        isClean: status.isClean(),
        modified: status.modified.length,
        staged: status.staged.length,
        untracked: status.not_added.length,
      }
    } catch {
      return null
    }
  }

  /**
   * Get the current branch of a worktree
   */
  async getCurrentBranch(worktreePath: string): Promise<string | null> {
    if (!fs.existsSync(worktreePath)) {
      return null
    }

    const git = this.getGit(worktreePath)

    try {
      const branch = await git.revparse(['--abbrev-ref', 'HEAD'])
      return branch.trim()
    } catch {
      return null
    }
  }
}

// Singleton instance
let gitServiceInstance: GitService | null = null

export function getGitService(): GitService {
  if (!gitServiceInstance) {
    gitServiceInstance = new GitService()
  }
  return gitServiceInstance
}

export { GitService }

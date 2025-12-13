/**
 * Git IPC Handlers - Exposes git worktree operations to renderer
 */

import { ipcMain } from 'electron'
import {
  getGitService,
  CreateWorktreeOptions,
  RemoveWorktreeOptions,
  slugify,
  toBranchName,
} from '../services/git.service'

export function registerGitIpc() {
  const gitService = getGitService()

  /**
   * Check if a path is a git repository
   */
  ipcMain.handle('git:isRepo', async (_event, projectPath: string) => {
    return gitService.isGitRepo(projectPath)
  })

  /**
   * Get the default branch for a project
   */
  ipcMain.handle('git:getDefaultBranch', async (_event, projectPath: string) => {
    return gitService.getDefaultBranch(projectPath)
  })

  /**
   * List all worktrees in a project
   */
  ipcMain.handle('git:listWorktrees', async (_event, projectPath: string) => {
    return gitService.listWorktrees(projectPath)
  })

  /**
   * Create a worktree for a journey
   *
   * Input: { projectPath, journeyName }
   * Output: { success, worktreePath, branchName, error? }
   */
  ipcMain.handle(
    'git:createWorktree',
    async (
      _event,
      options: {
        projectPath: string
        journeyName: string
      }
    ) => {
      const { projectPath, journeyName } = options

      const journeySlug = slugify(journeyName)
      const branchName = toBranchName(journeyName)

      const createOptions: CreateWorktreeOptions = {
        projectPath,
        branchName,
        journeySlug,
      }

      return gitService.createWorktree(createOptions)
    }
  )

  /**
   * Remove a worktree
   *
   * Input: { projectPath, worktreePath }
   * Output: { success, error? }
   */
  ipcMain.handle('git:removeWorktree', async (_event, options: RemoveWorktreeOptions) => {
    return gitService.removeWorktree(options)
  })

  /**
   * Get git status for a worktree
   */
  ipcMain.handle('git:getStatus', async (_event, worktreePath: string) => {
    return gitService.getStatus(worktreePath)
  })

  /**
   * Get the current branch of a worktree
   */
  ipcMain.handle('git:getCurrentBranch', async (_event, worktreePath: string) => {
    return gitService.getCurrentBranch(worktreePath)
  })
}

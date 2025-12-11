import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import type { ProjectInsert } from '../../types'

interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (project: ProjectInsert) => Promise<void>
}

export function AddProjectModal({ isOpen, onClose, onSubmit }: AddProjectModalProps) {
  const [name, setName] = useState('')
  const [rootPath, setRootPath] = useState('')
  const [frontendPath, setFrontendPath] = useState('')
  const [backendPath, setBackendPath] = useState('')
  const [frontendCmd, setFrontendCmd] = useState('npm run dev')
  const [backendCmd, setBackendCmd] = useState('rails s')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleBrowse = async () => {
    const path = await window.electronAPI.dialog.openFolder()
    if (path) {
      setRootPath(path)
      // Auto-fill name from folder name if empty
      if (!name) {
        setName(path.split('/').pop() || '')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !rootPath.trim()) {
      setError('Name and root path are required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        root_path: rootPath.trim(),
        frontend_path: frontendPath.trim() || null,
        backend_path: backendPath.trim() || null,
        frontend_start_cmd: frontendCmd.trim(),
        backend_start_cmd: backendCmd.trim(),
      })
      // Reset form
      setName('')
      setRootPath('')
      setFrontendPath('')
      setBackendPath('')
      setFrontendCmd('npm run dev')
      setBackendCmd('rails s')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Project"
          required
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">
            Root Path
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="/path/to/project"
              required
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="button" variant="secondary" onClick={handleBrowse}>
              Browse
            </Button>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Optional: Sub-paths for frontend/backend
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Frontend Path"
              value={frontendPath}
              onChange={(e) => setFrontendPath(e.target.value)}
              placeholder="frontend/"
            />
            <Input
              label="Backend Path"
              value={backendPath}
              onChange={(e) => setBackendPath(e.target.value)}
              placeholder="backend/"
            />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Start Commands
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Frontend Command"
              value={frontendCmd}
              onChange={(e) => setFrontendCmd(e.target.value)}
              placeholder="npm run dev"
            />
            <Input
              label="Backend Command"
              value={backendCmd}
              onChange={(e) => setBackendCmd(e.target.value)}
              placeholder="rails s"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

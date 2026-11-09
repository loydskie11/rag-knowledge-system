import { createContext, useContext, useState, useRef, useCallback } from "react"
import type { ReactNode } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadTask {
  id: string
  docName: string
  category: string
  office: string
  version: string
  fileName: string
  progress: number
  status: 'uploading' | 'vectorizing' | 'completed' | 'error' | 'cancelled'
  statusText: string
  isVersionUpdate?: boolean
}

interface UploadQueueContextValue {
  tasks: UploadTask[]
  isQueueMinimized: boolean
  setIsQueueMinimized: (v: boolean) => void
  /** Add a task + kick off the upload. Returns the task id. */
  enqueueUpload: (params: EnqueueParams) => string
  cancelTask: (id: string) => void
  removeTask: (id: string) => void
}

interface EnqueueParams {
  docName: string
  category: string
  office: string
  version: string
  fileName: string
  endpoint: string
  formData: FormData
  isVersionUpdate?: boolean
  onComplete?: (docName: string, isVersionUpdate: boolean) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null)

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext)
  if (!ctx) throw new Error("useUploadQueue must be used inside <UploadQueueProvider>")
  return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [isQueueMinimized, setIsQueueMinimized] = useState(false)

  // AbortControllers live outside of React state so they don't get
  // stale-closed when the component that started the upload unmounts.
  const controllers = useRef<Map<string, AbortController>>(new Map())

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const enqueueUpload = useCallback(
    ({
      docName,
      category,
      office,
      version,
      fileName,
      endpoint,
      formData,
      isVersionUpdate = false,
      onComplete,
    }: EnqueueParams): string => {
      const id = (isVersionUpdate ? "update_" : "task_") + Date.now()
      const controller = new AbortController()
      controllers.current.set(id, controller)

      const newTask: UploadTask = {
        id,
        docName,
        category,
        office,
        version,
        fileName,
        progress: 5,
        status: "uploading",
        statusText: isVersionUpdate ? "Initializing version update..." : "Initializing upload...",
        isVersionUpdate,
      }

      setTasks(prev => [...prev, newTask])

      // ── Fire-and-forget async upload ──────────────────────────────────────
      ;(async () => {
        try {
          const csrfCookie = document.cookie
            .split("; ")
            .find((cookie) => cookie.startsWith("csrf_token="))
            ?.split("=")[1]

          const uploadResponse = await fetch(endpoint, {
            method: "POST",
            body: formData,
            signal: controller.signal,
            credentials: "include",
            headers: csrfCookie ? { "X-CSRF-Token": decodeURIComponent(csrfCookie) } : {},
          })
          const uploadResult = await uploadResponse.json().catch(() => ({}))
          if (!uploadResponse.ok) {
            const detail = uploadResult.detail
            const message = typeof detail === "string"
              ? detail
              : detail?.message || "The document upload failed."
            throw new Error(message)
          }

          // The upload endpoint returns before OCR/chunking/indexing finishes.
          // Follow the specific job instead of guessing with fixed delays.
          updateTask(id, {
            progress: 15,
            status: "vectorizing",
            statusText: "Reading document content...",
          })

          const jobId = uploadResult.job_id
          if (jobId) {
            const startedAt = Date.now()
            const maxWaitMs = 30 * 60 * 1000
            let finished = false

            while (!finished && Date.now() - startedAt < maxWaitMs) {
              if (Date.now() - startedAt > 500) {
                await new Promise(r => setTimeout(r, 1500))
              }

              const statusResponse = await fetch(
                `/api/documents/processing-status?job_id=${encodeURIComponent(jobId)}&t=${Date.now()}`,
                { credentials: "include", signal: controller.signal },
              )
              if (!statusResponse.ok) {
                throw new Error("Could not check document processing status.")
              }

              const statuses = await statusResponse.json()
              const current = Array.isArray(statuses) ? statuses[0] : null
              if (!current) continue

              if (current.status === "failed") {
                throw new Error(current.message || "Document processing failed.")
              }

              if (current.status === "completed") {
                finished = true
                break
              }

              const isReading = current.status === "extracting"
              updateTask(id, {
                progress: isReading ? 35 : 70,
                status: "vectorizing",
                statusText: isReading
                  ? "Reading document content..."
                  : "Preparing searchable content...",
              })
            }

            if (!finished) {
              throw new Error("Document processing took longer than expected. Please check the repository status.")
            }
          }

          updateTask(id, {
            progress: 100,
            status: "completed",
            statusText: "Document is ready and searchable.",
          })

          onComplete?.(docName, isVersionUpdate)

          // Automatically dismiss completed task after 4 seconds
          setTimeout(() => {
            setTasks(prev => prev.filter(t => t.id !== id))
          }, 4000)
        } catch (err: any) {
          if (err?.name === "AbortError") {
            updateTask(id, {
              progress: 0,
              status: "cancelled",
              statusText: "Upload cancelled by user",
            })
          } else {
            updateTask(id, {
              progress: 0,
              status: "error",
              statusText: err?.message || "Document processing failed.",
            })
            console.error(`[UploadQueue] upload failed for '${docName}':`, err)
          }
        } finally {
          controllers.current.delete(id)
        }
      })()

      return id
    },
    [updateTask]
  )

  const cancelTask = useCallback((id: string) => {
    controllers.current.get(id)?.abort()
    // State update is handled inside the async block above (AbortError branch)
    // but we also patch immediately so the UI responds at once.
    setTasks(prev =>
      prev.map(t =>
        t.id === id && (t.status === "uploading" || t.status === "vectorizing")
          ? { ...t, status: "cancelled", statusText: "Upload cancelled by user", progress: 0 }
          : t
      )
    )
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <UploadQueueContext.Provider
      value={{
        tasks,
        isQueueMinimized,
        setIsQueueMinimized,
        enqueueUpload,
        cancelTask,
        removeTask,
      }}
    >
      {children}
    </UploadQueueContext.Provider>
  )
}

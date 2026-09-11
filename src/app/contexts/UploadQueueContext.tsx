import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react"

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
          await fetch(endpoint, {
            method: "POST",
            body: formData,
            signal: controller.signal,
          }).then(async res => {
            if (!res.ok) {
              const text = await res.text().catch(() => "Unknown error")
              throw new Error(text)
            }
            return res.json()
          })

          // Server responded — mark as finalizing
          updateTask(id, {
            progress: 90,
            status: "vectorizing",
            statusText: "Finalizing document record...",
          })

          // Brief pause then mark complete
          await new Promise(r => setTimeout(r, 800))

          updateTask(id, {
            progress: 100,
            status: "completed",
            statusText: "Document active & searchable!",
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
              statusText: "Document processing failed.",
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

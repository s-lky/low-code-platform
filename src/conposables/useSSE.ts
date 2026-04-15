// composables/useSSE.ts
import { ref, onUnmounted } from 'vue'

export function useSSE(url: string) {
  const data = ref<string>('')
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  let eventSource: EventSource | null = null

  function connect() {
    eventSource = new EventSource(url)
    isConnected.value = true

    eventSource.onmessage = (event) => {
      data.value = event.data
    }

    eventSource.onerror = () => {
      error.value = '连接中断，正在重连...'
      isConnected.value = false
    }
  }

  function disconnect() {
    eventSource?.close()
    isConnected.value = false
  }

  onUnmounted(disconnect)

  return { data, isConnected, error, connect, disconnect }
}
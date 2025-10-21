import { ref, onMounted, onUnmounted } from 'vue';
import type { HookEvent, WebSocketMessage } from '../types';

import { watch } from 'vue';

export function useWebSocket(url: string, maxEventsRef: Ref<number>) {
  const events = ref<HookEvent[]>([]);
  const isConnected = ref(false);
  const error = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;

  const connect = () => {
    try {
      ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnected.value = true;
        error.value = null;

        // Send subscribe with limit immediately after open
        const subscribeMsg = JSON.stringify({ type: 'subscribe', limit: maxEventsRef.value });
        ws.send(subscribeMsg);
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'initial') {
            const initialEvents = Array.isArray(message.data) ? message.data : [];
            // Only keep the most recent events up to maxEvents
            events.value = (initialEvents.filter(e => e !== null && e !== undefined) || []).slice(-maxEventsRef.value);
          } else if (message.type === 'event') {
            const newEvent = message.data as HookEvent || null;
            if (newEvent) events.value.push(newEvent);

            // Limit events array to maxEvents, removing the oldest when exceeded
            if (events.value.length > maxEventsRef.value) {
              // Remove the oldest events
              events.value = events.value.slice(-maxEventsRef.value);
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

  // Watch maxEventsRef and slice events when it changes
  watch(maxEventsRef, (newMax) => {
    if (events.value.length > newMax) {
      events.value = events.value.slice(-newMax);
    }
  }, { immediate: false });
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        error.value = 'WebSocket connection error';
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.value = false;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      error.value = 'Failed to connect to server';
    }
  };
  
  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };
  
  onMounted(() => {
    connect();
  });
  
  onUnmounted(() => {
    disconnect();
  });

  const clearEvents = () => {
    events.value = [];
  };

  return {
    events,
    isConnected,
    error,
    clearEvents
  };
}
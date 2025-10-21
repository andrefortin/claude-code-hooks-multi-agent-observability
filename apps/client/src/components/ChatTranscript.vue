<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-4 h-full overflow-y-auto space-y-3 border-2 border-gray-300 dark:border-gray-600">
    <!-- Voice Input Button -->
    <button
      v-if="props.chat"
      @click="startVoiceInput"
      :disabled="isListening"
      class="mb-3 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-400 flex items-center justify-center space-x-2 transition-colors"
    >
      <svg v-if="isListening" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 animate-pulse text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.114 5.636a9 9 0 010 12.728M16.463 7.227a9 9 0 010 9.546m5.26-5.636A9 9 0 0112.182 7.227m3.281 5.636a9 9 0 01-3.281 5.636m0 0l-5.26-5.636a9 9 0 010-9.546m5.26 5.636L12.182 7.227" />
      </svg>
      <span v-else class="text-xl">🎤</span>
      <span class="font-medium">{{ isListening ? 'Listening...' : 'Voice Input' }}</span>
    </button>

    <div v-for="(item, index) in chatItems" :key="index">
      <!-- User Message -->
      <div v-if="item.type === 'user' && item.message"
           class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-3 flex-1">
            <span class="text-lg font-semibold px-3 py-1 rounded-full flex-shrink-0 bg-blue-500 text-white">
              User
            </span>
            <div class="flex-1">
              <p v-if="typeof item.message.content === 'string'"
                 class="text-lg text-gray-800 dark:text-gray-100 whitespace-pre-wrap font-medium">
                {{ item.message.content.includes('<command-') ? cleanCommandContent(item.message.content) : item.message.content }}
              </p>
              <div v-else-if="Array.isArray(item.message.content)" class="space-y-2">
                <div v-for="(content, cIndex) in item.message.content" :key="cIndex">
                  <p v-if="content.type === 'text'"
                     class="text-lg text-gray-800 dark:text-gray-100 whitespace-pre-wrap font-medium">
                    {{ content.text }}
                  </p>
                  <div v-else-if="content.type === 'tool_result'"
                       class="bg-gray-100 dark:bg-gray-900 p-2 rounded">
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-400">Tool Result:</span>
                    <pre class="text-sm text-gray-700 dark:text-gray-300 mt-1">{{ content.content }}</pre>
                  </div>
                </div>
              </div>
              <div v-if="item.timestamp" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {{ formatTimestamp(item.timestamp) }}
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <button
              @click="toggleDetails(index)"
              class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {{ isDetailsExpanded(index) ? 'Hide' : 'Show' }} Details
            </button>
            <button
              @click="copyMessage(index, item.type || item.role)"
              class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center"
              :title="'Copy message'"
            >
              {{ getCopyButtonText(index) }}
            </button>
          </div>
        </div>
        <div v-if="isDetailsExpanded(index)" class="mt-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
          <pre class="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">{{ JSON.stringify(item, null, 2) }}</pre>
        </div>
      </div>

      <!-- Assistant Message -->
      <div v-else-if="item.type === 'assistant' && item.message"
           class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-3 flex-1">
            <span class="text-lg font-semibold px-3 py-1 rounded-full flex-shrink-0 bg-gray-500 text-white">
              Assistant
            </span>
            <div class="flex-1">
              <div v-if="Array.isArray(item.message.content)" class="space-y-2">
                <div v-for="(content, cIndex) in item.message.content" :key="cIndex">
                  <p v-if="content.type === 'text'"
                     class="text-lg text-gray-800 dark:text-gray-100 whitespace-pre-wrap font-medium">
                    {{ content.text }}
                  </p>
                  <div v-else-if="content.type === 'tool_use'"
                       class="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                    <div class="flex items-center space-x-2 mb-2">
                      <span class="text-2xl">🔧</span>
                      <span class="font-semibold text-yellow-800 dark:text-yellow-200">{{ content.name }}</span>
                    </div>
                    <pre class="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">{{ JSON.stringify(content.input, null, 2) }}</pre>
                  </div>
                </div>
              </div>
              <div v-if="item.message.usage" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Tokens: {{ item.message.usage.input_tokens }} in / {{ item.message.usage.output_tokens }} out
              </div>
              <div v-if="item.timestamp" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ formatTimestamp(item.timestamp) }}
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <button
              @click="toggleDetails(index)"
              class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {{ isDetailsExpanded(index) ? 'Hide' : 'Show' }} Details
            </button>
            <button
              @click="copyMessage(index, item.type || item.role)"
              class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center"
              :title="'Copy message'"
            >
              {{ getCopyButtonText(index) }}
            </button>
          </div>
        </div>
        <div v-if="isDetailsExpanded(index)" class="mt-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
          <pre class="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">{{ JSON.stringify(item, null, 2) }}</pre>
        </div>
      </div>

      <!-- System Message -->
      <div v-else-if="item.type === 'system'"
           class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-3 flex-1">
            <span class="text-lg font-semibold px-3 py-1 rounded-full flex-shrink-0 bg-amber-600 text-white">
              System
            </span>
            <div class="flex-1">
              <p class="text-lg text-gray-800 dark:text-gray-100 font-medium">
                {{ cleanSystemContent(item.content || '') }}
              </p>
              <div v-if="item.toolUseID" class="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                Tool ID: {{ item.toolUseID }}
              </div>
              <div v-if="item.timestamp" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ formatTimestamp(item.timestamp) }}
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <button
              @click="toggleDetails(index)"
              class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {{ isDetailsExpanded(index) ? 'Hide' : 'Show' }} Details
            </button>
            <button
              @click="copyMessage(index, item.type || item.role)"
              class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center"
              :title="'Copy message'"
            >
              {{ getCopyButtonText(index) }}
            </button>
          </div>
        </div>
        <div v-if="isDetailsExpanded(index)" class="mt-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
          <pre class="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">{{ JSON.stringify(item, null, 2) }}</pre>
        </div>
      </div>

      <!-- Fallback for simple chat format -->
      <div v-else-if="item.role"
           class="p-3 rounded-lg"
           :class="item.role === 'user' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-900/30'">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-3 flex-1">
            <span class="text-lg font-semibold px-3 py-1 rounded-full flex-shrink-0"
                  :class="item.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'">
              {{ item.role === 'user' ? 'User' : 'Assistant' }}
            </span>
            <div class="flex-1">
              <p class="text-lg text-gray-800 dark:text-gray-100 whitespace-pre-wrap font-medium">
                {{ item.content }}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <button
              @click="toggleDetails(index)"
              class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {{ isDetailsExpanded(index) ? 'Hide' : 'Show' }} Details
            </button>
            <button
              @click="copyMessage(index, item.type || item.role)"
              class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center"
              :title="'Copy message'"
            >
              {{ getCopyButtonText(index) }}
            </button>
          </div>
        </div>
        <div v-if="isDetailsExpanded(index)" class="mt-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
          <pre class="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">{{ JSON.stringify(item, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVoice } from '../composables/useVoice';

const props = defineProps<{
  chat?: any[];
}>();

const emit = defineEmits<{
  'add-user-message': [message: any];
}>();

const { isListening, startListening } = useVoice();

// Track expanded details
const expandedDetails = ref<Set<number>>(new Set());

const startVoiceInput = () => {
  if (!isListening.value) {
    startListening((text) => {
      if (text.trim()) {
        const userMessage = {
          type: 'user',
          message: { content: text },
          timestamp: Date.now()
        };
        emit('add-user-message', userMessage);
        console.log('Voice input added:', text);
      }
    });
  }
};

const toggleDetails = (index: number) => {
  if (expandedDetails.value.has(index)) {
    expandedDetails.value.delete(index);
  } else {
    expandedDetails.value.add(index);
  }
  expandedDetails.value = new Set(expandedDetails.value);
};

const isDetailsExpanded = (index: number) => expandedDetails.value.has(index);

const chatItems = computed(() => {
  if (props.chat && props.chat.length > 0 && props.chat[0].type) {
    return props.chat;
  } else {
    return props.chat || [];
  }
});

const formatTimestamp = (timestamp: string | number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const cleanSystemContent = (content: string) => {
  return content.replace(/\u001b\[[0-9;]*m/g, '');
};

const cleanCommandContent = (content: string) => {
  return content
    .replace(/<command-message>.*?<\/command-message>/gs, '')
    .replace(/<command-name>(.*?)<\/command-name>/gs, '$1')
    .trim();
};

// Copy functionality
const copyButtonStates = ref<Map<number, string>>(new Map());

const getCopyButtonText = (index: number) => copyButtonStates.value.get(index) || '📋';

const copyMessage = async (index: number, _type: string) => {
  const item = chatItems.value[index];
  try {
    const jsonPayload = JSON.stringify(item, null, 2);
    await navigator.clipboard.writeText(jsonPayload);
    copyButtonStates.value.set(index, '✅');
    setTimeout(() => {
      copyButtonStates.value.delete(index);
      copyButtonStates.value = new Map(copyButtonStates.value);
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    copyButtonStates.value.set(index, '❌');
    setTimeout(() => {
      copyButtonStates.value.delete(index);
      copyButtonStates.value = new Map(copyButtonStates.value);
    }, 2000);
  }
  copyButtonStates.value = new Map(copyButtonStates.value);
};
</script>

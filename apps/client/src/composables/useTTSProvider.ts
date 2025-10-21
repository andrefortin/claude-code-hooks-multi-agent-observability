import { ref, onMounted } from 'vue';

export const useTTSProvider = () => {
  const provider = ref<'elevenlabs' | 'openai' | 'pyttsx3'>('openai');

  onMounted(() => {
    const saved = localStorage.getItem('ttsProvider');
    if (saved) {
      provider.value = saved as 'elevenlabs' | 'openai' | 'pyttsx3';
    }
  });

  const setProvider = (newProvider: 'elevenlabs' | 'openai' | 'pyttsx3') => {
    provider.value = newProvider;
    localStorage.setItem('ttsProvider', newProvider);
  };

  return {
    provider,
    setProvider,
  };
};

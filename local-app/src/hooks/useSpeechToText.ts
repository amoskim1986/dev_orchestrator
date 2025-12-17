import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechToTextOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseSpeechToTextReturn {
  isRecording: boolean;
  isConnecting: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleRecording: () => Promise<void>;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  // Use refs for callbacks to avoid stale closures and dependency issues
  const onTranscriptRef = useRef(options.onTranscript);
  const onErrorRef = useRef(options.onError);

  // Keep refs updated
  useEffect(() => {
    onTranscriptRef.current = options.onTranscript;
    onErrorRef.current = options.onError;
  }, [options.onTranscript, options.onError]);

  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);
  }, []);

  // Track the last processed speech_final to avoid duplicates
  const lastSpeechFinalRef = useRef<string>('');

  const startRecording = useCallback(async () => {
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    if (!apiKey) {
      const errMsg = 'Deepgram API key not configured';
      setError(errMsg);
      onErrorRef.current?.(errMsg);
      return;
    }

    setError(null);
    setIsConnecting(true);
    setTranscript('');
    setInterimTranscript('');
    lastSpeechFinalRef.current = '';

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Connect to Deepgram WebSocket
      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&interim_results=true',
        ['token', apiKey]
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnecting(false);
        setIsRecording(true);

        // Start MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.start(250); // Send audio every 250ms
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
          const text = data.channel.alternatives[0].transcript;
          if (text) {
            if (data.is_final) {
              // Dedupe: skip if we just processed this exact text
              if (text === lastSpeechFinalRef.current) {
                return;
              }
              lastSpeechFinalRef.current = text;

              // Update state first, then call callback OUTSIDE of setState
              setTranscript(prev => prev ? `${prev} ${text}` : text);
              setInterimTranscript('');
              // Call callback after state update, not inside it
              onTranscriptRef.current?.(text, true);
            } else {
              setInterimTranscript(text);
              onTranscriptRef.current?.(text, false);
            }
          }
        }
      };

      socket.onerror = () => {
        const errMsg = 'WebSocket connection error';
        setError(errMsg);
        onErrorRef.current?.(errMsg);
        cleanup();
      };

      socket.onclose = () => {
        cleanup();
      };

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errMsg);
      onErrorRef.current?.(errMsg);
      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const toggleRecording = useCallback(async () => {
    if (isRecording || isConnecting) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, isConnecting, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    isConnecting,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}

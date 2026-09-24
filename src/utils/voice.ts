export class VoiceChatManager {
  private localStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  public isMuted: boolean = true;
  public isSpeaking: boolean = false;

  private onSpeakingChangeCallbacks: Array<(speaking: boolean) => void> = [];
  private onAudioChunkCallbacks: Array<(base64: string) => void> = [];

  // Voice note recording states
  private voiceNoteRecorder: MediaRecorder | null = null;
  private voiceNoteChunks: Blob[] = [];

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public async enableMicrophone(): Promise<boolean> {
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      this.isMuted = false;
      this.startAudioAnalysis();
      this.startStreamingChunks();
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      this.isMuted = true;
      return false;
    }
  }

  public disableMicrophone() {
    this.isMuted = true;
    this.isSpeaking = false;
    this.notifySpeaking(false);

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  public toggleMicrophone(): Promise<boolean> {
    if (this.isMuted) {
      return this.enableMicrophone();
    } else {
      this.disableMicrophone();
      return Promise.resolve(false);
    }
  }

  private startAudioAnalysis() {
    if (!this.localStream) return;
    const ctx = this.getAudioContext();
    const source = ctx.createMediaStreamSource(this.localStream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let silenceCount = 0;

    const checkVolume = () => {
      if (this.isMuted || !this.analyser) {
        if (this.isSpeaking) {
          this.isSpeaking = false;
          this.notifySpeaking(false);
        }
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;

      // Threshold for voice detection
      if (avg > 14) {
        silenceCount = 0;
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.notifySpeaking(true);
        }
      } else {
        silenceCount++;
        if (silenceCount > 15 && this.isSpeaking) {
          this.isSpeaking = false;
          this.notifySpeaking(false);
        }
      }

      this.animFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }

  private startStreamingChunks() {
    if (!this.localStream) return;

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }
    }

    try {
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.localStream, { mimeType, audioBitsPerSecond: 24000 })
        : new MediaRecorder(this.localStream);

      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && !this.isMuted && this.isSpeaking) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            this.onAudioChunkCallbacks.forEach((cb) => cb(base64data));
          };
          reader.readAsDataURL(e.data);
        }
      };

      // Slice every 220ms for low latency stream
      this.mediaRecorder.start(220);
    } catch (e) {
      console.warn('Failed to start MediaRecorder for streaming:', e);
    }
  }

  public onAudioChunk(cb: (base64: string) => void) {
    this.onAudioChunkCallbacks.push(cb);
    return () => {
      this.onAudioChunkCallbacks = this.onAudioChunkCallbacks.filter((c) => c !== cb);
    };
  }

  public onSpeakingChange(cb: (speaking: boolean) => void) {
    this.onSpeakingChangeCallbacks.push(cb);
    return () => {
      this.onSpeakingChangeCallbacks = this.onSpeakingChangeCallbacks.filter((c) => c !== cb);
    };
  }

  private notifySpeaking(speaking: boolean) {
    this.onSpeakingChangeCallbacks.forEach((cb) => cb(speaking));
  }

  // Play incoming voice chunk from remote player
  public async playRemoteVoiceChunk(base64Audio: string) {
    try {
      const audio = new Audio(base64Audio);
      audio.volume = 1.0;
      await audio.play();
    } catch (err) {
      // Autoplay or decode issue, gracefully ignore
    }
  }

  // Voice Note ("Golos") Recording for chat
  public async startVoiceNote(): Promise<boolean> {
    try {
      const stream =
        this.localStream ||
        (await navigator.mediaDevices.getUserMedia({ audio: true }));
      this.voiceNoteChunks = [];

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }

      this.voiceNoteRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.voiceNoteRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.voiceNoteChunks.push(e.data);
        }
      };
      this.voiceNoteRecorder.start();
      return true;
    } catch (e) {
      console.error('Error starting voice note:', e);
      return false;
    }
  }

  public stopVoiceNote(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.voiceNoteRecorder || this.voiceNoteRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.voiceNoteRecorder.onstop = () => {
        if (this.voiceNoteChunks.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(this.voiceNoteChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      this.voiceNoteRecorder.stop();
    });
  }
}

export const voiceManager = new VoiceChatManager();

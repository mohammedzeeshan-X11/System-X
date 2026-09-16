import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  User,
  Building2,
  GraduationCap,
  Briefcase,
  Wrench,
  Award,
  CheckCircle2,
  Clock,
  Send,
  RotateCcw,
  ArrowRight,
  Shield,
  Layers,
  HelpCircle,
  FileCheck2,
  Bot,
  Flame,
  Zap,
  Square,
} from 'lucide-react';
import { OfficialProfile, ServiceCadre, ServiceGroup } from '../types';
import { computeFramework5Analysis } from '../services/framework5Engine';
import { saveOfficialProfile } from '../services/storage';

interface ExtractedDossier {
  name?: string;
  serviceCadre?: string;
  group?: string;
  designation?: string;
  department?: string;
  yearsOfExperience?: number;
  yearsInCurrentAssignment?: number;
  educationalQualification?: string;
  specialization?: string;
  pastExperiences?: string[];
  toolsUsed?: string[];
  assignedProjectTitle?: string;
  assignedProjectDivision?: string;
  assignedProjectGoals?: string;
  statisticalCompetencies?: { name: string; level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' }[];
  priorTrainings?: string[];
  learningAspirations?: string[];
  personalStrengthsAndConcerns?: string;
}

interface CallingAgentProps {
  currentProfile: OfficialProfile;
  onProfileUpdated: (updatedProfile: OfficialProfile) => void;
  onNavigateToTab?: (tab: string) => void;
}

type CallStatus = 'idle' | 'dialing' | 'ringing' | 'active' | 'ended';

// Web Audio API pure tone synthesizer
class PhoneSoundEffects {
  private ctx: AudioContext | null = null;
  private ringOsc1: OscillatorNode | null = null;
  private ringOsc2: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private isRinging: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playRing() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      this.stopRing();

      this.isRinging = true;
      const now = this.ctx.currentTime;

      // Telephone ring cadence (440Hz + 480Hz dual tone, pulsed)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;

      // Pulse pattern
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.08, now + 0.1);
      gain.gain.setValueAtTime(0, now + 1.6);
      gain.gain.setValueAtTime(0.08, now + 2.0);
      gain.gain.setValueAtTime(0, now + 3.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);

      this.ringOsc1 = osc1;
      this.ringOsc2 = osc2;
      this.ringGain = gain;
    } catch {
      // AudioContext blocked or not supported
    }
  }

  stopRing() {
    try {
      if (this.ringOsc1) {
        this.ringOsc1.stop();
        this.ringOsc1.disconnect();
        this.ringOsc1 = null;
      }
      if (this.ringOsc2) {
        this.ringOsc2.stop();
        this.ringOsc2.disconnect();
        this.ringOsc2 = null;
      }
      this.isRinging = false;
    } catch {}
  }

  playConnectChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  playDisconnectChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }
}

const sfx = new PhoneSoundEffects();

export const CallingAgent: React.FC<CallingAgentProps> = ({
  currentProfile,
  onProfileUpdated,
  onNavigateToTab,
}) => {
  // Call Session State
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [isUserListening, setIsUserListening] = useState<boolean>(false);

  // Conversation & Extraction State
  const [messages, setMessages] = useState<{ role: 'agent' | 'user'; content: string; time: string }[]>([]);
  const [userInputText, setUserInputText] = useState<string>('');
  const [isProcessingTurn, setIsProcessingTurn] = useState<boolean>(false);
  const [extractedDossier, setExtractedDossier] = useState<ExtractedDossier>({
    name: currentProfile.name !== 'New Statistical Officer (Pending Intake)' ? currentProfile.name : '',
    designation: currentProfile.designation || '',
    department: currentProfile.department || '',
    serviceCadre: currentProfile.serviceCadre || 'Indian Statistical Service',
    group: currentProfile.group || 'Group A',
    educationalQualification: currentProfile.educationalQualification || '',
    specialization: currentProfile.specialization || '',
    yearsOfExperience: currentProfile.yearsOfExperience || 5,
    toolsUsed: ['Python', 'STATA'],
  });
  const [completionPercentage, setCompletionPercentage] = useState<number>(30);
  const [nextTopicSuggestion, setNextTopicSuggestion] = useState<string>('Current Division & Mandate');
  const [agentEmotion, setAgentEmotion] = useState<string>('warm_interested');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessingTurn]);

  // Call Duration Timer
  useEffect(() => {
    if (callStatus === 'active') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Speech Helpers & Phonetic Normalization for Natural Human Cadence
  const humanizeSpeechText = (text: string): string => {
    if (!text) return '';
    return text
      // Remove markdown styling
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      // Natural spoken words for slashes and ampersands
      .replace(/\//g, ' or ')
      .replace(/&/g, ' and ')
      // Expand acronyms so browser speech synthesis pronounces them like a human
      .replace(/\bMoSPI\b/gi, 'Ministry of Statistics')
      .replace(/\bNSSO\b/g, 'N S S O')
      .replace(/\bPLFS\b/g, 'P L F S')
      .replace(/\bSDRD\b/g, 'S D R D')
      .replace(/\bNAD\b/g, 'N A D')
      .replace(/\bFOD\b/g, 'F O D')
      .replace(/\bDQID\b/g, 'D Q I D')
      .replace(/\bESD\b/g, 'E S D')
      .replace(/\bCSPro\b/gi, 'C S Pro')
      .replace(/\bCAPI\b/gi, 'C A P I')
      .replace(/\bSTATA\b/gi, 'Stata')
      .replace(/\biGOT\b/gi, 'i-Got')
      .replace(/\bKarmayogi\b/gi, 'Karma-yogi')
      .replace(/\bCBC\b/g, 'C B C')
      .replace(/\bISS\b/g, 'I S S')
      .replace(/\bSSS\b/g, 'S S S')
      .replace(/\bDr\.\b/g, 'Doctor ')
      .replace(/\bShri\b/g, 'Shree ')
      .replace(/\be\.g\./gi, 'for example')
      .replace(/\bi\.e\./gi, 'that is')
      // Soften brackets into natural pauses
      .replace(/[()[\]{}]/g, ', ')
      // Remove symbols
      .replace(/[#@$%^*~_=+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getHumanLikeVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Natural / Neural Indian English
    const indianNatural = voices.find(
      (v) =>
        (v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india')) &&
        (v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('neural') ||
          v.name.toLowerCase().includes('online'))
    );
    if (indianNatural) return indianNatural;

    // 2. Any Indian English voice
    const indianVoice = voices.find(
      (v) => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india')
    );
    if (indianVoice) return indianVoice;

    // 3. High quality natural English voices (Google Natural, Microsoft Natural, Apple Siri/Samantha)
    const naturalEnglish = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('en') &&
        (v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('neural') ||
          v.name.toLowerCase().includes('online') ||
          v.name.toLowerCase().includes('google') ||
          v.name.toLowerCase().includes('samantha'))
    );
    if (naturalEnglish) return naturalEnglish;

    return voices.find((v) => v.lang.toLowerCase().startsWith('en')) || voices[0] || null;
  };

  // Immediate Interruption Handler: Stop the agent from speaking instantly
  const stopAgentSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAgentSpeaking(false);
  };

  // Speech Synthesis Helper with Natural Human Tone & Cadence
  const speakText = (text: string) => {
    if (!isSpeakerOn || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const humanized = humanizeSpeechText(text);
    if (!humanized) return;

    const utterance = new SpeechSynthesisUtterance(humanized);
    // Relaxed, natural conversational pacing and grounded human pitch
    utterance.rate = 0.93;
    utterance.pitch = 1.0;

    const voice = getHumanLikeVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsAgentSpeaking(true);
    utterance.onend = () => setIsAgentSpeaking(false);
    utterance.onerror = () => setIsAgentSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Speech Recognition (Microphone STT) Helper
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const reco = new SpeechRecognitionClass();
        reco.continuous = false;
        reco.interimResults = false;
        reco.lang = 'en-IN';

        reco.onresult = (event: any) => {
          const spoken = event.results[0]?.[0]?.transcript;
          if (spoken && spoken.trim()) {
            handleSendTurn(spoken.trim());
          }
          setIsUserListening(false);
        };

        reco.onerror = () => {
          setIsUserListening(false);
        };

        reco.onend = () => {
          setIsUserListening(false);
        };

        recognitionRef.current = reco;
      }
    }
  }, []);

  const toggleMicListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not available in this browser. You can type in the response bar below.');
      return;
    }

    if (isUserListening) {
      recognitionRef.current.stop();
      setIsUserListening(false);
    } else {
      try {
        window.speechSynthesis.cancel();
        setIsAgentSpeaking(false);
        recognitionRef.current.start();
        setIsUserListening(true);
      } catch (err) {
        console.warn('Mic start failed:', err);
      }
    }
  };

  // Start Call Handler
  const handleStartCall = async () => {
    setCallStatus('dialing');
    setCallDuration(0);
    setSyncNotice(null);
    sfx.playRing();

    setTimeout(() => {
      setCallStatus('ringing');
    }, 1200);

    // Call /api/calling-agent/start
    try {
      const resp = await fetch('/api/calling-agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialName: currentProfile.name !== 'New Statistical Officer (Pending Intake)' ? currentProfile.name : '',
          currentDesignation: currentProfile.designation || '',
        }),
      });

      const data = await resp.json();
      setTimeout(() => {
        sfx.stopRing();
        sfx.playConnectChime();
        setCallStatus('active');

        const openingText =
          data.agentSpokenReply ||
          (currentProfile.name && currentProfile.name !== 'New Statistical Officer (Pending Intake)'
            ? `Hi ${currentProfile.name}! This is Aditi from the Karmayogi team. Thanks so much for picking up! I just wanted to do a quick 2-minute check-in instead of handing you a long form. How is your day going so far?`
            : `Hello there! This is Aditi from the Karmayogi team. Thanks so much for picking up! I just wanted to do a quick 2-minute check-in instead of having you fill out paperwork. How are things with you today?`);

        setMessages([
          {
            role: 'agent',
            content: openingText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        if (data.extractedDossier) {
          setExtractedDossier((prev) => ({ ...prev, ...data.extractedDossier }));
        }
        if (data.completionPercentage) {
          setCompletionPercentage(data.completionPercentage);
        }

        speakText(openingText);
      }, 2600);
    } catch {
      sfx.stopRing();
      sfx.playConnectChime();
      setCallStatus('active');
    }
  };

  // End Call Handler
  const handleEndCall = () => {
    sfx.stopRing();
    sfx.playDisconnectChime();
    stopAgentSpeaking();
    if (recognitionRef.current && isUserListening) recognitionRef.current.stop();

    setIsAgentSpeaking(false);
    setIsUserListening(false);
    setCallStatus('ended');
  };

  // Send turn (Spoken or Typed)
  const handleSendTurn = async (textToSend: string) => {
    if (!textToSend.trim() || isProcessingTurn) return;

    // Immediately stop ongoing speech when user responds
    stopAgentSpeaking();

    const userText = textToSend.trim();
    setUserInputText('');

    const newMsgs = [
      ...messages,
      {
        role: 'user' as const,
        content: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(newMsgs);
    setIsProcessingTurn(true);

    try {
      const resp = await fetch('/api/calling-agent/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          userMessage: userText,
          currentDossier: extractedDossier,
        }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const reply = data.agentSpokenReply || 'Got it, thank you for sharing that with me.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      if (data.extractedDossier) {
        setExtractedDossier((prev) => ({
          ...prev,
          ...data.extractedDossier,
        }));
      }

      if (data.completionPercentage) {
        setCompletionPercentage(data.completionPercentage);
      }

      if (data.nextTopicSuggestion) {
        setNextTopicSuggestion(data.nextTopicSuggestion);
      }

      if (data.agentEmotion) {
        setAgentEmotion(data.agentEmotion);
      }

      speakText(reply);
    } catch (err) {
      console.warn('Turn error:', err);
      const fallbackReply = `Got it, that makes total sense! What data tools or software do you and your team work with day-to-day?`;
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: fallbackReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      speakText(fallbackReply);
    } finally {
      setIsProcessingTurn(false);
    }
  };

  // Sync to Active Profile
  const handleAttestAndSync = () => {
    const updated: OfficialProfile = {
      ...currentProfile,
      name: extractedDossier.name?.trim() || currentProfile.name,
      designation: extractedDossier.designation || currentProfile.designation,
      department: extractedDossier.department || currentProfile.department,
      serviceCadre: (extractedDossier.serviceCadre as ServiceCadre) || currentProfile.serviceCadre,
      group: (extractedDossier.group as ServiceGroup) || currentProfile.group,
      educationalQualification: extractedDossier.educationalQualification || currentProfile.educationalQualification,
      specialization: extractedDossier.specialization || currentProfile.specialization,
      yearsOfExperience: extractedDossier.yearsOfExperience || currentProfile.yearsOfExperience,
      yearsInCurrentAssignment: extractedDossier.yearsInCurrentAssignment || currentProfile.yearsInCurrentAssignment || 3,
      intakeFormCompleted: true,
      onboardingCompleted: true,
      lastEvaluatedAt: new Date().toISOString(),
    };

    // Recalculate 5-parameter gap analysis
    updated.gapAnalysis = computeFramework5Analysis(updated);
    updated.parameterScores = updated.gapAnalysis.parameters;

    saveOfficialProfile(updated);
    onProfileUpdated(updated);

    setSyncNotice(`Official Profile for ${updated.name} attested! Competencies evaluated — loading Top Recommended Courses & Dismantled Gaps...`);
    setTimeout(() => {
      if (onNavigateToTab) onNavigateToTab('gapAnalysis');
    }, 1200);
  };

  // Quick realistic simulated replies for testing
  const sampleOfficerReplies = [
    {
      label: '1. Role & Wing',
      text: "I'm Dr. Sunita Rao from the Survey Design division (SDRD). Been with the ISS for about 11 years now.",
    },
    {
      label: '2. Tools & Tech',
      text: 'We mostly work with R, Stata, and CSPro for our survey data cleaning and verification.',
    },
    {
      label: '3. Current Project',
      text: "Right now we're leading the 80th NSSO survey round and sampling design.",
    },
    {
      label: '4. Education & Learning',
      text: "I have a Master's in Statistics, and I'd love to learn more Python automation on Karmayogi.",
    },
    {
      label: '5. Stop / Pause',
      text: 'Can you stop speaking for a moment?',
    },
  ];

  // Helper formatting for duration timer
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold text-slate-700 uppercase tracking-widest mb-1 font-mono">
              <PhoneCall className="w-3.5 h-3.5 text-black" />
              <span>MoSPI Civil Service Voice Profiling Suite</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              AI Calling Agent: Humanized Voice Intake
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed font-sans">
              Have a natural, comfortable telephone conversation with our Senior Liaison Officer. Speak freely about your division, field pressures, analytical software, and aspirations—the agent understands you deeply and automatically compiles your official profile dossier.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-800 bg-slate-100 px-3.5 py-2 rounded-xs border border-slate-300 font-mono shrink-0">
            <Shield className="w-4 h-4 text-black" />
            <span>Capacity Building Commission (CBC) Verified Voice Line</span>
          </div>
        </div>
      </div>

      {/* Sync Success Notification */}
      {syncNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xs text-emerald-950 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center space-x-3 text-xs font-mono">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="font-bold">{syncNotice}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-800">Redirecting to 5-Parameter Gap Analysis...</span>
        </div>
      )}

      {/* Main Grid: Left = Interactive Phone Call Screen, Right = Live Dossier Extractor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: VIRTUAL CALLING TERMINAL (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xs shadow-xs overflow-hidden flex flex-col h-[750px]">
          {/* Virtual Phone Header Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xs bg-black text-white flex items-center justify-center font-serif font-bold text-sm shadow-xs relative">
                A
                {callStatus === 'active' && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-serif text-sm font-bold text-slate-900">
                    Aditi (CBC Senior Liaison Mentor)
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-mono font-bold bg-slate-200 text-slate-800">
                    MoSPI Desk
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2">
                  <span>
                    {callStatus === 'idle' && 'Line Ready • Secure WebRTC Channel'}
                    {callStatus === 'dialing' && 'Dialing secure liaison line...'}
                    {callStatus === 'ringing' && 'Ringing... Please hold'}
                    {callStatus === 'active' && `Call in progress • ${formatDuration(callDuration)}`}
                    {callStatus === 'ended' && `Call completed • Duration ${formatDuration(callDuration)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Toggle, Stop Speaking & Call End Controls */}
            <div className="flex items-center space-x-2">
              {callStatus === 'active' && isAgentSpeaking && (
                <button
                  type="button"
                  onClick={stopAgentSpeaking}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs animate-pulse"
                  title="Stop Aditi from speaking immediately"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Interrupt</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isSpeakerOn) {
                    stopAgentSpeaking();
                  }
                  setIsSpeakerOn(!isSpeakerOn);
                }}
                className={`p-2 rounded-xs border transition-colors cursor-pointer ${
                  isSpeakerOn
                    ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                    : 'bg-rose-50 border-rose-300 text-rose-700'
                }`}
                title={isSpeakerOn ? 'Mute Agent Voice (TTS)' : 'Unmute Agent Voice (TTS)'}
              >
                {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {callStatus === 'active' && (
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xs text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              )}
            </div>
          </div>

          {/* Call Stage Area */}
          {callStatus === 'idle' ? (
            /* IDLE SCREEN: Invitation to Call */
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-xs bg-black text-white flex items-center justify-center mx-auto shadow-md">
                  <PhoneCall className="w-9 h-9 text-white animate-bounce" />
                </div>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-xs bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase">
                  Available
                </div>
              </div>

              <div className="max-w-md space-y-2">
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  Ready to connect with Aditi?
                </h3>
                <p className="text-xs text-slate-600 font-sans leading-relaxed">
                  Avoid navigating multi-step forms. A 3-to-5 minute conversational call will capture your complete background, tools, current project, and skill aspirations.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xs text-left max-w-sm w-full space-y-2 text-xs font-mono shadow-2xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">What we cover:</div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  <span>Cadre, Wing &amp; Current Posting</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  <span>Analytical Software (R, Python, STATA, SQL)</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  <span>Key Project Mandate &amp; Operational Gaps</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartCall}
                className="px-8 py-3.5 bg-black hover:bg-slate-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xs flex items-center space-x-2.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
              >
                <Phone className="w-4 h-4 text-white" />
                <span>Start Voice Call Interview</span>
              </button>
            </div>
          ) : callStatus === 'dialing' || callStatus === 'ringing' ? (
            /* RINGING SCREEN */
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-slate-50/70 space-y-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-xs bg-black text-white flex items-center justify-center mx-auto shadow-lg animate-pulse">
                  <PhoneCall className="w-10 h-10 text-white" />
                </div>
                <span className="absolute inset-0 rounded-xs border-2 border-black animate-ping opacity-25" />
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="text-sm font-bold text-slate-900">
                  {callStatus === 'dialing' ? 'Dialing CBC Liaison Desk...' : 'Ringing Aditi...'}
                </div>
                <p className="text-xs text-slate-500">Establishing encrypted voice session</p>
              </div>

              <button
                type="button"
                onClick={handleEndCall}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-mono font-bold rounded-xs transition-colors cursor-pointer"
              >
                Cancel Call
              </button>
            </div>
          ) : (
            /* ACTIVE & ENDED CONVERSATION SCREEN */
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
              {/* Audio Waveform & Status Banner */}
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 h-5">
                    {/* Dynamic Voice Bars */}
                    {[40, 75, 100, 60, 90, 45, 80, 50].map((height, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isAgentSpeaking
                            ? 'bg-black animate-pulse'
                            : isUserListening
                            ? 'bg-emerald-600 animate-pulse'
                            : 'bg-slate-300'
                        }`}
                        style={{
                          height: isAgentSpeaking || isUserListening ? `${Math.max(20, height * (Math.random() * 0.7 + 0.4))}%` : '25%',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-600">
                    {isAgentSpeaking && (
                      <div className="flex items-center space-x-2">
                        <span className="text-black font-bold">Aditi is speaking...</span>
                        <button
                          type="button"
                          onClick={stopAgentSpeaking}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                          title="Stop speaking right now"
                        >
                          <Square className="w-2.5 h-2.5 fill-current" />
                          <span>Stop Speaking</span>
                        </button>
                      </div>
                    )}
                    {isUserListening && <span className="text-emerald-700 font-bold">Listening to you via microphone...</span>}
                    {!isAgentSpeaking && !isUserListening && isProcessingTurn && (
                      <span className="text-slate-500">Aditi is synthesizing response...</span>
                    )}
                    {!isAgentSpeaking && !isUserListening && !isProcessingTurn && (
                      <span className="text-slate-500">Call connected • Tap mic or type below</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-2">
                  <span>Topic:</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-xs border border-slate-200">
                    {nextTopicSuggestion}
                  </span>
                </div>
              </div>

              {/* Live Transcript Flow */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, idx) => {
                  const isAgent = msg.role === 'agent';
                  return (
                    <div
                      key={idx}
                      className={`flex items-start space-x-3 ${!isAgent ? 'flex-row-reverse space-x-reverse' : ''}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xs flex items-center justify-center shrink-0 text-xs shadow-xs font-serif ${
                          isAgent ? 'bg-black text-white' : 'bg-slate-800 text-white'
                        }`}
                      >
                        {isAgent ? 'A' : <User className="w-3.5 h-3.5" />}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-xs p-3.5 text-xs shadow-xs space-y-1 leading-relaxed ${
                          isAgent
                            ? 'bg-white border border-slate-200 text-slate-800'
                            : 'bg-black text-white'
                        }`}
                      >
                        <div className={`text-[10px] font-mono flex items-center justify-between ${isAgent ? 'text-slate-400' : 'text-slate-300'}`}>
                          <span className="font-bold">{isAgent ? 'Aditi (Karmayogi Liaison)' : (extractedDossier.name || 'Officer')}</span>
                          <div className="flex items-center space-x-2">
                            <span>{msg.time}</span>
                            {isAgent && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isAgentSpeaking) {
                                    stopAgentSpeaking();
                                  } else {
                                    speakText(msg.content);
                                  }
                                }}
                                className="text-[10px] text-slate-500 hover:text-black flex items-center space-x-0.5 cursor-pointer ml-1 transition-colors"
                                title={isAgentSpeaking ? 'Stop speaking' : 'Listen again'}
                              >
                                {isAgentSpeaking ? <VolumeX className="w-3 h-3 text-rose-600" /> : <Volume2 className="w-3 h-3" />}
                                <span>{isAgentSpeaking ? 'Stop' : 'Play'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="font-sans whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}

                {isProcessingTurn && (
                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-xs bg-black text-white flex items-center justify-center shrink-0 text-xs font-serif">
                      A
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xs p-3 text-xs text-slate-500 font-mono shadow-xs flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                      <span>Aditi is reflecting on your input and updating dossier...</span>
                    </div>
                  </div>
                )}

                <div ref={transcriptBottomRef} />
              </div>

              {/* Quick Spoken Reply Chips for Rapid Interactive Exploration */}
              {callStatus === 'active' && (
                <div className="p-2.5 bg-slate-100/80 border-t border-slate-200 shrink-0 overflow-x-auto flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pl-1">
                    Simulate Voice Response:
                  </span>
                  {sampleOfficerReplies.map((reply, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isProcessingTurn}
                      onClick={() => handleSendTurn(reply.text)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-200 disabled:opacity-50 border border-slate-300 rounded-xs text-[11px] font-sans text-slate-700 whitespace-nowrap transition-colors cursor-pointer shadow-xs shrink-0"
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Interactive Mic & Text Controller */}
              <div className="p-3 border-t border-slate-200 bg-white shrink-0">
                {callStatus === 'active' ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendTurn(userInputText);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <button
                      type="button"
                      onClick={toggleMicListening}
                      className={`p-2.5 rounded-xs transition-all cursor-pointer shrink-0 shadow-xs ${
                        isUserListening
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      }`}
                      title={isUserListening ? 'Stop Listening' : 'Speak into Microphone'}
                    >
                      {isUserListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <input
                      type="text"
                      value={userInputText}
                      onChange={(e) => {
                        if (isAgentSpeaking) stopAgentSpeaking();
                        setUserInputText(e.target.value);
                      }}
                      onFocus={() => {
                        if (isAgentSpeaking) stopAgentSpeaking();
                      }}
                      onKeyDown={(e) => {
                        if (isAgentSpeaking && e.key !== 'Enter') {
                          stopAgentSpeaking();
                        }
                      }}
                      disabled={isProcessingTurn}
                      placeholder={
                        isUserListening
                          ? 'Listening to your speech...'
                          : isAgentSpeaking
                          ? 'Type here or click "Stop Speaking" to interrupt...'
                          : 'Type or speak your answer naturally to Aditi...'
                      }
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xs text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-sans"
                    />

                    <button
                      type="submit"
                      disabled={!userInputText.trim() || isProcessingTurn}
                      className="px-4 py-2.5 bg-black hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xs text-xs font-mono font-bold uppercase transition-colors cursor-pointer shadow-xs shrink-0 flex items-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                ) : (
                  /* Ended Call Summary CTA */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
                    <div className="text-xs text-slate-600 font-mono">
                      Call completed. Ready to attest this extracted dossier?
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleStartCall}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono rounded-xs border border-slate-300 cursor-pointer"
                      >
                        Call Again
                      </button>
                      <button
                        type="button"
                        onClick={handleAttestAndSync}
                        className="px-4 py-1.5 bg-black hover:bg-slate-800 text-white text-xs font-mono font-bold rounded-xs cursor-pointer shadow-xs flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Attest &amp; Sync Profile</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE DOSSIER & PROFILE EXTRACTION ENGINE (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xs shadow-xs p-6 flex flex-col h-[750px] overflow-y-auto space-y-5">
          {/* Header & Completeness Gauge */}
          <div className="pb-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Real-Time Intelligent Extraction
                </span>
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Extracted Official Dossier
                </h3>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-900">
                  {completionPercentage}% Complete
                </span>
                <span className="block text-[9px] font-mono text-slate-400">Intake Progress</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-xs overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  completionPercentage >= 75
                    ? 'bg-emerald-600'
                    : completionPercentage >= 40
                    ? 'bg-black'
                    : 'bg-amber-600'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Section 1: Official Identity & Cadre */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono font-bold text-slate-600 uppercase flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-black" />
                <span>Identity &amp; Cadre</span>
              </div>
              {extractedDossier.name ? (
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-xs text-[9px] font-mono font-bold">
                  Captured
                </span>
              ) : (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-xs text-[9px] font-mono">
                  Pending
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-serif font-bold text-slate-900">
                  {extractedDossier.name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cadre &amp; Group:</span>
                <span className="font-mono text-slate-800">
                  {extractedDossier.serviceCadre || 'Indian Statistical Service'} ({extractedDossier.group || 'Group A'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Designation:</span>
                <span className="font-medium text-slate-800">
                  {extractedDossier.designation || 'Statistical Officer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Division / Wing:</span>
                <span className="font-medium text-slate-800">
                  {extractedDossier.department || 'National Accounts / NSSO'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Service:</span>
                <span className="font-mono text-slate-800">
                  {extractedDossier.yearsOfExperience ? `${extractedDossier.yearsOfExperience} Years` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Education & Specialization */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono font-bold text-slate-600 uppercase flex items-center space-x-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-black" />
                <span>Education &amp; Specialization</span>
              </div>
              {extractedDossier.educationalQualification ? (
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-xs text-[9px] font-mono font-bold">
                  Captured
                </span>
              ) : (
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded-xs text-[9px] font-mono">
                  Pending
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Degree:</span>
                <span className="font-medium text-slate-800">
                  {extractedDossier.educationalQualification || 'M.Sc. Statistics / Mathematical Sciences'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Specialization:</span>
                <span className="font-medium text-slate-800">
                  {extractedDossier.specialization || 'Survey Design, Macroeconomic Aggregates'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Analytical Software & Tools */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono font-bold text-slate-600 uppercase flex items-center space-x-1.5">
                <Wrench className="w-3.5 h-3.5 text-black" />
                <span>Detected Software &amp; Analytical Tools</span>
              </div>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-xs text-[9px] font-mono">
                {extractedDossier.toolsUsed?.length || 0} Tools
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {extractedDossier.toolsUsed && extractedDossier.toolsUsed.length > 0 ? (
                extractedDossier.toolsUsed.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-semibold bg-white text-slate-800 border border-slate-300 shadow-2xs"
                  >
                    {tool}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Mention Python, R, STATA, SQL, or Excel to Aditi...</span>
              )}
            </div>
          </div>

          {/* Section 4: Current Mandate & Priority Project */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono font-bold text-slate-600 uppercase flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-black" />
                <span>Assigned Project Mandate</span>
              </div>
              {extractedDossier.assignedProjectTitle ? (
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-xs text-[9px] font-mono font-bold">
                  Identified
                </span>
              ) : (
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded-xs text-[9px] font-mono">
                  Listening
                </span>
              )}
            </div>

            <div className="text-xs font-serif font-bold text-slate-900 leading-snug">
              {extractedDossier.assignedProjectTitle || 'Execution of Core Statistical Systems / Base Year Review'}
            </div>
            {extractedDossier.assignedProjectGoals && (
              <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                {extractedDossier.assignedProjectGoals}
              </p>
            )}
          </div>

          {/* Section 5: Humanized Synthesis (Understood Concerns & Motivation) */}
          {extractedDossier.personalStrengthsAndConcerns && (
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-xs text-xs space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-600 uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>Aditi's Synthesis of Officer Reality:</span>
              </div>
              <p className="text-slate-700 italic font-sans leading-relaxed">
                "{extractedDossier.personalStrengthsAndConcerns}"
              </p>
            </div>
          )}

          {/* Attest & Synchronize Button */}
          <div className="pt-2 mt-auto border-t border-slate-200 space-y-2">
            <button
              type="button"
              onClick={handleAttestAndSync}
              className="w-full py-2.5 bg-black hover:bg-slate-800 text-white rounded-xs text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
            >
              <FileCheck2 className="w-4 h-4 text-white" />
              <span>Attest &amp; Sync Dossier to Profile</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center font-mono">
              Instantly updates the official 5-Parameter Radar Chart &amp; iGOT Course Recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

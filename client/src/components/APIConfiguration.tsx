import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Configuration, Voice, ElevenLabsModel } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VoiceSelector from "./VoiceSelector";

export default function APIConfiguration() {
  const { toast } = useToast();
  const [showTokens, setShowTokens] = useState({
    twilioAccountSid: false,
    openaiApiKey: false,
    elevenLabsApiKey: false
  });
  
  const [config, setConfig] = useState<Configuration>({
    serverPort: "3000",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    twilioWelcomeMessage: "Hello, how can I help you today?",
    openaiApiKey: "",
    openaiModel: "gpt-4o",
    temperature: 0.7,
    contextWindow: 10,
    systemPrompt: "You are a helpful AI assistant on a phone call. Keep your responses concise and conversational. The person is speaking to you over the phone.",
    maxTokens: 150,
    elevenLabsApiKey: "",
    elevenLabsVoiceId: "",
    stability: 0.5,
    similarity: 0.75,
    style: 0,
    speakerBoost: true,
    modelId: "eleven_monolingual_v1",
    optimize_streaming_latency: 0,
    output_format: "mp3_44100_128",
    voice_clarity: 0.75,
    voice_expressiveness: 0.75,
    voice_naturalness: 0.75,
    voice_speed: 1.0,
    voice_pitch: 0
  });

  const { data: voices = [] } = useQuery<Voice[]>({
    queryKey: ["/api/elevenlabs/voices"],
  });
  
  const { data: models = [] } = useQuery<ElevenLabsModel[]>({
    queryKey: ["/api/elevenlabs/models"],
  });

  const { data: savedConfig, isLoading } = useQuery<Configuration>({
    queryKey: ["/api/config"],
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig((prev) => ({...prev, ...savedConfig}));
    }
  }, [savedConfig]);

  const handleToggleVisibility = (field: keyof typeof showTokens) => {
    setShowTokens(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  const handleSaveConfig = async () => {
    try {
      await apiRequest("POST", "/api/config", config);
      toast({
        title: "Configuration Saved",
        description: "Your API configuration has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const playVoiceSample = async (voiceId: string) => {
    try {
      if (!config.elevenLabsApiKey) {
        toast({
          title: "API Key Required",
          description: "Please enter your ElevenLabs API key first.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Loading Voice Sample",
        description: "Please wait while we generate a sample...",
      });
      
      // This would be better implemented in the backend, but for demo purposes:
      const sampleText = "This is an example of how my voice sounds. I hope you like it!";
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenLabsApiKey
        },
        body: JSON.stringify({
          text: sampleText,
          model_id: config.modelId || "eleven_monolingual_v1",
          voice_settings: {
            stability: config.stability || 0.5,
            similarity_boost: config.similarity || 0.75,
            style: config.style || 0,
            use_speaker_boost: config.speakerBoost || false,
            clarity: config.voice_clarity || 0.75,
            expressiveness: config.voice_expressiveness || 0.75,
            naturalness: config.voice_naturalness || 0.75,
            pitch_shift: config.voice_pitch || 0,
            speed: config.voice_speed || 1.0
          }
        })
      });
      
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }
      
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      
    } catch (error) {
      console.error('Error playing voice sample:', error);
      toast({
        title: "Error",
        description: "Failed to play voice sample. Please check your API key and try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <section className="bg-[#1A2736] rounded-lg shadow-lg p-5">
      <h2 className="text-lg font-medium text-white border-b border-gray-700 pb-3 mb-4 flex items-center">
        <span className="material-icons mr-2 text-[#3392C8]">settings</span>
        Configuration
      </h2>
      
      {isLoading ? (
        <div className="text-center py-4">Loading configuration...</div>
      ) : (
        <div>
          <Tabs defaultValue="api-keys" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="twilio">Twilio</TabsTrigger>
              <TabsTrigger value="openai">OpenAI</TabsTrigger>
              <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
            </TabsList>
            
            {/* API Keys Tab */}
            <TabsContent value="api-keys" className="space-y-4">
              <div>
                <h3 className="text-[#33C3BD] text-sm mb-3">Server Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Server Port</label>
                    <div className="flex">
                      <input 
                        type="text" 
                        name="serverPort"
                        value={config.serverPort} 
                        onChange={handleInputChange}
                        className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-[#33C3BD] text-sm mb-3">API Credentials</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Twilio Account SID</label>
                    <div className="flex">
                      <input 
                        type={showTokens.twilioAccountSid ? "text" : "password"} 
                        name="twilioAccountSid"
                        value={config.twilioAccountSid} 
                        onChange={handleInputChange}
                        className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                      />
                      <button 
                        className="ml-2 bg-[#121E2F] border border-gray-700 px-2 rounded-md"
                        onClick={() => handleToggleVisibility('twilioAccountSid')}
                      >
                        <span className="material-icons text-sm">
                          {showTokens.twilioAccountSid ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">OpenAI API Key</label>
                    <div className="flex">
                      <input 
                        type={showTokens.openaiApiKey ? "text" : "password"} 
                        name="openaiApiKey"
                        value={config.openaiApiKey} 
                        onChange={handleInputChange}
                        className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                      />
                      <button 
                        className="ml-2 bg-[#121E2F] border border-gray-700 px-2 rounded-md"
                        onClick={() => handleToggleVisibility('openaiApiKey')}
                      >
                        <span className="material-icons text-sm">
                          {showTokens.openaiApiKey ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ElevenLabs API Key</label>
                    <div className="flex">
                      <input 
                        type={showTokens.elevenLabsApiKey ? "text" : "password"} 
                        name="elevenLabsApiKey"
                        value={config.elevenLabsApiKey} 
                        onChange={handleInputChange}
                        className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                      />
                      <button 
                        className="ml-2 bg-[#121E2F] border border-gray-700 px-2 rounded-md"
                        onClick={() => handleToggleVisibility('elevenLabsApiKey')}
                      >
                        <span className="material-icons text-sm">
                          {showTokens.elevenLabsApiKey ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Twilio Tab */}
            <TabsContent value="twilio" className="space-y-4">
              <div>
                <h3 className="text-[#33C3BD] text-sm mb-3">Twilio Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Auth Token</label>
                    <input 
                      type="password" 
                      name="twilioAuthToken"
                      value={config.twilioAuthToken} 
                      onChange={handleInputChange}
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      name="twilioPhoneNumber"
                      value={config.twilioPhoneNumber} 
                      onChange={handleInputChange}
                      placeholder="+15551234567"
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Welcome Message</label>
                    <textarea 
                      name="twilioWelcomeMessage"
                      value={config.twilioWelcomeMessage} 
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* OpenAI Tab */}
            <TabsContent value="openai" className="space-y-4">
              <div>
                <h3 className="text-[#33C3BD] text-sm mb-3">OpenAI Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">OpenAI Model</label>
                    <select 
                      name="openaiModel"
                      value={config.openaiModel}
                      onChange={handleInputChange}
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="gpt-4o">gpt-4o</option>
                      <option value="gpt-4-turbo">gpt-4-turbo</option>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Temperature</label>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="range" 
                        name="temperature"
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={config.temperature} 
                        onChange={handleSliderChange}
                        className="w-full" 
                      />
                      <span className="text-sm">{config.temperature}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Context Window (messages)</label>
                    <input 
                      type="number" 
                      name="contextWindow"
                      value={config.contextWindow} 
                      onChange={handleInputChange}
                      min="1" 
                      max="20" 
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Tokens</label>
                    <input 
                      type="number" 
                      name="maxTokens"
                      value={config.maxTokens} 
                      onChange={handleInputChange}
                      min="10" 
                      max="1000" 
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum number of tokens to generate in response. Lower values are more efficient.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">System Prompt</label>
                    <textarea 
                      name="systemPrompt"
                      value={config.systemPrompt} 
                      onChange={handleInputChange}
                      rows={5}
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Instructions for the AI to define its behavior in conversations.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* ElevenLabs Tab */}
            <TabsContent value="elevenlabs" className="space-y-4">
              <div>
                <h3 className="text-[#33C3BD] text-sm mb-3">Voice Selection</h3>
                <div className="space-y-3">
                  {config.elevenLabsApiKey ? (
                    <>
                      <div className="bg-[#0F172A] p-3 rounded-md">
                        <label className="block text-xs text-gray-400 mb-1">Voice Selection Method</label>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center justify-between border border-gray-700 rounded-md p-2">
                            <label className="block text-xs text-gray-300 mb-1 font-medium">Choose a Voice</label>
                            <select 
                              name="elevenLabsVoiceId"
                              value={config.elevenLabsVoiceId}
                              onChange={handleInputChange}
                              className="w-3/4 bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm"
                            >
                              {!voices || voices.length === 0 ? (
                                <option value="">Loading voices...</option>
                              ) : (
                                voices.map((voice: Voice) => (
                                  <option key={voice.id} value={voice.id}>
                                    {voice.name} ({voice.description})
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Voice Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <VoiceSelector
                          voices={voices}
                          selectedVoiceId={config.elevenLabsVoiceId}
                          apiKey={config.elevenLabsApiKey}
                          modelId={config.modelId || "eleven_monolingual_v1"}
                          voiceSettings={{
                            stability: config.stability || 0.5,
                            similarity: config.similarity || 0.75,
                            style: config.style || 0,
                            speakerBoost: config.speakerBoost || false
                          }}
                          onSelect={(voiceId) => setConfig(prev => ({...prev, elevenLabsVoiceId: voiceId}))}
                          title="Professional Voices"
                          filter={(v) => v.description?.includes('Professional') || 
                                        v.description?.includes('News') || 
                                        v.description?.includes('Narrator')}
                        />

                        <VoiceSelector
                          voices={voices}
                          selectedVoiceId={config.elevenLabsVoiceId}
                          apiKey={config.elevenLabsApiKey}
                          modelId={config.modelId || "eleven_monolingual_v1"}
                          voiceSettings={{
                            stability: config.stability || 0.5,
                            similarity: config.similarity || 0.75,
                            style: config.style || 0,
                            speakerBoost: config.speakerBoost || false
                          }}
                          onSelect={(voiceId) => setConfig(prev => ({...prev, elevenLabsVoiceId: voiceId}))}
                          title="Conversational Voices"
                          filter={(v) => !v.description?.includes('Professional') && 
                                       !v.description?.includes('News') && 
                                       !v.description?.includes('Narrator')}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="bg-[#0F172A] p-3 rounded-md">
                      <p className="text-sm text-amber-400">Please enter your ElevenLabs API key to load voices</p>
                      <p className="text-xs text-gray-400 mt-1">You'll need an API key to access voice options.</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Model</label>
                    <select 
                      name="modelId"
                      value={config.modelId}
                      onChange={handleInputChange}
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm"
                    >
                      {!models || models.length === 0 ? (
                        <option value="">Loading models...</option>
                      ) : (
                        models.map((model: ElevenLabsModel) => (
                          <option key={model.model_id} value={model.model_id}>
                            {model.name}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Different models offer various quality levels and features</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-[#33C3BD] text-sm mb-3">Basic Voice Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Stability: {config.stability}</label>
                    <input 
                      type="range" 
                      name="stability"
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={config.stability} 
                      onChange={handleSliderChange}
                      className="w-full" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher values make voice more consistent but less expressive.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Similarity: {config.similarity}</label>
                    <input 
                      type="range" 
                      name="similarity"
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={config.similarity} 
                      onChange={handleSliderChange}
                      className="w-full" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher values make voice more similar to the original.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Style: {config.style}</label>
                    <input 
                      type="range" 
                      name="style"
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={config.style} 
                      onChange={handleSliderChange}
                      className="w-full" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher values increase stylization, adding emphasis and personality.</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="speakerBoost"
                      name="speakerBoost"
                      checked={config.speakerBoost}
                      onChange={(e) => setConfig(prev => ({ ...prev, speakerBoost: e.target.checked }))}
                      className="rounded bg-[#121E2F] border-gray-700"
                    />
                    <label htmlFor="speakerBoost" className="text-xs text-gray-400">Enable Speaker Boost</label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Reduces background noise and enhances voice clarity.</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-[#33C3BD] text-sm mb-3">Advanced Voice Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Clarity: {config.voice_clarity || 0.75}</label>
                    <input 
                      type="range" 
                      name="voice_clarity"
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={config.voice_clarity || 0.75} 
                      onChange={handleSliderChange}
                      className="w-full" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher values improve voice articulation and pronunciation clarity.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Expressiveness: {config.voice_expressiveness || 0.75}</label>
                    <input 
                      type="range" 
                      name="voice_expressiveness"
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={config.voice_expressiveness || 0.75} 
                      onChange={handleSliderChange}
                      className="w-full" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher values add more emotional range and expression to the voice.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Naturalness: {config.voice_naturalness || 0.75}</label>
                    <input 
                      type="range" 
                      name="voice_naturalness"
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={config.voice_naturalness || 0.75} 
                      onChange={handleSliderChange}
                      className="w-full" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher values create a more natural and human-like speaking style.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Speed: {config.voice_speed || 1.0}</label>
                    <input 
                      type="range" 
                      name="voice_speed"
                      min="0.5" 
                      max="2.0" 
                      step="0.05" 
                      value={config.voice_speed || 1.0} 
                      onChange={handleSliderChange}
                      className="w-full" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Adjusts the speaking rate (0.5 = slower, 1.0 = normal, 2.0 = faster).</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Pitch Shift: {config.voice_pitch || 0}</label>
                    <input 
                      type="range" 
                      name="voice_pitch"
                      min="-1" 
                      max="1" 
                      step="0.05" 
                      value={config.voice_pitch || 0} 
                      onChange={handleSliderChange}
                      className="w-full" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Adjusts the voice pitch (-1 = lower, 0 = normal, 1 = higher).</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-[#33C3BD] text-sm mb-3">Technical Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Optimize Streaming Latency</label>
                    <select 
                      name="optimize_streaming_latency"
                      value={config.optimize_streaming_latency || 0}
                      onChange={handleInputChange}
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="0">Level 0 (best quality)</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4 (fastest streaming)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Higher values reduce latency but may affect quality.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Output Format</label>
                    <select 
                      name="output_format"
                      value={config.output_format || "mp3_44100_128"}
                      onChange={handleInputChange}
                      className="w-full bg-[#121E2F] border border-gray-700 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="mp3_44100_128">MP3 (44.1kHz, 128kbps)</option>
                      <option value="mp3_44100_64">MP3 (44.1kHz, 64kbps)</option>
                      <option value="pcm_16000">PCM (16kHz)</option>
                      <option value="pcm_22050">PCM (22.05kHz)</option>
                      <option value="pcm_24000">PCM (24kHz)</option>
                      <option value="ulaw_8000">μ-law (8kHz)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Audio format and quality for voice generation.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="pt-4 mt-4 border-t border-gray-700">
            <button 
              onClick={handleSaveConfig}
              className="w-full bg-gradient-to-r from-[#005F95] to-[#33C3BD] hover:from-[#0077BB] hover:to-[#3DDBD3] text-white py-2 rounded-md transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

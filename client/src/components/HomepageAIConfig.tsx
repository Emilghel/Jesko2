import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Save, Info, Volume2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the form schema
const homepageAIFormSchema = z.object({
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  elevenLabsVoiceId: z.string().min(1, "Please select a voice"),
  openaiModel: z.string().min(1, "Please select an AI model"),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().int().positive().optional(),
  continuousConversation: z.boolean(),
  showTranscript: z.boolean(),
  greetingMessage: z.string().min(5, "Greeting message must be at least 5 characters")
});

type HomepageAIFormValues = z.infer<typeof homepageAIFormSchema>;

// ElevenLabs Voice interface
interface Voice {
  id: string;
  name: string;
  description: string;
  preview_url: string;
}

export default function HomepageAIConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  
  // Default form values
  const defaultValues: HomepageAIFormValues = {
    systemPrompt: "You are a helpful AI assistant on the homepage of Warm Lead Network, a platform that helps businesses engage with leads through AI voice communication. Be friendly, informative, and guide users on how to use the service.",
    elevenLabsVoiceId: "EXAVITQu4vr4xnSDxMaL", // Rachel voice
    openaiModel: "gpt-4o",
    temperature: 0.7,
    maxTokens: 150,
    continuousConversation: true,
    showTranscript: false,
    greetingMessage: "Hello! I'm your AI assistant. How can I help you today?"
  };

  // Fetch config
  const { data: config, isLoading: isLoadingConfig, error: configError } = useQuery({
    queryKey: ['/api/config'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/config');
      return await res.json();
    }
  });

  // Fetch available voices
  const { data: voices, isLoading: isLoadingVoices, error: voicesError } = useQuery({
    queryKey: ['/api/elevenlabs/voices'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/elevenlabs/voices');
      return await res.json();
    }
  });

  // Create form
  const form = useForm<HomepageAIFormValues>({
    resolver: zodResolver(homepageAIFormSchema),
    defaultValues: defaultValues,
  });

  // Update form when config is loaded
  useEffect(() => {
    if (config) {
      form.reset({
        systemPrompt: config.systemPrompt || defaultValues.systemPrompt,
        elevenLabsVoiceId: config.elevenLabsVoiceId || defaultValues.elevenLabsVoiceId,
        openaiModel: config.openaiModel || defaultValues.openaiModel,
        temperature: config.temperature || defaultValues.temperature,
        maxTokens: config.maxTokens || defaultValues.maxTokens,
        continuousConversation: config.continuousConversation !== undefined ? config.continuousConversation : defaultValues.continuousConversation,
        showTranscript: config.showTranscript !== undefined ? config.showTranscript : defaultValues.showTranscript,
        greetingMessage: config.greetingMessage || defaultValues.greetingMessage
      });
    }
  }, [config, form]);

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: HomepageAIFormValues) => {
      const res = await apiRequest('POST', '/api/homepage-ai-config', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      toast({
        title: "Success",
        description: "Homepage AI configuration updated successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update homepage AI configuration: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = async (data: HomepageAIFormValues) => {
    setIsLoading(true);
    try {
      await updateConfigMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Play voice sample
  const playVoiceSample = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
      return;
    }
    
    setPlayingVoiceId(voiceId);
    
    try {
      const audio = new Audio(`/api/elevenlabs/voices/play/${voiceId}`);
      
      audio.onended = () => {
        setPlayingVoiceId(null);
      };
      
      audio.onerror = () => {
        setPlayingVoiceId(null);
        toast({
          title: "Error",
          description: "Failed to play voice sample. Please check your ElevenLabs API key.",
          variant: "destructive",
        });
      };
      
      await audio.play();
    } catch (error) {
      setPlayingVoiceId(null);
      toast({
        title: "Error",
        description: "Failed to play voice sample: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Homepage AI Configuration</h2>
      <p className="text-muted-foreground">
        Configure the AI assistant that appears on your homepage. This assistant will greet visitors and help them understand your service.
      </p>

      {isLoadingConfig || isLoadingVoices ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
        </div>
      ) : configError || voicesError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {(configError as Error)?.message || (voicesError as Error)?.message || "Failed to load configuration"}
          </AlertDescription>
        </Alert>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Personality</CardTitle>
                    <CardDescription>
                      Configure how the AI assistant behaves and responds to visitors
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="systemPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Prompt</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter instructions for the AI assistant..."
                              className="min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="greetingMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Greeting Message</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter the greeting message..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="openaiModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AI Model</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || "gpt-4o"}
                              value={field.value || "gpt-4o"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="gpt-4o">GPT-4o (Newest & Best)</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5-Turbo (Faster)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Temperature: {field.value.toFixed(1)}
                              <span className="text-xs text-muted-foreground ml-2">
                                (0 = predictable, 1 = creative)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Slider
                                min={0}
                                max={1}
                                step={0.1}
                                value={[field.value]}
                                onValueChange={(value) => field.onChange(value[0])}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxTokens"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Tokens</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="150"
                                min={50}
                                max={4000}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Voice Settings</CardTitle>
                  <CardDescription>
                    Select the voice for your AI assistant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="elevenLabsVoiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voice</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || "default"}
                          value={field.value || "default"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!voices || voices.length === 0 ? (
                              <SelectItem value="default">Loading voices...</SelectItem>
                            ) : (
                              voices.map((voice: Voice) => (
                                <SelectItem key={voice.id} value={voice.id}>
                                  {voice.name}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 inline-flex"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      playVoiceSample(voice.id);
                                    }}
                                  >
                                    <Volume2 className={`h-4 w-4 ${playingVoiceId === voice.id ? 'text-cyan-400 animate-pulse' : ''}`} />
                                  </Button>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Interface</CardTitle>
                  <CardDescription>
                    Configure how the homepage AI appears to visitors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="continuousConversation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Continuous Conversation</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Keep the microphone active after the user speaks
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="showTranscript"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Show Transcript</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Display the conversation transcript on the homepage
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <Button type="submit" className="ml-auto" disabled={isLoading}>
              {isLoading ? (
                <div className="h-4 w-4 border-t-2 border-solid rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
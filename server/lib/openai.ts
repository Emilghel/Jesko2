
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { storage } from '../storage';
import { LogLevel } from '@shared/schema';

let openaiInstance: OpenAI | null = null;
let currentApiKey: string | null = null;

// Singleton to manage OpenAI instance with proper API key refresh
function getOpenAIInstance() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Reinitialize if instance doesn't exist or if API key has changed
  if (!openaiInstance || apiKey !== currentApiKey) {
    if (!apiKey) {
      console.error(`[${LogLevel.ERROR}] [OpenAI] No API key found in environment variables`);
      throw new Error('OpenAI API key is missing');
    }
    
    currentApiKey = apiKey;
    
    // Configure OpenAI with project API key
    const isProjectKey = apiKey.startsWith('sk-proj-');
    const options: any = { apiKey };
    
    // For project-based API keys, we need to specify the baseURL
    if (isProjectKey) {
      console.log(`[${LogLevel.INFO}] [OpenAI] Using project-based API key`);
    }
    
    openaiInstance = new OpenAI(options);
    
    console.log(`[${LogLevel.INFO}] [OpenAI] Initialized OpenAI client with new API key from environment`);
  }
  
  return openaiInstance;
}

async function logAndTrackAPI(action: string, startTime: number) {
  const duration = (Date.now() - startTime) / 1000;
  console.log(`[${LogLevel.INFO}] [OpenAI] ${action} completed in ${duration.toFixed(2)}s`);
  await storage.incrementApiMetric('openai', duration);
  return duration;
}

export async function getOpenAIResponse(userMessage: string, context: any[] = []) {
  try {
    console.log(`[${LogLevel.INFO}] [OpenAI] Processing message: ${userMessage}`);
    const startTime = Date.now();
    
    const config = await storage.getConfig();
    const openai = getOpenAIInstance();
    
    const contextWindow = config.contextWindow || 10;
    const limitedContext = context.slice(-contextWindow * 2);
    
    const defaultSystemPrompt = "You are a helpful AI assistant on a phone call. Keep your responses concise and conversational.";
    
    const response = await openai.chat.completions.create({
      model: config.openaiModel || "gpt-4o", // Use latest model by default
      messages: [
        { role: "system", content: config.systemPrompt || defaultSystemPrompt },
        ...limitedContext,
        { role: "user", content: userMessage }
      ],
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || undefined,
    });
    
    await logAndTrackAPI('Chat completion', startTime);
    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('Error getting OpenAI response:', error);
    console.log(`[${LogLevel.ERROR}] [OpenAI] API error: ${error?.message || 'Unknown error'}`);
    throw error;
  }
}

export async function generateAgentResponse(prompt: string, agentConfig: any) {
  try {
    const startTime = Date.now();
    const openai = getOpenAIInstance();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: agentConfig.system_prompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    
    await logAndTrackAPI('Agent response', startTime);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating agent response:', error);
    throw error;
  }
}

export async function processAudioTranscript(transcript: string, context: any[] = []) {
  try {
    const startTime = Date.now();
    const openai = getOpenAIInstance();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: "You are processing voice transcripts. Extract key information and respond naturally." },
        ...context,
        { role: "user", content: transcript }
      ]
    });
    
    await logAndTrackAPI('Audio transcript processing', startTime);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error processing audio transcript:', error);
    throw error;
  }
}

export async function analyzeSupportRequest(request: string) {
  try {
    const startTime = Date.now();
    const openai = getOpenAIInstance();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: "You are a support assistant. Analyze support requests and provide helpful responses." },
        { role: "user", content: request }
      ]
    });
    
    await logAndTrackAPI('Support request analysis', startTime);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing support request:', error);
    throw error;
  }
}

export async function chatWithAssistant(message: string, conversation: {type: 'user' | 'ai', text: string}[] = [], options: any = {}) {
  try {
    const startTime = Date.now();
    const openai = getOpenAIInstance();
    
    // Prepare the messages array in the correct format for OpenAI
    const systemMessage: ChatCompletionMessageParam = { 
      role: "system", 
      content: "You are a helpful assistant for WarmLeadNetwork AI. Keep your responses friendly, informative, and concise. Your purpose is to assist users with any questions about the platform, AI features, voice communication, and customer lead management. Answer queries in a helpful and engaging manner." 
    };
    
    // Convert conversation history to OpenAI format
    const historyMessages: ChatCompletionMessageParam[] = conversation.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    
    const userMessage: ChatCompletionMessageParam = { 
      role: "user", 
      content: message 
    };
    
    // Combine all messages
    const messages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...historyMessages,
      userMessage
    ];
    
    console.log(`[${LogLevel.INFO}] [OpenAI] Processing chat message with context length: ${conversation.length}`);
    
    // Use optimized parameters from options object if provided    
    const response = await openai.chat.completions.create({
      model: options.model || "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages,
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      max_tokens: options.max_tokens || 500
    });
    
    await logAndTrackAPI('Chat message', startTime);
    return response.choices[0].message.content || "I'm not sure how to respond to that.";
  } catch (error: any) {
    console.error('Error processing chat message:', error);
    console.log(`[${LogLevel.ERROR}] [OpenAI] Chat API error: ${error?.message || 'Unknown error'}`);
    throw error;
  }
}

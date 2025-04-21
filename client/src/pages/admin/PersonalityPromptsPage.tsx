import { useState, useEffect } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, Bot, Sparkles } from "lucide-react";

// Define the schema for personality prompt form validation
const personalityPromptSchema = z.object({
  personality_id: z.string().min(1, "Personality ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  prompt_text: z.string().min(1, "Prompt text is required"),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().min(1, "Color is required"),
  is_active: z.boolean().default(true),
  order: z.number().int().default(0),
  voice_id: z.string().optional(),
  model_config: z.record(z.any()).optional(),
});

type PersonalityPromptFormValues = z.infer<typeof personalityPromptSchema>;

// Define the PersonalityPrompt interface
interface PersonalityPrompt {
  id: number;
  personality_id: string;
  name: string;
  description: string;
  prompt_text: string;
  icon: string;
  color: string;
  is_active: boolean;
  order: number;
  voice_id?: string;
  model_config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export default function PersonalityPromptsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PersonalityPrompt | null>(null);
  const [selectedPromptToDelete, setSelectedPromptToDelete] = useState<PersonalityPrompt | null>(null);

  // Query for fetching all personality prompts
  const { data: prompts = [], isLoading } = useQuery<PersonalityPrompt[]>({
    queryKey: ['/api/personality-prompts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/personality-prompts');
      return await res.json();
    },
  });

  // Form setup
  const form = useForm<PersonalityPromptFormValues>({
    resolver: zodResolver(personalityPromptSchema),
    defaultValues: {
      personality_id: '',
      name: '',
      description: '',
      prompt_text: '',
      icon: 'bot',
      color: '#3b82f6',
      is_active: true,
      order: 0,
      voice_id: '',
      model_config: {},
    },
  });

  // Reset form when editingPrompt changes
  useEffect(() => {
    if (editingPrompt) {
      form.reset({
        ...editingPrompt,
        model_config: editingPrompt.model_config || {},
      });
    } else {
      form.reset({
        personality_id: '',
        name: '',
        description: '',
        prompt_text: '',
        icon: 'bot',
        color: '#3b82f6',
        is_active: true,
        order: 0,
        voice_id: '',
        model_config: {},
      });
    }
  }, [editingPrompt, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: PersonalityPromptFormValues) => {
      const res = await apiRequest('POST', '/api/personality-prompts', values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personality-prompts'] });
      toast({
        title: 'Success',
        description: 'Personality prompt created successfully',
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to create personality prompt: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (values: PersonalityPromptFormValues & { id: number }) => {
      const { id, ...data } = values;
      const res = await apiRequest('PUT', `/api/personality-prompts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personality-prompts'] });
      toast({
        title: 'Success',
        description: 'Personality prompt updated successfully',
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update personality prompt: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/personality-prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personality-prompts'] });
      toast({
        title: 'Success',
        description: 'Personality prompt deleted successfully',
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete personality prompt: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = async (values: PersonalityPromptFormValues) => {
    if (editingPrompt) {
      updateMutation.mutate({ ...values, id: editingPrompt.id });
    } else {
      createMutation.mutate(values);
    }
  };

  // Edit handler
  const handleEdit = (prompt: PersonalityPrompt) => {
    setEditingPrompt(prompt);
    setIsDialogOpen(true);
  };

  // Delete confirmation handler
  const confirmDelete = (prompt: PersonalityPrompt) => {
    setSelectedPromptToDelete(prompt);
    setIsDeleteDialogOpen(true);
  };

  // Format JSON for display
  const formatJsonForDisplay = (json: any) => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return "{}";
    }
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Personality Prompts</h1>
          <p className="text-gray-400 mt-1">
            Manage AI personality prompts that can be used by your agents
          </p>
        </div>
        <Button onClick={() => {
          setEditingPrompt(null);
          setIsDialogOpen(true);
        }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Prompt
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-t-4 border-cyan-400 border-solid rounded-full animate-spin"></div>
        </div>
      ) : prompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-16 w-16 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Personality Prompts Yet</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Create your first personality prompt to enhance your AI agents with specific behaviors and expertise.
            </p>
            <Button onClick={() => {
              setEditingPrompt(null);
              setIsDialogOpen(true);
            }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Prompt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell className="font-mono text-xs">{prompt.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
                            style={{ backgroundColor: prompt.color || '#3b82f6' }}
                          >
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{prompt.name}</div>
                            <div className="text-xs text-gray-500">{prompt.personality_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{prompt.description}</TableCell>
                      <TableCell>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          prompt.is_active 
                            ? 'bg-green-900/30 text-green-400' 
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {prompt.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(prompt)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(prompt)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? 'Edit Personality Prompt' : 'Create Personality Prompt'}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt 
                ? 'Update the details for this personality prompt' 
                : 'Configure a new personality prompt for your AI agents'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic">
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">Basic Details</TabsTrigger>
                  <TabsTrigger value="prompt">Prompt Text</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="personality_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Personality ID</FormLabel>
                          <FormControl>
                            <Input placeholder="sales_expert" {...field} />
                          </FormControl>
                          <FormDescription>
                            Unique identifier for this personality (no spaces)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Sales Expert" {...field} />
                          </FormControl>
                          <FormDescription>
                            Human-friendly name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Specialized in sales techniques and closing deals" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Brief description of what this personality does
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme Color</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" {...field} className="w-12 h-10 p-1" />
                              <Input 
                                type="text" 
                                value={field.value}
                                onChange={field.onChange}
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Color for UI elements
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Icon</FormLabel>
                          <FormControl>
                            <Input placeholder="bot" {...field} />
                          </FormControl>
                          <FormDescription>
                            Icon name (from Lucide icon set)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Lower numbers appear first
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Status</FormLabel>
                            <FormDescription>
                              Enable this personality prompt
                            </FormDescription>
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
                  </div>
                </TabsContent>
                
                <TabsContent value="prompt" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="prompt_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt Text</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="You are an expert sales representative with extensive knowledge of sales techniques..." 
                            className="min-h-[300px] font-mono text-sm"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          The specific instructions that define this personality
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="voice_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voice ID</FormLabel>
                        <FormControl>
                          <Input placeholder="eleven_labs_voice_id" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Optional ElevenLabs voice ID for this personality
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="model_config"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model Configuration</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="{}"
                            className="min-h-[150px] font-mono text-sm"
                            value={formatJsonForDisplay(field.value)}
                            onChange={(e) => {
                              try {
                                const value = JSON.parse(e.target.value);
                                field.onChange(value);
                              } catch (error) {
                                // Allow invalid JSON while typing, but don't update the value
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional JSON configuration for the AI model (temperature, etc.)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                  )}
                  {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the personality prompt "{selectedPromptToDelete?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedPromptToDelete) {
                  deleteMutation.mutate(selectedPromptToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useUserAgents } from '@/hooks/use-user-agents';
import { formatPhoneNumberForTwilio } from '@/lib/phone-utils';
// Removed external CallDialog import to use inline implementation
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAuthToken, setAuthHeaders } from '@/lib/auth';
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from '@/components/ui/textarea';
import { queryClient, apiRequest } from '@/lib/queryClient';
import AutomatedCallScheduler from '@/components/AutomatedCallScheduler';

// Import icons
import { 
  Plus, Search, Filter, Upload, X, Download, Phone, Mail, Edit, Trash2,
  UserPlus, RefreshCw, CheckCircle2, XCircle, AlertCircle, ClipboardCheck, Tag,
  Users, BarChart4, PhoneCall, Bot, Info as InfoIcon, MessageCircle
} from 'lucide-react';
import UpdateBubble from '@/components/UpdateBubble';

// Types
interface Lead {
  id: number;
  user_id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  source: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_contacted: string | null;
  tags: string[] | null;
}

interface LeadStats {
  total: number;
  recent: number;
  byStatus: Record<string, number>;
}

interface LeadsResponse {
  leads: Lead[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalLeads: number;
    leadsPerPage: number;
  };
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'qualified':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'converted':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <UserPlus className="h-3 w-3 mr-1" />;
      case 'contacted':
        return <Phone className="h-3 w-3 mr-1" />;
      case 'qualified':
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case 'converted':
        return <ClipboardCheck className="h-3 w-3 mr-1" />;
      case 'rejected':
        return <XCircle className="h-3 w-3 mr-1" />;
      default:
        return <AlertCircle className="h-3 w-3 mr-1" />;
    }
  };
  
  return (
    <Badge variant="outline" className={`flex items-center ${getStatusColor(status)}`}>
      {getStatusIcon(status)}
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </Badge>
  );
};

// Source badge component
const SourceBadge = ({ source }: { source: string }) => {
  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'manual':
        return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200';
      case 'import':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
      case 'google_sheets':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'excel':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };
  
  return (
    <Badge variant="outline" className={`${getSourceColor(source)}`}>
      {source.charAt(0).toUpperCase() + source.slice(1).toLowerCase()}
    </Badge>
  );
};

// Main component
const LeadsManagementSection: React.FC = () => {
  const { toast } = useToast();
  const { userAgents, isLoading: agentsLoading } = useUserAgents();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(null);
  
  // Simple call dialog state
  const [isSimpleCallDialogOpen, setIsSimpleCallDialogOpen] = useState(false);
  const [simpleCurrentLead, setSimpleCurrentLead] = useState<Lead | null>(null);
  const [simpleSelectedAgentId, setSimpleSelectedAgentId] = useState<number | null>(null);
  
  // Form state for new/edit lead
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    status: 'new',
    notes: '',
    tags: ''
  });
  
  // Import form state
  const [importFile, setImportFile] = useState<File | null>(null);
  
  // Fetch leads with pagination and filters
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/leads', page, limit, searchTerm, statusFilter],
    queryFn: async () => {
      try {
        // Get auth token from centralized utility
        const authToken = getAuthToken();
        
        // Create headers with authentication
        const headers = setAuthHeaders({
          'Content-Type': 'application/json'
        });
        
        const response = await fetch(
          `/api/leads?page=${page}&limit=${limit}${searchTerm ? `&search=${searchTerm}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`,
          {
            headers,
            credentials: 'include',
          }
        );
        
        if (response.status === 401) {
          // Handle authentication error
          toast({
            title: "Authentication Required",
            description: "Please log in to view your leads",
            variant: "destructive",
          });
          
          // Optional: Redirect to login
          // window.location.href = '/login';
          
          // Return empty data instead of throwing
          return {
            leads: [],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalLeads: 0,
              leadsPerPage: limit
            }
          } as LeadsResponse;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch leads');
        }
        
        return response.json() as Promise<LeadsResponse>;
      } catch (error) {
        console.error("Error fetching leads:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
  });
  
  // Fetch available Twilio phone numbers
  const { data: phoneNumbersData, isLoading: phoneNumbersLoading, error: phoneNumbersError } = useQuery({
    queryKey: ['/api/twilio/purchased-phone-numbers'],
    queryFn: async () => {
      try {
        console.log('Fetching Twilio purchased phone numbers...');
        // Use our improved apiRequest function
        const response = await apiRequest('GET', '/api/twilio/purchased-phone-numbers');
        
        if (!response.ok) {
          console.error('Failed to fetch Twilio phone numbers:', response.status);
          return { phoneNumbers: [] };
        }
        
        const data = await response.json();
        console.log('Fetched Twilio phone numbers successfully:', data);
        return data;
      } catch (error) {
        console.error('Error fetching Twilio phone numbers:', error);
        return { phoneNumbers: [] };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2, // Retry up to 2 times on failure
    enabled: true // Always fetch phone numbers
  });
  
  // Fetch lead stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/leads/stats/summary'],
    queryFn: async () => {
      try {
        // Create headers with authentication using auth utility
        const headers = setAuthHeaders({
          'Content-Type': 'application/json'
        });
        
        const response = await fetch('/api/leads/stats/summary', {
          headers,
          credentials: 'include',
        });
        
        if (response.status === 401) {
          // Return empty stats data instead of throwing for auth errors
          return {
            total: 0,
            recent: 0,
            byStatus: {}
          } as LeadStats;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch lead statistics');
        }
        
        return response.json() as Promise<LeadStats>;
      } catch (error) {
        console.error("Error fetching lead stats:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
  });
  
  // Add lead mutation
  const addLeadMutation = useMutation({
    mutationFn: async (leadData: Omit<typeof formData, 'tags'> & { tags: string[] | null }) => {
      // Create headers with authentication using auth utility
      const headers = setAuthHeaders({
        'Content-Type': 'application/json'
      });
      
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers,
        credentials: 'include', // Include credentials for authentication
        body: JSON.stringify(leadData),
      });
      
      if (response.status === 401) {
        // Handle authentication error specifically
        toast({
          title: "Authentication Required",
          description: "Please log in to add leads",
          variant: "destructive",
        });
        
        // Optional: Redirect to login page
        // window.location.href = '/login';
        
        throw new Error("Authentication required");
      }
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add lead');
        } catch (e) {
          // In case the error response isn't valid JSON
          throw new Error('Failed to add lead');
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads/stats/summary'] });
      setFormData({
        full_name: '',
        phone_number: '',
        email: '',
        status: 'new',
        notes: '',
        tags: ''
      });
      setAddLeadOpen(false);
      toast({
        title: 'Lead added successfully',
        description: 'The new contact has been added to your leads.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, leadData }: { id: number; leadData: Omit<typeof formData, 'tags'> & { tags: string[] | null } }) => {
      // Create headers with authentication using auth utility
      const headers = setAuthHeaders({
        'Content-Type': 'application/json'
      });
      
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers,
        credentials: 'include', // Include credentials for authentication
        body: JSON.stringify(leadData),
      });
      
      if (response.status === 401) {
        // Handle authentication error specifically
        toast({
          title: "Authentication Required",
          description: "Please log in to update leads",
          variant: "destructive",
        });
        
        throw new Error("Authentication required");
      }
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update lead');
        } catch (e) {
          // In case the error response isn't valid JSON
          throw new Error('Failed to update lead');
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setFormData({
        full_name: '',
        phone_number: '',
        email: '',
        status: 'new',
        notes: '',
        tags: ''
      });
      setCurrentLead(null);
      setEditLeadOpen(false);
      toast({
        title: 'Lead updated successfully',
        description: 'The contact information has been updated.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (id: number) => {
      // Create headers with authentication using auth utility
      const headers = setAuthHeaders();
      
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include', // Include credentials for authentication
      });
      
      if (response.status === 401) {
        // Handle authentication error specifically
        toast({
          title: "Authentication Required",
          description: "Please log in to delete leads",
          variant: "destructive",
        });
        
        throw new Error("Authentication required");
      }
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete lead');
        } catch (e) {
          // In case the error response isn't valid JSON
          throw new Error('Failed to delete lead');
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads/stats/summary'] });
      toast({
        title: 'Lead deleted successfully',
        description: 'The contact has been removed from your leads.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Import leads mutation
  const importLeadsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Create headers with authentication using auth utility
      const headers = setAuthHeaders();
      
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers,
        credentials: 'include', // Include credentials for authentication
        body: formData,
      });
      
      if (response.status === 401) {
        // Handle authentication error specifically
        toast({
          title: "Authentication Required",
          description: "Please log in to import leads",
          variant: "destructive",
        });
        
        throw new Error("Authentication required");
      }
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to import leads');
        } catch (e) {
          // In case the error response isn't valid JSON
          throw new Error('Failed to import leads');
        }
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads/stats/summary'] });
      setImportFile(null);
      setImportOpen(false);
      toast({
        title: 'Leads imported successfully',
        description: `Imported ${data.imported} contacts${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to import leads',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // AI Call initiation mutation
  const initiateCallMutation = useMutation({
    mutationFn: async ({ agentId, phoneNumber, leadId, twilioPhoneNumber }: { agentId: number, phoneNumber: string, leadId: number, twilioPhoneNumber?: string }) => {
      try {
        console.log('Initiating AI call with:', { agentId, phoneNumber, leadId, twilioPhoneNumber });
        
        // Use our improved apiRequest function from queryClient.ts with the correct format
        // This matches the fixed format we used in Dashboard.tsx
        const response = await apiRequest(
          'POST',
          '/api/twilio-direct/call',
          { 
            agentId, 
            phoneNumber, 
            leadId, 
            twilioPhoneNumber,
            record: true
          }
        );
        
        console.log('Initiate call response status:', response.status);
        
        if (!response.ok) {
          console.error(`Error initiating call, response status: ${response.status}`);
          
          try {
            // Try to get the error details from response
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            
            // Try to parse as JSON if possible
            try {
              const errorData = JSON.parse(errorText);
              throw new Error(errorData.error || errorData.details || 'Failed to initiate AI call');
            } catch (parseError) {
              // Not valid JSON, use the raw text
              throw new Error(`Failed to initiate AI call: ${errorText}`);
            }
          } catch (textError) {
            // If we can't even read the response body
            throw new Error(`Failed to initiate AI call. Server responded with status ${response.status}`);
          }
        }
        
        // Parse the JSON response
        const result = await response.json();
        console.log('Call initiation successful:', result);
        return result;
      } catch (error) {
        console.error('Error in initiateCallMutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setIsCallDialogOpen(false);
      setSelectedAgentId(null);
      setSelectedPhoneNumber(null);
      setCallInProgress(false);
      toast({
        title: 'AI call initiated',
        description: `The AI agent is now calling the lead. Call SID: ${data.callSid}`,
        variant: 'default',
      });
    },
    onError: (error) => {
      setCallInProgress(false);
      toast({
        title: 'Failed to initiate AI call',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle add lead form submission
  const handleAddLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = formData.tags 
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : null;
    
    addLeadMutation.mutate({
      ...formData,
      tags: tagsArray,
    });
  };
  
  // Handle edit lead form submission
  const handleEditLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLead) return;
    
    const tagsArray = formData.tags 
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : null;
    
    updateLeadMutation.mutate({
      id: currentLead.id,
      leadData: {
        ...formData,
        tags: tagsArray,
      },
    });
  };
  
  // Handle opening the edit lead dialog
  const handleEditLead = (lead: Lead) => {
    setCurrentLead(lead);
    setFormData({
      full_name: lead.full_name,
      phone_number: lead.phone_number,
      email: lead.email || '',
      status: lead.status,
      notes: lead.notes || '',
      tags: lead.tags ? lead.tags.join(', ') : '',
    });
    setEditLeadOpen(true);
  };
  
  // Handle lead deletion
  const handleDeleteLead = (id: number) => {
    if (window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      deleteLeadMutation.mutate(id);
    }
  };
  
  // Handle import file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };
  
  // Handle import form submission
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast({
        title: 'No file selected',
        description: 'Please select an Excel or CSV file to import',
        variant: 'destructive',
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', importFile);
    importLeadsMutation.mutate(formData);
  };
  
  // Handle opening the AI call dialog with error handling
  const handleOpenCallDialog = (lead: Lead) => {
    try {
      console.log('Opening call dialog for lead:', lead);
      
      // Validate lead data to prevent errors
      if (!lead || !lead.id || !lead.phone_number) {
        throw new Error('Invalid lead data: Missing required fields');
      }
      
      // Reset previous state values to ensure a clean dialog state
      setSelectedAgentId(null);
      setSelectedPhoneNumber(null);
      setCallInProgress(false);
      
      // Create a clean copy of the lead to prevent reference issues
      const cleanLead = {
        id: lead.id,
        user_id: lead.user_id || 0,
        full_name: lead.full_name || 'Unknown',
        phone_number: lead.phone_number,
        email: lead.email,
        source: lead.source || 'Manual Entry',
        status: lead.status || 'Active',
        notes: lead.notes,
        created_at: lead.created_at || new Date().toISOString(),
        updated_at: lead.updated_at || new Date().toISOString(),
        last_contacted: lead.last_contacted,
        tags: lead.tags || []
      };
      
      // Set current lead and open dialog
      setCurrentLead(cleanLead);
      setIsCallDialogOpen(true);
      
      console.log('Call dialog opened successfully with lead:', cleanLead);
    } catch (error) {
      console.error('Error opening call dialog:', error);
      toast({
        title: 'Error opening call dialog',
        description: 'Please try refreshing the page and trying again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle initiating an AI call from the dialog
  const handleInitiateCall = () => {
    console.log('handleInitiateCall called');
    
    if (!currentLead || !selectedAgentId) {
      console.error('Missing information for AI call:', { currentLead, selectedAgentId });
      toast({
        title: 'Missing information',
        description: 'Please select an AI agent to make the call',
        variant: 'destructive',
      });
      return;
    }
    
    // Log details for debugging
    console.log('Starting AI call with:', {
      agentId: selectedAgentId,
      phoneNumber: currentLead.phone_number,
      leadId: currentLead.id,
      twilioPhoneNumber: selectedPhoneNumber
    });
    
    setCallInProgress(true);
    
    // Call the API to initiate the call - ensure phone number is properly formatted for Twilio
    try {
      // Format the phone number for Twilio (E.164 format)
      console.log('Original lead phone number:', currentLead.phone_number);
      
      // Check if phone number exists
      if (!currentLead.phone_number || currentLead.phone_number.trim() === '') {
        throw new Error('Lead has no phone number. Please update the lead with a valid phone number.');
      }
      
      // Try to format the phone number with enhanced error handling
      const formattedPhoneNumber = formatPhoneNumberForTwilio(currentLead.phone_number);
      console.log('Successfully formatted phone number for Twilio:', currentLead.phone_number, '→', formattedPhoneNumber);
      
      // Final E.164 format validation before sending to API
      if (!formattedPhoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error(`Phone number ${formattedPhoneNumber} is not in valid E.164 format. It must start with + followed by country code and digits.`);
      }
      
      // For debugging, show the exact data we're sending to the API
      console.log('[CALL DEBUG] Sending to API:', {
        agentId: selectedAgentId,
        phoneNumber: formattedPhoneNumber,
        leadId: currentLead.id,
        twilioPhoneNumber: selectedPhoneNumber || "default"
      });
      
      // Using direct API call instead of mutation for better debugging
      console.log('[CALL DEBUG] Explicitly using API.initiateCall directly');
      
      // Use the API directly instead of mutation
      API.initiateCall(
        selectedAgentId,
        formattedPhoneNumber,
        currentLead.id,
        selectedPhoneNumber || undefined
      ).then(response => {
        console.log('[CALL DEBUG] Call API response:', response);
        
        if (!response.ok) {
          return response.json().then(errorData => {
            console.error('[CALL DEBUG] Error response details:', errorData);
            throw new Error(errorData.error || 'Failed to initiate call');
          });
        }
        
        return response.json();
      }).then(data => {
        console.log('[CALL DEBUG] Call initiated successfully:', data);
        setCallDialogOpen(false);
        setCallInProgress(false);
        
        toast({
          title: 'Call initiated',
          description: `AI agent is calling ${currentLead.full_name}...`,
          variant: 'default',
        });
      }).catch(error => {
        console.error('[CALL DEBUG] Error in direct API call:', error);
        setCallInProgress(false);
        
        toast({
          title: 'Call failed',
          description: error.message || 'Failed to initiate call',
          variant: 'destructive',
        });
      });
      
      // Comment out the mutation approach to try a more direct approach
      /*
      initiateCallMutation.mutate({
        agentId: selectedAgentId,
        phoneNumber: formattedPhoneNumber,
        leadId: currentLead.id,
        twilioPhoneNumber: selectedPhoneNumber || undefined
      });
      */
    } catch (error) {
      // Extra error handling at the function level
      console.error('Error in phone number formatting:', error);
      setCallInProgress(false);
      
      toast({
        title: 'Failed to format phone number',
        description: error instanceof Error 
          ? error.message 
          : 'The phone number could not be formatted correctly for Twilio. Please check the lead has a valid phone number.',
        variant: 'destructive',
      });
    }
  };
  
  // State for simplified call dialog (removed and using declarations from above)
  // These variables are already declared above
  // const [isSimpleCallDialogOpen, setIsSimpleCallDialogOpen] = useState(false);
  // const [simpleCurrentLead, setSimpleCurrentLead] = useState<Lead | null>(null);
  // const [simpleSelectedAgentId, setSimpleSelectedAgentId] = useState<number | null>(null);
  
  // Open simple agent selection dialog
  const handleOpenSimpleCallDialog = (lead: Lead) => {
    setSimpleCurrentLead(lead);
    setSimpleSelectedAgentId(userAgents && userAgents.length > 0 ? userAgents[0].id : null);
    setIsSimpleCallDialogOpen(true);
  };
  
  // Direct AI call with agent selection dialog
  const handleDirectAICall = () => {
    try {
      if (!simpleCurrentLead || !simpleSelectedAgentId) {
        toast({
          title: 'Missing information',
          description: 'Please select an AI agent to make the call',
          variant: 'destructive',
        });
        return;
      }
      
      // Find the selected agent
      const selectedAgent = userAgents?.find(agent => agent.id === simpleSelectedAgentId);
      if (!selectedAgent) {
        toast({
          title: 'Agent not found',
          description: 'The selected agent could not be found',
          variant: 'destructive',
        });
        return;
      }
      
      // Set call in progress to show loading state
      setCallInProgress(true);
      
      toast({
        title: 'Starting AI call',
        description: `Using ${selectedAgent.name} to call ${simpleCurrentLead.phone_number}...`,
      });
      
      console.log('Making direct AI call with:', {
        agentId: simpleSelectedAgentId,
        phoneNumber: simpleCurrentLead.phone_number,
        leadId: simpleCurrentLead.id
      });
      
      // Check if phone number exists and format it properly with additional validation
      console.log('Original lead phone number:', simpleCurrentLead.phone_number);
      
      // Check if phone number exists
      if (!simpleCurrentLead.phone_number || simpleCurrentLead.phone_number.trim() === '') {
        throw new Error('Lead has no phone number. Please update the lead with a valid phone number.');
      }
      
      // Format phone number to E.164 format for Twilio using our enhanced utility function
      const formattedPhoneNumber = formatPhoneNumberForTwilio(simpleCurrentLead.phone_number);
      console.log('Successfully formatted phone number for Twilio:', simpleCurrentLead.phone_number, '→', formattedPhoneNumber);
      
      // Final E.164 format validation before sending to API
      if (!formattedPhoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error(`Phone number ${formattedPhoneNumber} is not in valid E.164 format. It must start with + followed by country code and digits.`);
      }
      
      // Log the exact data we're sending to the API for debugging
      console.log('Sending to API for simple call:', {
        agentId: simpleSelectedAgentId,
        phoneNumber: formattedPhoneNumber,
        leadId: simpleCurrentLead.id,
        twilioPhoneNumber: selectedPhoneNumber || "default"
      });
      
      // Use the correct endpoint from the server
      initiateCallMutation.mutate(
        {
          agentId: simpleSelectedAgentId,
          phoneNumber: formattedPhoneNumber,
          leadId: simpleCurrentLead.id,
          twilioPhoneNumber: selectedPhoneNumber // Pass the selected phone number or null
        },
        {
          onSuccess: () => {
            // Close the dialog on success
            setIsSimpleCallDialogOpen(false);
            setSimpleCurrentLead(null);
            setSimpleSelectedAgentId(null);
          },
          onError: (error) => {
            console.error('Error in handleDirectAICall:', error);
            toast({
              title: 'Failed to start AI call',
              description: error instanceof Error ? error.message : 'An unexpected error occurred',
              variant: 'destructive',
            });
          },
          onSettled: () => {
            // Always reset the loading state when done
            setCallInProgress(false);
          }
        }
      );
    } catch (error) {
      console.error('Error in handleDirectAICall:', error);
      toast({
        title: 'Failed to start AI call',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      setCallInProgress(false);
    }
  };
  
  // Pagination components
  const renderPagination = () => {
    if (!data || !data.pagination) return null;
    
    const { currentPage, totalPages } = data.pagination;
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setPage(currentPage > 1 ? currentPage - 1 : 1)}
              className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          
          {[...Array(totalPages)].map((_, i) => {
            const pageNumber = i + 1;
            
            // Show current page, first page, last page, and one page before/after current
            if (
              pageNumber === 1 ||
              pageNumber === totalPages ||
              pageNumber === currentPage ||
              pageNumber === currentPage - 1 ||
              pageNumber === currentPage + 1
            ) {
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={pageNumber === currentPage}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            }
            
            // Show ellipsis for gaps
            if (
              (pageNumber === 2 && currentPage > 3) ||
              (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
            ) {
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            
            return null;
          })}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setPage(currentPage < totalPages ? currentPage + 1 : totalPages)}
              className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // Render tags
  const renderTags = (tags: string[] | null) => {
    if (!tags || tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {tags.map((tag, index) => (
          <Badge 
            key={index} 
            variant="outline" 
            className="bg-gray-100 text-gray-800 text-xs flex items-center"
          >
            <Tag className="h-3 w-3 mr-1" />
            {tag}
          </Badge>
        ))}
      </div>
    );
  };
  
  // Date formatter
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div 
         className="bg-opacity-20 bg-gray-800 border-0 backdrop-blur-md relative overflow-hidden rounded-lg"
         data-highlight="leads-management-section"
         style={{ 
           background: 'rgba(20, 20, 30, 0.7)', 
           boxShadow: '0 0 15px 2px rgba(51, 195, 189, 0.2), 0 0 20px 5px rgba(0, 117, 255, 0.1)'
         }}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-teal-400"></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 mr-4"
                 style={{ 
                   animation: 'iconFloat 3s ease-in-out infinite',
                   boxShadow: '0 0 15px 5px rgba(59, 130, 246, 0.3)'
                 }}>
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                Leads Management
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-700/40 text-blue-300 rounded-full">New</span>
              </h2>
              <p className="text-gray-400">Manage your contacts and track communication</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => setAddLeadOpen(true)} 
              variant="default" 
              className="flex items-center gap-1"
              data-highlight="add-lead-button"
            >
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
            <Button onClick={() => setImportOpen(true)} variant="outline" className="flex items-center gap-1">
              <Upload className="h-4 w-4" /> Import
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-white">
                  <Users className="h-5 w-5 mr-2 text-blue-400" />
                  Total Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statsData.total}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-white">
                  <UserPlus className="h-5 w-5 mr-2 text-green-400" />
                  New Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statsData.byStatus?.new || 0}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-white">
                  <Phone className="h-5 w-5 mr-2 text-yellow-400" />
                  Contacted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statsData.byStatus?.contacted || 0}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-white">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-purple-400" />
                  Converted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statsData.byStatus?.converted || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700/50 text-white"
            />
          </div>
          
          <div className="w-full md:w-64">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => { 
              setSearchTerm(''); 
              setStatusFilter(''); 
              setPage(1); 
            }}
            className="bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Leads Table */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-800/70">
              <TableRow>
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Contact</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Source</TableHead>
                <TableHead className="text-gray-400">Created</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    <div className="flex flex-col items-center">
                      <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                      <span>Loading leads...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-red-400">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <span>Failed to load leads</span>
                      <Button 
                        variant="outline" 
                        onClick={() => refetch()} 
                        className="mt-2 text-white"
                      >
                        Try Again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data && data.leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    <div className="flex flex-col items-center">
                      <Users className="h-8 w-8 mb-2" />
                      <span>No leads found</span>
                      <Button 
                        variant="outline" 
                        onClick={() => setAddLeadOpen(true)} 
                        className="mt-2 text-white"
                      >
                        Add Your First Lead
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.leads.map((lead) => (
                  <TableRow key={lead.id} className="border-gray-700/50 hover:bg-gray-800/50">
                    <TableCell>
                      <div className="font-medium text-white">{lead.full_name}</div>
                      {renderTags(lead.tags)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <div className="space-y-2">
                        <div className="flex items-center px-2 py-1 bg-gray-800/70 rounded border border-gray-700/50 text-gray-200">
                          <Phone className="h-3.5 w-3.5 mr-2 text-blue-400" />
                          {lead.phone_number}
                        </div>
                        
                        {lead.email && (
                          <div className="flex items-center px-2 py-1 bg-gray-800/70 rounded border border-gray-700/50 text-gray-200">
                            <Mail className="h-3.5 w-3.5 mr-2 text-green-400" />
                            {lead.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={lead.source} />
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatDate(lead.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Update Bubble Component */}
                        <UpdateBubble leadId={lead.id} />
                        
                        {/* Quick AI Call button with simple agent selection */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenSimpleCallDialog(lead)}
                          className="h-8 w-8 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50"
                          title="Quick AI Call (select agent)"
                        >
                          <Bot className="h-4 w-4" />
                        </Button>
                        
                        {/* Regular AI Call button with dialog (keeping for comparison) */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenCallDialog(lead)}
                          className="h-8 w-8 text-gray-400 hover:text-green-400 hover:bg-gray-700/50"
                          title="AI Call with Options"
                        >
                          <PhoneCall className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditLead(lead)}
                          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700/50"
                          title="Edit Lead"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-gray-700/50"
                          title="Delete Lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-between items-center text-gray-400 text-sm">
          {data && (
            <div>
              Showing {data.leads.length} of {data.pagination.totalLeads} leads
            </div>
          )}
          {renderPagination()}
        </div>

        {/* Automated Call Scheduler */}
        <div 
          className="mt-8 p-6 border border-gray-800 rounded-lg bg-gray-900/50 backdrop-blur-sm"
          data-highlight="automated-call-scheduler"
        >
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Bot className="mr-2 h-5 w-5 text-blue-400" />
            AI Automated Call Scheduling
          </h3>
          <AutomatedCallScheduler />
        </div>

        {/* Add Lead Dialog */}
        <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
          <DialogContent className="bg-gray-900 text-white border-gray-700 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Lead</DialogTitle>
              <DialogDescription className="text-gray-400">
                Enter contact information to add a new lead.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddLeadSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="full_name" className="text-right text-gray-300">
                    Name
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone_number" className="text-right text-gray-300">
                    Phone
                  </Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right text-gray-300">
                    Status
                  </Label>
                  <Select
                    name="status"
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger className="col-span-3 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tags" className="text-right text-gray-300">
                    Tags
                  </Label>
                  <Input
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="tag1, tag2, tag3"
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="notes" className="text-right text-gray-300 pt-2">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddLeadOpen(false)}
                  className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addLeadMutation.isPending}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {addLeadMutation.isPending && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add Lead
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Lead Dialog */}
        <Dialog open={editLeadOpen} onOpenChange={setEditLeadOpen}>
          <DialogContent className="bg-gray-900 text-white border-gray-700 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Lead</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update contact information for this lead.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleEditLeadSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_full_name" className="text-right text-gray-300">
                    Name
                  </Label>
                  <Input
                    id="edit_full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_phone_number" className="text-right text-gray-300">
                    Phone
                  </Label>
                  <Input
                    id="edit_phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_email" className="text-right text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="edit_email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_status" className="text-right text-gray-300">
                    Status
                  </Label>
                  <Select
                    name="status"
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger className="col-span-3 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_tags" className="text-right text-gray-300">
                    Tags
                  </Label>
                  <Input
                    id="edit_tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="tag1, tag2, tag3"
                    className="col-span-3 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit_notes" className="text-right text-gray-300 pt-2">
                    Notes
                  </Label>
                  <Textarea
                    id="edit_notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="col-span-3 bg-gray-800 border-gray-700 text-white min-h-[80px]"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditLeadOpen(false)}
                  className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateLeadMutation.isPending}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {updateLeadMutation.isPending && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Update Lead
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="bg-gray-900 text-white border-gray-700 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Import Leads</DialogTitle>
              <DialogDescription className="text-gray-400">
                Import leads from Excel (.xlsx) or CSV file.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleImportSubmit}>
              <div className="grid gap-4 py-4">
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-800/50 transition-colors"
                     onClick={() => document.getElementById('import_file')?.click()}>
                  <input
                    id="import_file"
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  
                  {importFile ? (
                    <div className="flex flex-col items-center">
                      <div className="mb-2 p-2 bg-blue-500/20 rounded-full">
                        <Download className="h-6 w-6 text-blue-400" />
                      </div>
                      <p className="text-white font-medium mb-1">{importFile.name}</p>
                      <p className="text-sm text-gray-400">
                        {(importFile.size / 1024).toFixed(2)} KB • {importFile.type}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="mb-2 p-2 bg-gray-800 rounded-full">
                        <Upload className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-white font-medium mb-1">Choose file or drag & drop</p>
                      <p className="text-sm text-gray-400">Excel or CSV files only (max 5MB)</p>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-300">
                  <h4 className="font-medium mb-2 text-gray-200">File Format Requirements:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li>Must include columns for: Name, Phone</li>
                    <li>Optional columns: Email, Status, Notes, Tags</li>
                    <li>First row should be column headers</li>
                    <li>Tags should be comma-separated in a single column</li>
                  </ul>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setImportOpen(false)}
                  className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={!importFile || importLeadsMutation.isPending}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {importLeadsMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Leads'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Simple Direct AI Call Dialog Implementation */}
        <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Initiate AI Call</DialogTitle>
              <DialogDescription className="text-gray-400">
                Your AI agent will call this lead using Twilio.
              </DialogDescription>
            </DialogHeader>
            
            {currentLead && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-200">Lead Information</h4>
                  <div className="bg-gray-800 p-3 rounded-md">
                    <div className="text-white">{currentLead.full_name}</div>
                    <div className="text-blue-400 flex items-center mt-1">
                      <Phone className="h-3.5 w-3.5 mr-1.5" /> 
                      {currentLead.phone_number}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-200">Select AI Agent</h4>
                  <Select
                    value={selectedAgentId?.toString() || ''} 
                    onValueChange={(value) => setSelectedAgentId(parseInt(value))}
                    disabled={agentsLoading || callInProgress}
                  >
                    <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select an AI agent" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      {agentsLoading ? (
                        <SelectItem value="" disabled>Loading agents...</SelectItem>
                      ) : userAgents && userAgents.length > 0 ? (
                        userAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>No agents found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-200">Caller ID (Optional)</h4>
                  <Select
                    value={selectedPhoneNumber || ''}
                    onValueChange={setSelectedPhoneNumber}
                    disabled={phoneNumbersLoading || callInProgress}
                  >
                    <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Use default number" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="">Use default number</SelectItem>
                      {phoneNumbersLoading ? (
                        <SelectItem value="" disabled>Loading phone numbers...</SelectItem>
                      ) : phoneNumbersData?.phoneNumbers && phoneNumbersData.phoneNumbers.length > 0 ? (
                        phoneNumbersData.phoneNumbers.map((phone: string, index: number) => (
                          <SelectItem key={index} value={phone}>
                            {phone}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>No purchased numbers found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">Choose a Twilio phone number to use as caller ID</p>
                </div>
                
                {/* Display which phone number will be calling the lead */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-sm text-gray-200 mb-2">Outgoing Call Details</h4>
                  <div className="bg-gray-800 p-3 rounded-md">
                    <div className="text-sm text-gray-300 flex items-start mb-1">
                      <div className="mr-2 mt-0.5"><Phone className="h-3.5 w-3.5 text-green-400" /></div>
                      <div>
                        <span className="text-gray-400">From:</span>{" "}
                        <span className="text-green-400 font-medium">
                          {selectedPhoneNumber || (phoneNumbersData?.phoneNumbers?.length > 0 ? 
                            phoneNumbersData.phoneNumbers[0] : 
                            "+15302886523")}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          This number will be displayed to the lead when receiving the call
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-300 flex items-start mt-2">
                      <div className="mr-2 mt-0.5"><Phone className="h-3.5 w-3.5 text-blue-400" /></div>
                      <div>
                        <span className="text-gray-400">To:</span>{" "}
                        <span className="text-white font-medium">{currentLead.phone_number}</span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Lead's phone number
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCallDialogOpen(false)} disabled={callInProgress}>
                Cancel
              </Button>
              <Button 
                onClick={handleInitiateCall} 
                disabled={!selectedAgentId || callInProgress}
                className="relative"
              >
                {callInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Calling...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Start AI Call
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Simple AI Call Dialog - with just agent selection */}
        <Dialog open={isSimpleCallDialogOpen} onOpenChange={setIsSimpleCallDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Quick AI Call</DialogTitle>
              <DialogDescription className="text-gray-400">
                Select an AI agent to call {simpleCurrentLead?.full_name}
              </DialogDescription>
            </DialogHeader>
            
            {simpleCurrentLead && (
              <div className="py-4">
                <div className="mb-4 p-4 bg-gray-800/40 rounded-lg border border-gray-700/50">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-400">Name:</div>
                    <div className="text-white">{simpleCurrentLead.full_name}</div>
                    <div className="text-gray-400">Phone:</div>
                    <div className="text-white">{simpleCurrentLead.phone_number}</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="simple-agent" className="text-gray-300">
                      AI Agent
                    </Label>
                    <Select
                      value={simpleSelectedAgentId?.toString() || ''}
                      onValueChange={(value) => setSimpleSelectedAgentId(parseInt(value))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {userAgents?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Display caller ID information in the simple dialog too */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-sm text-gray-200 mb-2">Call Details</h4>
                  <div className="bg-gray-800/50 p-3 rounded-md">
                    <div className="text-sm text-gray-300 flex items-start mb-1">
                      <div className="mr-2 mt-0.5"><Phone className="h-3.5 w-3.5 text-green-400" /></div>
                      <div>
                        <span className="text-gray-400">Caller ID:</span>{" "}
                        <span className="text-green-400 font-medium">
                          +15302886523
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          This number will be displayed to the lead
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsSimpleCallDialogOpen(false)}
                className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleDirectAICall}
                disabled={!simpleSelectedAgentId}
                className="bg-blue-600 text-white hover:bg-blue-700 gap-2"
              >
                <Bot className="h-4 w-4" />
                Call Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LeadsManagementSection;
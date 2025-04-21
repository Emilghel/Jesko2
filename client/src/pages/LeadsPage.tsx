import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { queryClient } from '@/lib/queryClient';

// Import icons
import { 
  Plus, Search, Filter, Upload, X, Download, Phone, Mail, Edit, Trash2,
  UserPlus, RefreshCw, CheckCircle2, XCircle, AlertCircle, ClipboardCheck, Tag
} from 'lucide-react';

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

// Main page component
const LeadsPage: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  
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
      const response = await fetch(
        `/api/leads?page=${page}&limit=${limit}${searchTerm ? `&search=${searchTerm}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json() as Promise<LeadsResponse>;
    },
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Fetch lead stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/leads/stats/summary'],
    queryFn: async () => {
      const response = await fetch('/api/leads/stats/summary', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch lead statistics');
      }
      return response.json() as Promise<LeadStats>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Add lead mutation
  const addLeadMutation = useMutation({
    mutationFn: async (leadData: Omit<typeof formData, 'tags'> & { tags: string[] | null }) => {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add lead');
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
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lead');
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
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete lead');
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
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import leads');
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Leads Management</h1>
          <p className="text-muted-foreground">Manage your contacts and track communication</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setAddLeadOpen(true)} variant="default" className="flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
          <Button onClick={() => setImportOpen(true)} variant="outline" className="flex items-center">
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total contacts in your database</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.recent || 0}</div>
            <p className="text-xs text-muted-foreground">New contacts added in last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.byStatus?.qualified || 0}</div>
            <p className="text-xs text-muted-foreground">Qualified leads ready for conversion</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.byStatus?.converted || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully converted to customers</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && refetch()}
          />
        </div>
        
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={() => refetch()} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Leads Table */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading leads...</p>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
                    <p className="mt-2 text-sm text-destructive">Failed to load leads</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => refetch()}
                    >
                      Try Again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : data?.leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No leads found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || statusFilter ? 
                        'Try changing your search or filter criteria' : 
                        'Add your first lead to get started'}
                    </p>
                    {!searchTerm && !statusFilter && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => setAddLeadOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Lead
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                data?.leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.full_name}
                      {renderTags(lead.tags)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1.5 text-muted-foreground" />
                          <span>{lead.phone_number}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1.5 text-muted-foreground" />
                            <span>{lead.email}</span>
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
                    <TableCell>{formatDate(lead.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditLead(lead)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLead(lead.id)}
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
        </CardContent>
        
        {data && data.pagination && data.pagination.totalPages > 1 && (
          <CardFooter className="flex justify-center py-4">
            {renderPagination()}
          </CardFooter>
        )}
      </Card>
      
      {/* Add Lead Dialog */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Add a new contact to your leads database.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddLeadSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="full_name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  className="col-span-3"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone_number" className="text-right">
                  Phone Number
                </Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  className="col-span-3"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className="col-span-3"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select 
                  name="status"
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger className="col-span-3">
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
                <Label htmlFor="tags" className="text-right">
                  Tags
                </Label>
                <Input
                  id="tags"
                  name="tags"
                  className="col-span-3"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="Comma-separated tags"
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  className="col-span-3"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddLeadOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addLeadMutation.isPending}
              >
                {addLeadMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Lead'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Lead Dialog */}
      <Dialog open={editLeadOpen} onOpenChange={setEditLeadOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update contact information for this lead.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditLeadSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_full_name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="edit_full_name"
                  name="full_name"
                  className="col-span-3"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_phone_number" className="text-right">
                  Phone Number
                </Label>
                <Input
                  id="edit_phone_number"
                  name="phone_number"
                  className="col-span-3"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit_email"
                  name="email"
                  type="email"
                  className="col-span-3"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_status" className="text-right">
                  Status
                </Label>
                <Select 
                  name="status"
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger className="col-span-3">
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
                <Label htmlFor="edit_tags" className="text-right">
                  Tags
                </Label>
                <Input
                  id="edit_tags"
                  name="tags"
                  className="col-span-3"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="Comma-separated tags"
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit_notes" className="text-right pt-2">
                  Notes
                </Label>
                <Textarea
                  id="edit_notes"
                  name="notes"
                  className="col-span-3"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditLeadOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateLeadMutation.isPending}
              >
                {updateLeadMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Lead'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Import Leads Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Leads</DialogTitle>
            <DialogDescription>
              Import contacts from Excel or CSV files.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleImportSubmit}>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="file_upload">Upload File</Label>
                <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                  {importFile ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="bg-background rounded-full p-2">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImportFile(null)}
                        className="text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-center mb-1">
                        <span className="font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        Excel or CSV files supported
                      </p>
                    </>
                  )}
                  <input
                    id="file_upload"
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Requirements</h4>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  <li>File must contain columns for "Full Name" and "Phone Number"</li>
                  <li>Optional columns: Email, Notes, Tags</li>
                  <li>Maximum file size: 5MB</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={importLeadsMutation.isPending || !importFile}
              >
                {importLeadsMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
    </div>
  );
};

export default LeadsPage;
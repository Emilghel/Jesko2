import { Router, Request, Response } from 'express';
import { db } from './db';
import { insertLeadSchema, leads, LeadStatus } from '../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireUser } from './auth-middleware';
import multer from 'multer';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { z } from 'zod';

const upload = multer({ dest: 'uploads/' });
const leadsRouter = Router();

// Middleware to ensure the user is authenticated
leadsRouter.use(requireUser);

// Get all leads for a user with pagination, filtering, and sorting
leadsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string || undefined;
    const search = req.query.search as string || undefined;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    // Build the query with filters
    let query = db.select().from(leads).where(eq(leads.user_id, userId));

    // Add status filter if provided
    if (status) {
      query = query.where(eq(leads.status, status));
    }

    // Add search filter if provided
    if (search) {
      query = query.where(
        sql`(${leads.full_name} ILIKE ${`%${search}%`} OR ${leads.phone_number} ILIKE ${`%${search}%`} OR ${leads.email} ILIKE ${`%${search}%`})`
      );
    }

    // Apply sort order
    if (sortOrder === 'asc') {
      query = query.orderBy(sql`${sortBy} ASC`);
    } else {
      query = query.orderBy(sql`${sortBy} DESC`);
    }

    // Apply pagination
    query = query.limit(limit).offset(offset);

    // Execute the query
    const userLeads = await query;

    // Count total leads for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.user_id, userId));
    
    const totalCount = countResult[0]?.count || 0;

    return res.json({
      leads: userLeads,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalLeads: totalCount,
        leadsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get a single lead by ID
leadsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const leadId = parseInt(req.params.id);
    
    if (isNaN(leadId)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }
    
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, userId)
      ));
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    return res.json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create a new lead
leadsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Add user_id to the request body
    req.body.user_id = userId;
    
    // Validate the request body
    const validatedData = insertLeadSchema.parse(req.body);
    
    // Insert the lead
    const [insertedLead] = await db.insert(leads).values(validatedData).returning();
    
    return res.status(201).json({ 
      success: true, 
      lead: insertedLead,
      message: 'Lead created successfully' 
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid lead data', details: error.format() });
    }
    return res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update a lead
leadsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const leadId = parseInt(req.params.id);
    
    if (isNaN(leadId)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }
    
    // First check if the lead exists and belongs to the user
    const [existingLead] = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, userId)
      ));
    
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found or you don\'t have permission to update it' });
    }
    
    // Update the lead, ensuring updated_at is set to now
    const updateData = {
      ...req.body,
      updated_at: new Date(),
      user_id: userId  // Ensure the user_id doesn't change
    };
    
    // Update the lead
    const [updatedLead] = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, leadId))
      .returning();
    
    return res.json({ 
      success: true, 
      lead: updatedLead,
      message: 'Lead updated successfully' 
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid lead data', details: error.format() });
    }
    return res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete a lead
leadsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const leadId = parseInt(req.params.id);
    
    if (isNaN(leadId)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }
    
    // First check if the lead exists and belongs to the user
    const [existingLead] = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, userId)
      ));
    
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found or you don\'t have permission to delete it' });
    }
    
    // Delete the lead
    await db
      .delete(leads)
      .where(eq(leads.id, leadId));
    
    return res.json({ 
      success: true, 
      message: 'Lead deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Import leads from Excel/CSV file
leadsRouter.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      // Clean up the uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Unsupported file format. Please upload Excel or CSV files only.' });
    }
    
    // Read the file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Clean up the uploaded file
    fs.unlinkSync(filePath);
    
    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'The file contains no data' });
    }
    
    const successfulImports: any[] = [];
    const failedImports: any[] = [];
    
    // Process each row
    for (const row of jsonData) {
      try {
        // Extract data from row
        const fullName = row['Full Name'] || row['Name'] || row['FullName'] || row['full_name'] || '';
        const phoneNumber = row['Phone'] || row['Phone Number'] || row['PhoneNumber'] || row['phone_number'] || '';
        const email = row['Email'] || row['email'] || '';
        const notes = row['Notes'] || row['notes'] || '';
        
        // Skip rows without required data
        if (!fullName || !phoneNumber) {
          failedImports.push({ 
            row, 
            reason: 'Missing required data (full name or phone number)' 
          });
          continue;
        }
        
        // Prepare lead data
        const leadData = {
          user_id: userId,
          full_name: fullName,
          phone_number: phoneNumber,
          email: email || null,
          notes: notes || null,
          source: 'import',
          status: LeadStatus.NEW,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        // Insert the lead
        const [insertedLead] = await db.insert(leads).values(leadData).returning();
        successfulImports.push(insertedLead);
      } catch (error) {
        console.error('Error importing lead row:', error, row);
        failedImports.push({ row, reason: 'Data validation error' });
      }
    }
    
    return res.json({
      success: true,
      message: `Imported ${successfulImports.length} leads successfully`,
      imported: successfulImports.length,
      failed: failedImports.length,
      details: {
        successful: successfulImports,
        failed: failedImports
      }
    });
  } catch (error) {
    console.error('Error importing leads:', error);
    return res.status(500).json({ error: 'Failed to import leads' });
  }
});

// Get lead statistics
leadsRouter.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Count leads by status
    const statusCounts = await db
      .select({ 
        status: leads.status, 
        count: sql<number>`count(*)` 
      })
      .from(leads)
      .where(eq(leads.user_id, userId))
      .groupBy(leads.status);
    
    // Count total leads
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.user_id, userId));
    
    // Count leads created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [recentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(
        eq(leads.user_id, userId),
        sql`${leads.created_at} >= ${thirtyDaysAgo}`
      ));
    
    // Format the results
    const statusSummary = statusCounts.reduce((acc: Record<string, number>, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});
    
    return res.json({
      total: totalCount?.count || 0,
      recent: recentCount?.count || 0,
      byStatus: statusSummary
    });
  } catch (error) {
    console.error('Error fetching lead statistics:', error);
    return res.status(500).json({ error: 'Failed to fetch lead statistics' });
  }
});

export default leadsRouter;
import { Router, Request, Response } from 'express';
import { db } from './db';
import { insertLeadCallSchema, leadCalls, leads } from '../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireUser } from './auth-middleware';
import { storage } from './storage';
import { z } from 'zod';

const leadCallsRouter = Router();

// Middleware to ensure the user is authenticated
leadCallsRouter.use(requireUser);

// Get all call records for a lead
leadCallsRouter.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const leadId = parseInt(req.params.leadId);
    
    if (isNaN(leadId)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }
    
    // First verify the lead belongs to the user
    const [userLead] = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, userId)
      ));
    
    if (!userLead) {
      return res.status(404).json({ error: 'Lead not found or you don\'t have permission to view it' });
    }

    // Get all call records for this lead
    const callRecords = await storage.getLeadCallsByLeadId(leadId);
    
    return res.json({
      calls: callRecords
    });
  } catch (error) {
    console.error('Error fetching lead call records:', error);
    return res.status(500).json({ error: 'Failed to fetch call records' });
  }
});

// Get a specific call record by ID
leadCallsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const callId = parseInt(req.params.id);
    
    if (isNaN(callId)) {
      return res.status(400).json({ error: 'Invalid call ID' });
    }
    
    // Get the call record
    const callRecord = await storage.getLeadCallById(callId);
    
    if (!callRecord) {
      return res.status(404).json({ error: 'Call record not found' });
    }
    
    // Verify the lead belongs to the user
    const [userLead] = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.id, callRecord.lead_id),
        eq(leads.user_id, userId)
      ));
    
    if (!userLead) {
      return res.status(403).json({ error: 'You don\'t have permission to view this call record' });
    }
    
    return res.json({ call: callRecord });
  } catch (error) {
    console.error('Error fetching call record:', error);
    return res.status(500).json({ error: 'Failed to fetch call record' });
  }
});

// Create a new call record (mostly used by Twilio webhook or internal processes)
leadCallsRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const validatedData = insertLeadCallSchema.parse(req.body);
    
    // Insert the call record
    const insertedCall = await storage.createLeadCall(validatedData);
    
    // If the call has a transcript, update the lead's last_contacted time
    if (insertedCall.transcript) {
      await db
        .update(leads)
        .set({ 
          last_contacted: new Date(),
          status: 'contacted' // Update status to contacted
        })
        .where(eq(leads.id, insertedCall.lead_id));
    }
    
    return res.status(201).json({ 
      success: true, 
      call: insertedCall,
      message: 'Call record created successfully' 
    });
  } catch (error) {
    console.error('Error creating call record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid call data', details: error.format() });
    }
    return res.status(500).json({ error: 'Failed to create call record' });
  }
});

// Update a call record (e.g., to add transcript after call)
leadCallsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const callId = parseInt(req.params.id);
    
    if (isNaN(callId)) {
      return res.status(400).json({ error: 'Invalid call ID' });
    }
    
    // Get the call record
    const callRecord = await storage.getLeadCallById(callId);
    
    if (!callRecord) {
      return res.status(404).json({ error: 'Call record not found' });
    }
    
    // Verify the lead belongs to the user (admin can update any call)
    if (!req.user!.isAdmin) {
      const [userLead] = await db
        .select()
        .from(leads)
        .where(and(
          eq(leads.id, callRecord.lead_id),
          eq(leads.user_id, userId)
        ));
      
      if (!userLead) {
        return res.status(403).json({ error: 'You don\'t have permission to update this call record' });
      }
    }
    
    // Update the call record
    const updatedCall = await storage.updateLeadCall(callId, req.body);
    
    // If adding a transcript, update the lead's last_contacted time
    if (req.body.transcript && updatedCall) {
      await db
        .update(leads)
        .set({ 
          last_contacted: new Date(),
          status: 'contacted' // Update status to contacted
        })
        .where(eq(leads.id, updatedCall.lead_id));
    }
    
    return res.json({ 
      success: true, 
      call: updatedCall,
      message: 'Call record updated successfully' 
    });
  } catch (error) {
    console.error('Error updating call record:', error);
    return res.status(500).json({ error: 'Failed to update call record' });
  }
});

// Delete a call record
leadCallsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const callId = parseInt(req.params.id);
    
    if (isNaN(callId)) {
      return res.status(400).json({ error: 'Invalid call ID' });
    }
    
    // Get the call record
    const callRecord = await storage.getLeadCallById(callId);
    
    if (!callRecord) {
      return res.status(404).json({ error: 'Call record not found' });
    }
    
    // Verify the lead belongs to the user (admin can delete any call)
    if (!req.user!.isAdmin) {
      const [userLead] = await db
        .select()
        .from(leads)
        .where(and(
          eq(leads.id, callRecord.lead_id),
          eq(leads.user_id, userId)
        ));
      
      if (!userLead) {
        return res.status(403).json({ error: 'You don\'t have permission to delete this call record' });
      }
    }
    
    // Delete the call record
    const deleted = await storage.deleteLeadCall(callId);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete call record' });
    }
    
    return res.json({ 
      success: true, 
      message: 'Call record deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting call record:', error);
    return res.status(500).json({ error: 'Failed to delete call record' });
  }
});

export default leadCallsRouter;
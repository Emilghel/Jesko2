import express, { Request } from "express";
import { storage } from "./storage";
import { SeoKeywordStatus, InsertSeoKeyword, InsertContentLink, User } from "@shared/schema";
import { isAuthenticated } from "./lib/auth-simple";
import { z } from "zod";

// Extend the Request interface to include user property
interface AuthenticatedRequest extends Request {
  user: User;
}

const router = express.Router();

// Create SEO validation schemas
const seoKeywordSchema = z.object({
  partnerId: z.number(),
  text: z.string().min(1, "Keyword text is required"),
  searchVolume: z.number().optional(),
  difficulty: z.number().optional(),
  status: z.enum([SeoKeywordStatus.NEW, SeoKeywordStatus.IN_PROGRESS, SeoKeywordStatus.PUBLISHED]).default(SeoKeywordStatus.NEW),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const contentLinkSchema = z.object({
  keywordId: z.number(),
  url: z.string().url("Must be a valid URL"),
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional().nullable(), // Make sure we handle null or undefined
  publishDate: z.string().optional(), // Add this field
  clicks: z.number().optional().nullable(),
  impressions: z.number().optional().nullable(),
  position: z.number().optional().nullable(),
  performance: z.object({
    clicks: z.number().optional().nullable(),
    impressions: z.number().optional().nullable(),
    position: z.number().optional().nullable(),
    lastUpdated: z.string().optional().nullable()
  }).optional().nullable()
});

// Get keywords for current partner
router.get("/my-keywords", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    
    // Get the partner associated with the current user
    const partner = await storage.getPartnerByUserId(userId);
    
    if (!partner) {
      return res.status(403).json({ error: "You are not registered as a partner" });
    }
    
    const keywords = await storage.getSeoKeywordsByPartnerId(partner.id);
    return res.json(keywords);
  } catch (error) {
    console.error("Error fetching partner SEO keywords:", error);
    return res.status(500).json({ error: "Failed to fetch SEO keywords" });
  }
});

// Make sure the links routes come before the generic routes
// Update a content link directly by ID
router.put("/links/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const linkId = parseInt(req.params.id);
    const link = await storage.getContentLinkById(linkId);
    
    if (!link) {
      return res.status(404).json({ error: "Content link not found" });
    }
    
    // Get the keyword to verify ownership
    const keyword = await storage.getSeoKeywordById(link.keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Associated keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to update this content link" });
    }
    
    // Validate the update data
    const validation = contentLinkSchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }
    
    const updateData = validation.data;
    
    // Ensure keywordId cannot be changed
    if (updateData.keywordId && updateData.keywordId !== link.keywordId) {
      return res.status(400).json({ error: "Keyword ID cannot be changed" });
    }
    
    const updatedLink = await storage.updateContentLink(linkId, updateData);
    return res.json(updatedLink);
  } catch (error) {
    console.error("Error updating content link:", error);
    return res.status(500).json({ error: "Failed to update content link" });
  }
});

// Get all SEO keywords for a partner
router.get("/:partnerId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const partnerId = parseInt(req.params.partnerId);
    
    // Verify that the authenticated user is either an admin or the partner in question
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to access these keywords" });
    }
    
    const keywords = await storage.getSeoKeywordsByPartnerId(partnerId);
    return res.json(keywords);
  } catch (error) {
    console.error("Error fetching SEO keywords:", error);
    return res.status(500).json({ error: "Failed to fetch SEO keywords" });
  }
});

// Get a specific SEO keyword by ID
router.get("/keyword/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    const keyword = await storage.getSeoKeywordById(keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to access this keyword" });
    }
    
    // Include content links for this keyword
    const contentLinks = await storage.getContentLinksByKeywordId(keywordId);
    
    return res.json({
      ...keyword,
      contentLinks
    });
  } catch (error) {
    console.error("Error fetching SEO keyword:", error);
    return res.status(500).json({ error: "Failed to fetch SEO keyword" });
  }
});

// Create a new SEO keyword
router.post("/", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    // Get the partner associated with the current user
    const partner = await storage.getPartnerByUserId(req.user.id);
    
    if (!partner && !req.user.isAdmin) {
      return res.status(403).json({ error: "You are not registered as a partner" });
    }
    
    // If partnerId is not provided in the request, use the current user's partner ID
    const requestData = {
      ...req.body,
      partnerId: req.body.partnerId || (partner ? partner.id : null)
    };
    
    console.log("Creating SEO keyword with data:", requestData);
    
    const validation = seoKeywordSchema.safeParse(requestData);
    
    if (!validation.success) {
      console.error("Validation errors:", validation.error.format());
      return res.status(400).json({ 
        errors: validation.error.format(),
        requestData: requestData
      });
    }
    
    const keywordData = validation.data;
    
    // Verify that the authenticated user is either an admin or the partner in question
    const isAdmin = req.user?.isAdmin;
    const isPartner = partner && partner.id === keywordData.partnerId;
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to create keywords for this partner" });
    }
    
    const newKeyword = await storage.createSeoKeyword(keywordData as InsertSeoKeyword);
    return res.status(201).json(newKeyword);
  } catch (error) {
    console.error("Error creating SEO keyword:", error);
    return res.status(500).json({ error: "Failed to create SEO keyword" });
  }
});

// Get a single keyword by ID (direct ID without partnerId)
router.get("/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    console.log(`Fetching keyword with ID: ${keywordId}`);
    
    const keyword = await storage.getSeoKeywordById(keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to view this keyword" });
    }
    
    return res.json(keyword);
  } catch (error) {
    console.error(`Error fetching keyword by ID:`, error);
    return res.status(500).json({ error: "Failed to fetch keyword" });
  }
});

// Update an SEO keyword
router.put("/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    const keyword = await storage.getSeoKeywordById(keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to update this keyword" });
    }
    
    const validation = seoKeywordSchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }
    
    const keywordData = validation.data;
    
    // Ensure partnerId cannot be changed
    if (keywordData.partnerId && keywordData.partnerId !== keyword.partnerId) {
      return res.status(400).json({ error: "Partner ID cannot be changed" });
    }
    
    const updatedKeyword = await storage.updateSeoKeyword(keywordId, keywordData);
    return res.json(updatedKeyword);
  } catch (error) {
    console.error("Error updating SEO keyword:", error);
    return res.status(500).json({ error: "Failed to update SEO keyword" });
  }
});

// Update an SEO keyword with partnerId in URL
router.put("/:partnerId/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    const partnerId = parseInt(req.params.partnerId);

    console.log(`Updating keyword ${keywordId} for partner ${partnerId}`);

    // Check if the keyword exists
    const keyword = await storage.getSeoKeywordById(keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner with the requested partnerId
    const isAdmin = req.user?.isAdmin;
    const isRequestedPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === partnerId);
    
    if (!isAdmin && !isRequestedPartner) {
      return res.status(403).json({ error: "Not authorized to update keywords for this partner" });
    }
    
    // Make sure the keyword actually belongs to the partner in the URL
    if (keyword.partnerId !== partnerId) {
      return res.status(403).json({ error: "This keyword does not belong to the specified partner" });
    }
    
    // Validate the request body
    const validation = seoKeywordSchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return res.status(400).json({ errors: validation.error.format() });
    }
    
    const keywordData = validation.data;
    
    // Ensure partnerId cannot be changed
    if (keywordData.partnerId && keywordData.partnerId !== keyword.partnerId) {
      return res.status(400).json({ error: "Partner ID cannot be changed" });
    }
    
    const updatedKeyword = await storage.updateSeoKeyword(keywordId, keywordData);
    return res.json(updatedKeyword);
  } catch (error) {
    console.error("Error updating SEO keyword:", error);
    return res.status(500).json({ error: "Failed to update SEO keyword" });
  }
});

// Delete an SEO keyword
router.delete("/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    const keyword = await storage.getSeoKeywordById(keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to delete this keyword" });
    }
    
    const success = await storage.deleteSeoKeyword(keywordId);
    
    if (success) {
      return res.status(204).send();
    } else {
      return res.status(500).json({ error: "Failed to delete SEO keyword" });
    }
  } catch (error) {
    console.error("Error deleting SEO keyword:", error);
    return res.status(500).json({ error: "Failed to delete SEO keyword" });
  }
});

// Create a new content link for a keyword
router.post("/keyword/:id/links", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    const keyword = await storage.getSeoKeywordById(keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to add content links to this keyword" });
    }
    
    // Validate the content link data
    const validation = contentLinkSchema.safeParse({
      ...req.body,
      keywordId // Ensure the keywordId from the URL is used
    });
    
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
    }
    
    const linkData = validation.data;
    
    const newLink = await storage.createContentLink(linkData as InsertContentLink);
    return res.status(201).json(newLink);
  } catch (error) {
    console.error("Error creating content link:", error);
    return res.status(500).json({ error: "Failed to create content link" });
  }
});

// Get all content links for a keyword
router.get("/keyword/:id/links", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    const keyword = await storage.getSeoKeywordById(keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to view content links for this keyword" });
    }
    
    const links = await storage.getContentLinksByKeywordId(keywordId);
    return res.json(links);
  } catch (error) {
    console.error("Error fetching content links:", error);
    return res.status(500).json({ error: "Failed to fetch content links" });
  }
});

// (Removed duplicate route declaration)

// Delete a content link
router.delete("/links/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const linkId = parseInt(req.params.id);
    const link = await storage.getContentLinkById(linkId);
    
    if (!link) {
      return res.status(404).json({ error: "Content link not found" });
    }
    
    // Get the keyword to verify ownership
    const keyword = await storage.getSeoKeywordById(link.keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Associated keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to delete this content link" });
    }
    
    const success = await storage.deleteContentLink(linkId);
    
    if (success) {
      return res.status(204).send();
    } else {
      return res.status(500).json({ error: "Failed to delete content link" });
    }
  } catch (error) {
    console.error("Error deleting content link:", error);
    return res.status(500).json({ error: "Failed to delete content link" });
  }
});

// Get performance history for a content link
router.get("/links/:id/history", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const linkId = parseInt(req.params.id);
    const link = await storage.getContentLinkById(linkId);
    
    if (!link) {
      return res.status(404).json({ error: "Content link not found" });
    }
    
    // Get the keyword to verify ownership
    const keyword = await storage.getSeoKeywordById(link.keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: "Associated keyword not found" });
    }
    
    // Verify that the authenticated user is either an admin or the partner who owns this keyword
    const isAdmin = req.user?.isAdmin;
    const isPartner = await storage.getPartnerByUserId(req.user.id)
      .then(partner => partner?.id === keyword.partnerId);
    
    if (!isAdmin && !isPartner) {
      return res.status(403).json({ error: "Not authorized to view performance history for this content link" });
    }
    
    const history = await storage.getContentPerformanceHistory(linkId);
    return res.json(history);
  } catch (error) {
    console.error("Error fetching performance history:", error);
    return res.status(500).json({ error: "Failed to fetch performance history" });
  }
});

export default router;
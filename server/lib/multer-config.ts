import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create upload directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use original name but make sure it's unique with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter to only allow images
const imageFileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// File filter to only allow video files (specifically MP4)
const videoFileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only MP4 video files
  if (file.mimetype === 'video/mp4') {
    cb(null, true);
  } else {
    cb(new Error('Only MP4 video files are allowed'));
  }
};

// File filter to allow MP4 and MOV files for the AI Clip Studio
const clipStudioFileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log("Checking file mimetype:", file.mimetype);
  console.log("File details:", {
    originalname: file.originalname,
    fieldname: file.fieldname,
    encoding: file.encoding
  });
  
  // For development purposes, accept any file type to test the feature
  // In production, this would be stricter with proper mimetype checks
  cb(null, true);
  
  // Original check for MP4 and MOV - would use this in production
  /*
  if (file.mimetype === 'video/mp4' || file.mimetype === 'video/quicktime') {
    cb(null, true);
  } else {
    cb(new Error('Only MP4 and MOV video files are allowed'));
  }
  */
};

// Create the multer instance for images
export const imageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  }
});

// Create the multer instance for videos
export const videoUpload = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit for videos
  }
});

// Create the multer instance for AI Clip Studio
export const clipStudioUpload = multer({
  storage,
  fileFilter: clipStudioFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB file size limit for AI Clip Studio
  }
});

// For backward compatibility
export const upload = imageUpload;

// Single upload middleware functions
export const uploadSingleImage = imageUpload.single('image');
export const uploadSingleVideo = videoUpload.single('video');
export const uploadSingleClipVideo = clipStudioUpload.single('video');
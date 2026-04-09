// ── Multer Upload Configuration ──────────────────
// Configures multer for image uploads and spreadsheet uploads.

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Image upload config ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ── Spreadsheet upload config ──
const spreadsheetUpload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'                           // some systems send csv as text/plain
    ];
    if (allowed.includes(file.mimetype) ||
        file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files (.csv, .xlsx, .xls) are allowed'), false);
    }
  }
});

// Graceful handler for multer errors (e.g., file too large, invalid mime)
function multerErrorHandler(err, req, res, next) {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

module.exports = { upload, spreadsheetUpload, multerErrorHandler, uploadsDir };

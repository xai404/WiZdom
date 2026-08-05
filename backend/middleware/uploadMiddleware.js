const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

// Mimetype and extension are both attacker-controlled (multer trusts the
// client verbatim), so both must match — and SVG is excluded even though
// it's a real image type, since it can embed <script>.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('Only JPG, PNG, GIF, or WEBP images are allowed'));
  }
  cb(null, true);
};

// Disk-storage multer instance scoped to a subfolder under backend/uploads/,
// served statically at /uploads (see app.js). Used for profile pictures etc.
const createUploader = (subfolder) => {
  const destination = path.join(UPLOADS_ROOT, subfolder);
  fs.mkdirSync(destination, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
      // imageFileFilter already validated this extension.
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });

  return multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 },
  });
};

const employeeUpload = createUploader('employees');
const profileUpload = createUploader('profiles');

// Magic-byte checks — extension/mimetype are just metadata; this confirms
// the actual file content is a real image.
const isPng = (buf) => buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const isJpeg = (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
const isGif = (buf) => buf.length >= 6 && buf.subarray(0, 4).toString('ascii') === 'GIF8';
const isWebp = (buf) =>
  buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';

// Chain after employeeUpload/profileUpload.single(...). Deletes and
// rejects with 400 on a mismatch.
const verifyUploadedImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const fd = await fs.promises.open(req.file.path, 'r');
    const buf = Buffer.alloc(12);
    await fd.read(buf, 0, 12, 0);
    await fd.close();

    if (isPng(buf) || isJpeg(buf) || isGif(buf) || isWebp(buf)) {
      return next();
    }

    await fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ success: false, message: 'File content does not match a valid image format' });
  } catch {
    await fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ success: false, message: 'Could not verify the uploaded file' });
  }
};

module.exports = { createUploader, employeeUpload, profileUpload, verifyUploadedImage };

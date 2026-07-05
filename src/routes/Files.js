const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');
const { pipeline } = require('stream/promises');

const File = require('../models/File');
const { resp } = require('../func/misc');

// -------------------------------------------------------------------------- //

function buildFormData(fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
  }
  return form;
}

// -------------------------------------------------------------------------- //

const jobs = new Map();
const router = express.Router();
const STORAGE_DIR = path.join(process.cwd(), 'files');

for (const dir of [STORAGE_DIR, `${STORAGE_DIR}/temp`]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const upload = multer({
  dest: `${STORAGE_DIR}/temp`,
  limits: { fileSize: 100 * 1024 * 1024 },
});

function validateFileId(fileId) {
  return /^[0-9a-f]{24}$/.test(fileId)
}

function requireServiceToken(req, res, next) {
  if (req.token.actor !== 'service') return resp(res, 403, 'Forbidden');
  next();
}

// -------------------------------------------------------------------------- //

async function serveFile(req, res, prefix = '') {
  const { fileId } = req.params;

  const filePath = path.join(STORAGE_DIR, prefix, fileId);
  const fileName = jobs.get(fileId)?.file?.originalname ?? `${fileId}.pdf`;

  if (!validateFileId(fileId) || !fs.existsSync(filePath)) {
    return resp(res, 404, 'File Not Found');
  }

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const readStream = fs.createReadStream(filePath);
  readStream.on('error', () => res.destroy());

  return readStream.pipe(res);
}

router.get('/:fileId', (req, res) => serveFile(req, res));
router.get('/temp/:fileId', requireServiceToken, (req, res) => serveFile(req, res, 'temp'));

// -------------------------------------------------------------------------- //

router.put('/:fileId', requireServiceToken, async (req, res) => {
  const { fileId } = req.params;
  if (!validateFileId(fileId)) return resp(res, 404, 'File Not Found');

  const promise = jobs.get(fileId);
  const filePath = path.join(STORAGE_DIR, 'temp', fileId);

  await pipeline(req, fs.createWriteStream(filePath));

  if (promise) {
    jobs.delete(fileId);
    promise.resolve(fileId);
  }

  return resp(res, 200, 'Updated File Successfully', { fileId });
});

// -------------------------------------------------------------------------- //

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return resp(res, 400, 'no file provided');

  if (req.file.mimetype !== 'application/pdf') {
    const promise = new Promise((resolve, reject) => {
      jobs.set(req.file.filename, { resolve, reject, file: req.file })
    });

    await fetch(`${process.env.GOTENBERG_URL}/forms/libreoffice/convert`, {
      method: 'POST',
      headers: {
        'Gotenberg-Webhook-Url': `${process.env.INTERNAL_URL}/api/files/${req.file.filename}`,
        'Gotenberg-Webhook-Error-Url': `${process.env.INTERNAL_URL}/api/files/${req.file.filename}`,
        'Gotenberg-Webhook-Method': 'PUT',
        'Gotenberg-Webhook-Error-Method': 'PUT',
        'Gotenberg-Webhook-Extra-Http-Headers': JSON.stringify({
          'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`
        })
      },
      body: buildFormData({
        downloadFrom: [{
          url: `${process.env.INTERNAL_URL}/api/files/temp/${req.file.filename}`,
          extraHttpHeaders: { 'Authorization': `Bearer ${process.env.SERVICE_TOKEN}` }
        }]
      })
    });

    await promise;
  }

  const response = await fetch(`${process.env.GOTENBERG_URL}/forms/pdfengines/metadata/read`, {
    method: 'POST',
    body: buildFormData({
      downloadFrom: [{
        url: `${process.env.INTERNAL_URL}/api/files/temp/${req.file.filename}`,
        extraHttpHeaders: { 'Authorization': `Bearer ${process.env.SERVICE_TOKEN}` }
      }]
    })
  });

  const metadata = Object.values(await response.json())[0];

  const file = await File.create({
    uploadedBy: req.token.uid,
    numberOfPages: metadata.PageCount,
    originalName: req.file.originalname,
  })

  await file.populate('uploadedBy', 'name number');
  fs.renameSync(req.file.path, path.join(STORAGE_DIR, file._id.toString()));

  return resp(res, 201, 'file uploaded', { file });
});

// -------------------------------------------------------------------------- //

module.exports = router;
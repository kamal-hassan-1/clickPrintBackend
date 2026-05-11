const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');
const { pipeline } = require('stream/promises');

const File = require('../models/File');

const { resp } = require('../func');
const { buildFormData } = require('../func');
const { jwtAuth, keyAuth } = require('../func');

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
  return /^[0-9a-f]{32}$/.test(fileId)
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

router.get('/:fileId', jwtAuth, (req, res) => serveFile(req, res));
router.get('/temp/:fileId', keyAuth, (req, res) => serveFile(req, res, 'temp'));

// -------------------------------------------------------------------------- //

router.put('/:fileId', keyAuth, async (req, res) => {
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

router.post('/', jwtAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return resp(res, 400, 'No File Provided');

  if (req.file.mimetype !== 'application/pdf') {
    const promise = new Promise((resolve, reject) => {
      jobs.set(req.file.filename, { resolve, reject, file: req.file })
    });

    await fetch(`${process.env.GOTENBERG_URI}/forms/libreoffice/convert`, {
      method: 'POST',
      headers: {
        'Gotenberg-Webhook-Url': `${process.env.ABSOLUTE_URI}/api/files/${req.file.filename}`,
        'Gotenberg-Webhook-Error-Url': `${process.env.ABSOLUTE_URI}/api/files/${req.file.filename}`,
        'Gotenberg-Webhook-Method': 'PUT',
        'Gotenberg-Webhook-Error-Method': 'PUT',
        'Gotenberg-Webhook-Extra-Http-Headers': JSON.stringify({
          'Authorization': `Apikey ${process.env.API_KEY}`
        })
      },
      body: buildFormData({
        downloadFrom: [{
          url: `${process.env.ABSOLUTE_URI}/api/files/temp/${req.file.filename}`,
          extraHttpHeaders: { 'Authorization': `Apikey ${process.env.API_KEY}` }
        }]
      })
    });

    await promise;
  }

  const response = await fetch(`${process.env.GOTENBERG_URI}/forms/pdfengines/metadata/read`, {
    method: 'POST',
    body: buildFormData({
      downloadFrom: [{
        url: `${process.env.ABSOLUTE_URI}/api/files/temp/${req.file.filename}`,
        extraHttpHeaders: { 'Authorization': `Apikey ${process.env.API_KEY}` }
      }]
    })
  });

  const metadata = Object.values(await response.json())[0];

  fs.renameSync(req.file.path, path.join(STORAGE_DIR, req.file.filename));

  await File.create({
    fileId: req.file.filename,
    uploadedBy: req.user._id,
    numberOfPages: metadata.PageCount,
    originalName: req.file.originalname,
  });

  return resp(res, 201, 'File Uploaded Successfully', { fileId: req.file.filename });
});

// -------------------------------------------------------------------------- //

module.exports = router;

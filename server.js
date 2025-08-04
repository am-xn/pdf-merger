const express = require('express');
const fileUpload = require('express-fileupload');
const libre = require('libreoffice-convert');
const path = require('path');

const app = express();
app.use(fileUpload());

// Office to PDF conversion endpoint
app.post('/convert', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('No file uploaded');
  }

  const file = req.files.file;
  const ext = path.extname(file.name).toLowerCase();

  // Validate file type
  if (!['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) {
    return res.status(400).send('Unsupported file type');
  }

  libre.convert(file.data, '.pdf', undefined, (err, pdfBuffer) => {
    if (err) {
      return res.status(500).send('Conversion failed');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));
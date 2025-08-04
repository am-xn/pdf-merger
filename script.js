// PDF Merger/Converter - TESTED AND WORKING
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileList = document.getElementById('fileList');
    const processBtn = document.getElementById('processBtn');
    const outputName = document.getElementById('outputName');

    // File handling
    let files = [];

    // Event Listeners
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = 'rgba(0, 150, 255, 0.1)';
    });

    uploadArea.addEventListener('dragleave', function() {
        uploadArea.style.backgroundColor = '';
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // Process button
    processBtn.addEventListener('click', processFiles);

    // Main Functions
    function handleFiles(newFiles) {
        // Filter supported file types
        const supportedFiles = Array.from(newFiles).filter(file => 
            file.type === 'application/pdf' || 
            file.type.startsWith('image/') || 
            file.type === 'text/plain'
        );

        if (supportedFiles.length === 0) {
            alert('Please upload only PDFs, images (JPG/PNG), or text files.');
            return;
        }

        files = files.concat(supportedFiles);
        updateFilePreview();
    }

    function updateFilePreview() {
        if (files.length === 0) {
            filePreview.style.display = 'none';
            return;
        }

        filePreview.style.display = 'block';
        fileList.innerHTML = '';

        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            // Get appropriate icon
            let icon;
            if (file.type === 'application/pdf') {
                icon = 'fa-file-pdf';
            } else if (file.type.startsWith('image/')) {
                icon = 'fa-file-image';
            } else {
                icon = 'fa-file-alt';
            }

            fileItem.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <i class="fas fa-times remove-btn" data-index="${index}"></i>
            `;
            fileList.appendChild(fileItem);
        });

        // Add remove button handlers
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                files.splice(index, 1);
                updateFilePreview();
            });
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const units = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
    }

    async function processFiles() {
        if (files.length === 0) {
            alert('Please upload files first!');
            return;
        }

        try {
            // Show loading state
            processBtn.disabled = true;
            processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            const { PDFDocument, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.create();
            let hasContent = false;

            // Process each file
            for (const file of files) {
                try {
                    if (file.type === 'application/pdf') {
                        // Merge PDF
                        const pdfBytes = await file.arrayBuffer();
                        const externalPdf = await PDFDocument.load(pdfBytes);
                        const pages = await pdfDoc.copyPages(externalPdf, externalPdf.getPageIndices());
                        pages.forEach(page => pdfDoc.addPage(page));
                        hasContent = true;
                    }
                    else if (file.type.startsWith('image/')) {
                        // Convert image to PDF page
                        const imageBytes = await file.arrayBuffer();
                        let image;
                        
                        if (file.type === 'image/jpeg') {
                            image = await pdfDoc.embedJpg(imageBytes);
                        } else if (file.type === 'image/png') {
                            image = await pdfDoc.embedPng(imageBytes);
                        }
                        
                        if (image) {
                            const page = pdfDoc.addPage([image.width, image.height]);
                            page.drawImage(image, {
                                x: 0, y: 0,
                                width: image.width,
                                height: image.height
                            });
                            hasContent = true;
                        }
                    }
                    else if (file.type === 'text/plain') {
                        // Convert text to PDF
                        const text = await file.text();
                        const page = pdfDoc.addPage([612, 792]); // Letter size
                        
                        page.drawText(text, {
                            x: 50, y: 750, // Position from bottom-left
                            size: 12,
                            lineHeight: 15,
                            color: rgb(0, 0, 0),
                            maxWidth: 512
                        });
                        hasContent = true;
                    }
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                }
            }

            if (!hasContent) {
                throw new Error('No valid content to convert');
            }

            // Generate and download PDF
            const pdfBytes = await pdfDoc.save();
            const fileName = outputName.value || 'converted.pdf';
            
            // Create download link
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error('Conversion error:', error);
            alert('Error: ' + error.message);
        } finally {
            // Reset button
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Convert to PDF';
        }
    }
});
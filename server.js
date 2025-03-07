const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = 5000;

// SQLite-Datenbank initialisieren
const db = new sqlite3.Database('./material.db');

// Multer konfigurieren
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Generate a secure random filename
        crypto.randomBytes(16, (err, buf) => {
            if (err) return cb(err);
            const filename = buf.toString('hex') + path.extname(file.originalname);
            cb(null, filename);
        });
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Für Formulardaten
app.use(express.static(path.join(__dirname, 'frontend')));

// Create CSRF token middleware
function generateCSRFToken(req, res, next) {
    if (!req.session) {
        req.session = {};
    }
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
}

// Verify CSRF token middleware
function verifyCSRFToken(req, res, next) {
    const token = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
        return res.status(403).json({ error: 'CSRF token validation failed' });
    }
    next();
}

// GET: Alle Materialien abrufen
app.get('/materialien', (req, res) => {
    // Extract query parameters for filtering
    const { klasse, fach, materialform, thema, search } = req.query;
    
    let sql = 'SELECT * FROM materialien';
    let whereConditions = [];
    let params = [];
    
    // Add filtering conditions if provided
    if (klasse) {
        whereConditions.push('klasse LIKE ?');
        params.push(`%${klasse}%`);
    }
    
    if (fach) {
        whereConditions.push('fach LIKE ?');
        params.push(`%${fach}%`);
    }
    
    if (materialform) {
        whereConditions.push('materialform LIKE ?');
        params.push(`%${materialform}%`);
    }
    
    if (thema) {
        whereConditions.push('thema LIKE ?');
        params.push(`%${thema}%`);
    }
    
    if (search) {
        whereConditions.push('(titel LIKE ? OR beschreibung LIKE ? OR thema LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        res.json(rows);
    });
});

// POST: Material hochladen
app.post('/upload', upload.single('datei'), (req, res) => {
    const { klasse, fach, materialform, thema, titel, beschreibung, autor } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    // Validate input
    if (!titel || !fach || !klasse || !materialform || !thema) {
        return res.status(400).json({ error: 'Fehlende Pflichtfelder' });
    }

    const dateiPfad = req.file.filename; // Generierter Dateiname durch Multer
    const originalDateiname = req.file.originalname; // Originaler Dateiname

    const sql = `INSERT INTO materialien 
        (klasse, fach, materialform, thema, titel, beschreibung, dateiPfad, originalDateiname, autor, datum) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        klasse,
        fach,
        materialform,
        thema,
        titel,
        beschreibung || null,
        dateiPfad,
        originalDateiname,
        autor || 'Unbekannt', // Standardwert, falls nicht angegeben
        new Date().toISOString() // Current date
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Database error during insert:', err);
            return res.status(500).json({ error: 'Fehler beim Speichern in der Datenbank' });
        }
        res.status(200).json({ message: 'Erfolgreich hochgeladen', id: this.lastID });
    });
});

// GET: Material herunterladen
app.get('/download/:id', (req, res) => {
    const materialId = req.params.id;

    const sql = 'SELECT * FROM materialien WHERE id = ?';
    db.get(sql, [materialId], (err, row) => {
        if (err) {
            console.error('Database error during download:', err);
            return res.status(500).json({ error: 'Fehler beim Abrufen des Materials' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Material nicht gefunden' });
        }

        const filePath = path.join(__dirname, 'uploads', row.dateiPfad); // Dateipfad aus DB
        const originalName = row.originalDateiname; // Originaler Dateiname

        // Prüfen, ob die Datei existiert
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error('File not found:', filePath, err);
                return res.status(404).json({ error: 'Datei nicht gefunden' });
            }

            // Datei als Download senden
            res.download(filePath, originalName, (err) => {
                if (err) {
                    console.error('Error during download:', err);
                    if (!res.headersSent) {
                        return res.status(500).json({ error: 'Fehler beim Herunterladen der Datei' });
                    }
                }
            });
        });
    });
});

// Material löschen
app.delete('/materialien/:id', (req, res) => {
    const materialId = req.params.id;

    // Datenbankeintrag abrufen
    db.get('SELECT * FROM materialien WHERE id = ?', [materialId], (err, row) => {
        if (err) {
            console.error('Database error during material retrieval:', err);
            return res.status(500).json({ error: 'Fehler beim Abrufen des Materials' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Material nicht gefunden' });
        }

        // Datei löschen
        const filePath = path.join(__dirname, 'uploads', row.dateiPfad);
        fs.stat(filePath, (statErr, stats) => {
            if (statErr) {
                console.warn(`File not found or not accessible: ${filePath}`, statErr);
                // Continue to database deletion even if file is missing
                deleteFromDatabase();
                return;
            }
            
            // File exists, try to delete it
            fs.unlink(filePath, unlinkErr => {
                if (unlinkErr) {
                    console.error(`Could not delete file: ${filePath}`, unlinkErr);
                    // Continue with database deletion if file cannot be deleted (file in use, etc.)
                }
                deleteFromDatabase();
            });
        });
        
        function deleteFromDatabase() {
            // Datenbankeintrag löschen
            db.run('DELETE FROM materialien WHERE id = ?', [materialId], deleteErr => {
                if (deleteErr) {
                    console.error('Database error during deletion:', deleteErr);
                    return res.status(500).json({ error: 'Fehler beim Löschen des Datenbankeintrags' });
                }
                res.status(200).json({ message: 'Material und Datei erfolgreich gelöscht' });
            });
        }
    });
});

// Add this to your server.js file
app.post('/download-all', (req, res) => {
    const filters = req.body.filter;
    
    // Query the database with the filters
    let sql = 'SELECT * FROM materialien';
    let whereConditions = [];
    let params = [];
    
    // Build the WHERE clause based on filters
    if (filters && Object.keys(filters).length > 0) {
        sql += ' WHERE ';
        // Column mapping to database fields
        const columnMapping = {
            0: 'titel',
            1: 'klasse',
            2: 'fach',
            3: 'thema',
            4: 'materialform'
        };
        
        Object.keys(filters).forEach(columnIndex => {
            if (filters[columnIndex]) {
                whereConditions.push(`${columnMapping[columnIndex]} LIKE ?`);
                params.push(`%${filters[columnIndex]}%`);
            }
        });
        
        sql += whereConditions.join(' AND ');
    }
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Database error during bulk download:', err);
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        
        // If no materials found
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Keine Materialien gefunden' });
        }
        
        // Create a temporary zip file
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempZipPath = path.join(tempDir, `download_${Date.now()}.zip`);
        
        const output = fs.createWriteStream(tempZipPath);
        
        output.on('close', function() {
            console.log(`Archive created: ${tempZipPath}, size: ${archive.pointer()} bytes`);
            res.download(tempZipPath, 'materialien.zip', (err) => {
                // Delete the temp file after download
                fs.unlink(tempZipPath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error deleting temp file:', unlinkErr);
                    }
                });
                
                if (err && !res.headersSent) {
                    console.error('Error sending zip file:', err);
                    return res.status(500).json({ error: 'Fehler beim Senden der Datei' });
                }
            });
        });
        
        archive.on('error', function(err) {
            console.error('Error creating zip archive:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Fehler beim Erstellen des Zip-Archivs' });
            }
        });
        
        archive.pipe(output);
        
        // Add files to the zip with error handling
        let fileCount = 0;
        rows.forEach(material => {
            const filePath = path.join(__dirname, 'uploads', material.dateiPfad);
            // Check if file exists before adding
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: material.originalDateiname });
                fileCount++;
            } else {
                console.warn(`File not found, skipping: ${filePath}`);
            }
        });
        
        if (fileCount === 0) {
            archive.destroy();
            return res.status(404).json({ error: 'Keine Dateien zum Herunterladen gefunden' });
        }
        
        archive.finalize();
    });
});

app.get('/singleview/:id', (req, res) => {
    const id = req.params.id;
    res.sendFile(path.join(__dirname, 'frontend/singleview/single.html'));
});

// GET: Einzelansicht für ein Material
app.get('/materialien/:id', (req, res) => {
    const materialId = req.params.id;

    const sql = 'SELECT * FROM materialien WHERE id = ?';
    db.get(sql, [materialId], (err, row) => {
        if (err) {
            console.error('Database error during retrieval:', err);
            return res.status(500).json({ error: 'Serverfehler' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Material nicht gefunden' });
        }

        res.json(row);
    });
});

// PUT: Update material
app.put('/materialien/:id', upload.single('datei'), (req, res) => {
    const materialId = req.params.id;
    const { klasse, fach, materialform, thema, titel, beschreibung, autor, dateiPfad, originalDateiname } = req.body;
    
    // Validate required fields
    if (!titel || !fach || !klasse || !materialform || !thema) {
        return res.status(400).json({ error: 'Fehlende Pflichtfelder' });
    }
    
    // First, get the current record to check if we need to delete the old file
    db.get('SELECT * FROM materialien WHERE id = ?', [materialId], (err, oldRecord) => {
        if (err) {
            console.error('Error fetching record:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!oldRecord) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        let newFilePath = oldRecord.dateiPfad;
        let newOriginalName = oldRecord.originalDateiname;
        
        // If a new file was uploaded, use its info and delete the old file
        if (req.file) {
            newFilePath = req.file.filename;
            newOriginalName = req.file.originalname;
            
            // Delete the old file if it exists
            const oldFilePath = path.join(__dirname, 'uploads', oldRecord.dateiPfad);
            fs.stat(oldFilePath, (statErr, stats) => {
                if (statErr) {
                    console.warn(`Old file not found or not accessible during update: ${oldFilePath}`, statErr);
                } else {
                    fs.unlink(oldFilePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.warn(`Could not delete old file during update: ${oldFilePath}`, unlinkErr);
                        }
                    });
                }
            });
        } else if (dateiPfad && originalDateiname) {
            // If dateiPfad and originalDateiname were provided in the request body
            // (usually when no new file is uploaded but we want to keep the old one)
            newFilePath = dateiPfad;
            newOriginalName = originalDateiname;
        }
        
        // Update the database record
        const sql = `UPDATE materialien SET 
            klasse = ?, 
            fach = ?, 
            materialform = ?, 
            thema = ?, 
            titel = ?, 
            beschreibung = ?, 
            dateiPfad = ?, 
            originalDateiname = ?,
            autor = ? 
            WHERE id = ?`;
            
        const params = [
            klasse,
            fach, 
            materialform,
            thema,
            titel,
            beschreibung || oldRecord.beschreibung,
            newFilePath,
            newOriginalName,
            autor || oldRecord.Autor,
            materialId
        ];
        
        db.run(sql, params, function(updateErr) {
            if (updateErr) {
                console.error('Error updating record:', updateErr);
                return res.status(500).json({ error: updateErr.message });
            }
            
            res.status(200).json({ 
                message: 'Material successfully updated', 
                id: materialId,
                changes: this.changes
            });
        });
    });
});

// Create database indices for better performance
function createDatabaseIndices() {
    console.log('Creating database indices for better performance...');
    
    const indices = [
        'CREATE INDEX IF NOT EXISTS idx_materialien_klasse ON materialien(klasse)',
        'CREATE INDEX IF NOT EXISTS idx_materialien_fach ON materialien(fach)',
        'CREATE INDEX IF NOT EXISTS idx_materialien_materialform ON materialien(materialform)',
        'CREATE INDEX IF NOT EXISTS idx_materialien_thema ON materialien(thema)',
        'CREATE INDEX IF NOT EXISTS idx_materialien_titel ON materialien(titel)'
    ];
    
    indices.forEach(indexSql => {
        db.run(indexSql, err => {
            if (err) {
                console.error(`Error creating index: ${indexSql}`, err);
            }
        });
    });
}

// Auf Port hören
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
    createDatabaseIndices();
});
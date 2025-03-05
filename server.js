const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = 5000;

// SQLite-Datenbank initialisieren
const db = new sqlite3.Database('./material.db');

// Multer konfigurieren
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Für Formulardaten
app.use(express.static(path.join(__dirname, 'frontend')));

// GET: Alle Materialien abrufen
app.get('/materialien', (req, res) => {
    db.all('SELECT * FROM materialien', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        res.json(rows);
    });
});

// POST: Material hochladen
app.post('/upload', upload.single('datei'), (req, res) => {
    const { klasse, fach, materialform, thema, titel, beschreibung, autor, datum } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
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
        datum || new Date().toISOString() // Standardwert, falls nicht angegeben
    ];

    db.run(sql, params, function (err) {
        if (err) {
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
                return res.status(404).json({ error: 'Datei nicht gefunden' });
            }

            // Datei als Download senden
            res.download(filePath, originalName, (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Fehler beim Herunterladen der Datei' });
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
            return res.status(500).json({ error: 'Fehler beim Abrufen des Materials' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Material nicht gefunden' });
        }

        // Datei löschen
        const filePath = path.join(__dirname, 'uploads', row.dateiPfad);
        fs.unlink(filePath, unlinkErr => {
            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                return res.status(500).json({ error: 'Fehler beim Löschen der Datei' });
            }

            // Datenbankeintrag löschen
            db.run('DELETE FROM materialien WHERE id = ?', [materialId], deleteErr => {
                if (deleteErr) {
                    return res.status(500).json({ error: 'Fehler beim Löschen des Datenbankeintrags' });
                }

                res.status(200).json({ message: 'Material und Datei erfolgreich gelöscht' });
            });
        });
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
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        
        // If no materials found
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Keine Materialien gefunden' });
        }
        
        // Create a temporary zip file
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        const tempZipPath = path.join(__dirname, 'temp', `download_${Date.now()}.zip`);
        
        const output = fs.createWriteStream(tempZipPath);
        
        output.on('close', function() {
            res.download(tempZipPath, 'materialien.zip', (err) => {
                // Delete the temp file after download
                fs.unlink(tempZipPath, () => {});
            });
        });
        
        archive.on('error', function(err) {
            res.status(500).json({ error: 'Fehler beim Erstellen des Zip-Archivs' });
        });
        
        archive.pipe(output);
        
        // Add files to the zip
        rows.forEach(material => {
            const filePath = path.join(__dirname, 'uploads', material.dateiPfad);
            // Check if file exists before adding
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: material.originalDateiname });
            }
        });
        
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
            return res.status(500).json({ error: 'Serverfehler' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Material nicht gefunden' });
        }

        res.json(row);
    });
});

// Auf Port hören
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
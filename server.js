const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = 5000;

// Pfade konfigurieren
const dbPath = path.join(__dirname, 'material.db');
const uploadsDir = path.join(__dirname, 'uploads');

// Sicherstellen, dass das Uploads-Verzeichnis existiert
if (!fs.existsSync(uploadsDir)) {
  console.log(`Erstelle Uploads-Verzeichnis: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// SQLite-Datenbank initialisieren
console.log(`Verbindung zur Datenbank wird hergestellt: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler bei Datenbankverbindung:', err.message);
    process.exit(1); // Beende den Server bei Datenbankfehler
  }
  console.log('Verbindung zur Datenbank hergestellt!');
  
  // Tabelle erstellen, falls sie nicht existiert
  db.run(`
    CREATE TABLE IF NOT EXISTS materialien (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      klasse TEXT,
      fach TEXT,
      materialform TEXT,
      thema TEXT,
      titel TEXT NOT NULL,
      beschreibung TEXT,
      dateiPfad TEXT,
      originalDateiname TEXT,
      Autor TEXT,
      Datum TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Fehler beim Erstellen der Tabelle:', err.message);
      process.exit(1);
    }
    console.log('Tabelle "materialien" existiert oder wurde erstellt!');
    
    // Nach Erstellung Tabelle prüfen
    db.all("PRAGMA table_info(materialien);", [], (err, rows) => {
      if (err) {
        console.error('Fehler beim Abrufen der Tabellendaten:', err.message);
        return;
      }
      console.log('Tabellenschema:', rows.map(row => `${row.name} (${row.type})`).join(', '));
    });
  });
});

// Multer konfigurieren
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generiere einen einzigartigen Dateinamen
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB Limit
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Für Formulardaten
app.use(express.static(path.join(__dirname, 'frontend')));

// GET: Alle Materialien abrufen
app.get('/materialien', (req, res) => {
    console.log('Abruf aller Materialien gestartet');
    db.all('SELECT * FROM materialien', [], (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Materialien:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        // Ausgabe zu Debugging-Zwecken
        if (rows && rows.length > 0) {
            console.log(`${rows.length} Materialien gefunden. Beispiel:`, rows[0]);
        } else {
            console.log('Keine Materialien in der Datenbank gefunden.');
        }
        
        // Direkt das Array zurückgeben, wie vom Frontend erwartet
        res.json(rows || []);
    });
});

// POST: Material hochladen
app.post('/upload', upload.single('datei'), (req, res) => {
    const { klasse, fach, materialform, thema, titel, beschreibung, autor, datum } = req.body;
    
    console.log('Upload-Anfrage erhalten:', { 
        klasse, fach, materialform, thema, titel,
        beschreibungLength: beschreibung ? beschreibung.length : 0,
        datei: req.file ? req.file.originalname : 'keine Datei'
    });

    if (!req.file) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const dateiPfad = req.file.filename; // Generierter Dateiname durch Multer
    const originalDateiname = req.file.originalname; // Originaler Dateiname

    const sql = `INSERT INTO materialien 
        (klasse, fach, materialform, thema, titel, beschreibung, dateiPfad, originalDateiname, Autor, Datum) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const currentDate = new Date().toISOString();
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
        datum || currentDate // Standardwert, falls nicht angegeben
    ];
    
    console.log('SQL-Parameter:', params);

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Fehler beim Hochladen:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Hochladen erfolgreich! Neue ID: ${this.lastID}`);
        res.status(200).json({ message: 'Erfolgreich hochgeladen', id: this.lastID });
    });
});

// GET: Material herunterladen
app.get('/download/:id', (req, res) => {
    const materialId = req.params.id;

    const sql = 'SELECT * FROM materialien WHERE id = ?';
    db.get(sql, [materialId], (err, row) => {
        if (err) {
            console.error('Fehler beim Abrufen des Materials:', err);
            return res.status(500).json({ error: 'Fehler beim Abrufen des Materials' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Material nicht gefunden' });
        }

        const filePath = path.join(uploadsDir, row.dateiPfad); // Dateipfad aus DB
        const originalName = row.originalDateiname; // Originaler Dateiname

        console.log(`Download-Anfrage für Datei: ${filePath} (${originalName})`);

        // Prüfen, ob die Datei existiert
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error('Datei nicht gefunden:', filePath);
                return res.status(404).json({ error: 'Datei nicht gefunden' });
            }

            // Datei als Download senden
            res.download(filePath, originalName, (err) => {
                if (err) {
                    console.error('Fehler beim Senden der Datei:', err);
                    return res.status(500).json({ error: 'Fehler beim Herunterladen der Datei' });
                }
                console.log(`Datei erfolgreich gesendet: ${originalName}`);
            });
        });
    });
});

// Material löschen
app.delete('/materialien/:id', (req, res) => {
    const materialId = req.params.id;
    console.log(`Löschanfrage für Material mit ID: ${materialId}`);

    // Datenbankeintrag abrufen
    db.get('SELECT * FROM materialien WHERE id = ?', [materialId], (err, row) => {
        if (err) {
            console.error('Fehler beim Abrufen des Materials:', err);
            return res.status(500).json({ error: 'Fehler beim Abrufen des Materials' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Material nicht gefunden' });
        }

        console.log(`Material gefunden: ${row.titel} (ID: ${row.id})`);

        // Datei löschen
        const filePath = path.join(uploadsDir, row.dateiPfad);
        fs.unlink(filePath, unlinkErr => {
            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                console.error('Fehler beim Löschen der Datei:', unlinkErr);
                // Wir brechen hier nicht ab, da der Datenbankeintrag trotzdem gelöscht werden sollte
            } else {
                console.log(`Datei erfolgreich gelöscht: ${filePath}`);
            }

            // Datenbankeintrag löschen
            db.run('DELETE FROM materialien WHERE id = ?', [materialId], deleteErr => {
                if (deleteErr) {
                    console.error('Fehler beim Löschen des Datenbankeintrags:', deleteErr);
                    return res.status(500).json({ error: 'Fehler beim Löschen des Datenbankeintrags' });
                }

                console.log(`Datenbankeintrag erfolgreich gelöscht. ID: ${materialId}`);
                res.status(200).json({ message: 'Material erfolgreich gelöscht' });
            });
        });
    });
});

app.get('/singleview/:id', (req, res) => {
    const id = req.params.id;
    res.sendFile(path.join(__dirname, 'frontend/singleview/single.html'));
});

// GET: Einzelansicht für ein Material
app.get('/materialien/:id', (req, res) => {
    const materialId = req.params.id;
    console.log('Angefragte ID:', materialId);

    const sql = 'SELECT * FROM materialien WHERE id = ?';
    db.get(sql, [materialId], (err, row) => {
        if (err) {
            console.error('Datenbankfehler:', err.message);
            return res.status(500).json({ error: 'Serverfehler' });
        }

        if (!row) {
            console.warn('Material nicht gefunden:', materialId);
            return res.status(404).json({ error: 'Material nicht gefunden' });
        }

        console.log('Gefundene Daten:', row);
        res.json(row);
    });
});

// Debug-Endpunkt zur Überprüfung der Tabellenstruktur
app.get('/debug/table-schema', (req, res) => {
    console.log('Abruf des Tabellenschemas gestartet');
    db.all("PRAGMA table_info(materialien);", [], (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen des Tabellenschemas:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Tabellenschema:', rows);
        res.json({ 
            schema: rows,
            message: "Verwende diese Informationen, um die Spaltennamen zu überprüfen"
        });
    });
});

// Debug-Endpunkt zum Anzeigen eines Beispieldatensatzes
app.get('/debug/sample-data', (req, res) => {
    console.log('Abruf eines Beispieldatensatzes gestartet');
    db.get("SELECT * FROM materialien LIMIT 1;", [], (err, row) => {
        if (err) {
            console.error('Fehler beim Abrufen des Beispieldatensatzes:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        // Wenn kein Datensatz vorhanden ist, gib einen Dummy-Datensatz zurück
        if (!row) {
            console.log('Keine Daten in der Tabelle gefunden');
            return res.json({
                message: "Keine Daten in der Tabelle",
                sampleData: {
                    id: null,
                    klasse: null,
                    fach: null,
                    materialform: null,
                    thema: null,
                    titel: null,
                    beschreibung: null,
                    dateiPfad: null,
                    originalDateiname: null,
                    Autor: null,
                    Datum: null
                }
            });
        }
        
        console.log('Beispieldatensatz gefunden:', row);
        res.json({ 
            sampleData: row,
            keys: Object.keys(row),
            message: "Verwende diese Informationen, um die Datenstruktur zu überprüfen"
        });
    });
});

// Auf Port hören
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});

// Bei Server-Shutdown Datenbank schließen
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Fehler beim Schließen der Datenbank:', err.message);
        } else {
            console.log('Datenbank erfolgreich geschlossen');
        }
        process.exit(0);
    });
});
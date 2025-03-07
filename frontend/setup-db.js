/**
 * Database Setup Script
 * Erstellt die Datenbank und die benötigte Tabelle
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuration variables
const config = {
  dbName: 'material.db',
  uploadsDir: 'uploads',
  tempDir: 'temp',
  indexCreation: true
};

// Paths
const rootDir = path.join(__dirname, '..');
const dbPath = path.join(rootDir, config.dbName);
const uploadsPath = path.join(rootDir, config.uploadsDir);
const tempPath = path.join(rootDir, config.tempDir);

console.log('=== Datenbank-Setup gestartet ===');

// Erstelle root-Verzeichnis (falls es nicht existiert)
if (!fs.existsSync(rootDir)) {
  console.log(`Erstelle Verzeichnis: ${rootDir}`);
  fs.mkdirSync(rootDir, { recursive: true });
}

// Create uploads directory
if (!fs.existsSync(uploadsPath)) {
  console.log(`Erstelle Uploads-Verzeichnis: ${uploadsPath}`);
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Create temp directory (for ZIP downloads)
if (!fs.existsSync(tempPath)) {
  console.log(`Erstelle Temp-Verzeichnis: ${tempPath}`);
  fs.mkdirSync(tempPath, { recursive: true });
}

console.log(`Erstelle/Öffne Datenbank: ${dbPath}`);

// Datenbank erstellen/öffnen
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Öffnen der Datenbank:', err.message);
    process.exit(1);
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
      Datum TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (createErr) => {
    if (createErr) {
      console.error('Fehler beim Erstellen der Tabelle:', createErr.message);
      process.exit(1);
    }
    console.log('Tabelle "materialien" erstellt oder existiert bereits!');

    // Create indexes for better query performance
    if (config.indexCreation) {
      createIndexes(db, () => {
        // Close database after all operations
        closeDatabase(db);
      });
    } else {
      // Close database if no indexes are created
      closeDatabase(db);
    }
  });
});

/**
 * Creates database indexes for better query performance
 * @param {sqlite3.Database} db - The database connection
 * @param {Function} callback - Callback function to execute when finished
 */
function createIndexes(db, callback) {
  console.log('Erstelle Indizes für bessere Abfrageleistung...');
  
  const indexes = [
    { name: 'idx_materialien_klasse', column: 'klasse' },
    { name: 'idx_materialien_fach', column: 'fach' },
    { name: 'idx_materialien_materialform', column: 'materialform' },
    { name: 'idx_materialien_thema', column: 'thema' },
    { name: 'idx_materialien_titel', column: 'titel' }
  ];
  
  let indexesCompleted = 0;
  
  indexes.forEach(index => {
    const sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON materialien(${index.column})`;
    
    db.run(sql, (err) => {
      indexesCompleted++;
      
      if (err) {
        console.error(`Fehler beim Erstellen des Index ${index.name}:`, err.message);
      } else {
        console.log(`Index ${index.name} erstellt oder existiert bereits!`);
      }
      
      // Check if all indexes have been processed
      if (indexesCompleted === indexes.length) {
        callback();
      }
    });
  });
}

/**
 * Closes the database connection
 * @param {sqlite3.Database} db - The database connection
 */
function closeDatabase(db) {
  db.close((closeErr) => {
    if (closeErr) {
      console.error('Fehler beim Schließen der Datenbank:', closeErr.message);
      process.exit(1);
    }
    console.log('Datenbankverbindung geschlossen!');
    console.log('=== Datenbank-Setup abgeschlossen! ===');
  });
}
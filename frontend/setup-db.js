/**
 * Database Setup Script
 * Erstellt die Datenbank und die benötigte Tabelle
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Pfad zur Datenbank (im übergeordneten Verzeichnis)
const dbPath = path.join(__dirname, '..', 'material.db');

// Prüfen, ob der übergeordnete Ordner existiert
const parentDir = path.join(__dirname, '..');
if (!fs.existsSync(parentDir)) {
  console.log(`Erstelle Verzeichnis: ${parentDir}`);
  fs.mkdirSync(parentDir, { recursive: true });
}

console.log(`Erstelle/Öffne Datenbank: ${dbPath}`);

// Datenbank erstellen/öffnen
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Öffnen der Datenbank:', err.message);
    process.exit(1);
  }
  console.log('Verbindung zur Datenbank hergestellt!');

  // Uploads-Verzeichnis erstellen, falls es nicht existiert
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log(`Erstelle Uploads-Verzeichnis: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

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
  `, (createErr) => {
    if (createErr) {
      console.error('Fehler beim Erstellen der Tabelle:', createErr.message);
      process.exit(1);
    }
    console.log('Tabelle "materialien" erstellt oder existiert bereits!');

    // Datenbankverbindung schließen
    db.close((closeErr) => {
      if (closeErr) {
        console.error('Fehler beim Schließen der Datenbank:', closeErr.message);
        process.exit(1);
      }
      console.log('Datenbankverbindung geschlossen!');
      console.log('Datenbank-Setup abgeschlossen!');
    });
  });
});
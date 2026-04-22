const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ allowedOrigins: process.env.CLIENT }));
app.use(express.json());

const db = new Database(path.join(__dirname, 'kybans.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS slots (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    date      TEXT NOT NULL,
    hour      INTEGER NOT NULL,
    sub_slots INTEGER NOT NULL DEFAULT 3,
    blocked   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(date, hour)
  )
`);

const insertSlot = db.prepare(
  'INSERT OR IGNORE INTO slots (date, hour, sub_slots, blocked) VALUES (?, ?, 3, 0)'
);
const seedAll = db.transaction(() => {
  for (let d = 1; d <= 30; d++) {
    const date = `2026-04-${String(d).padStart(2, '0')}`;
    for (let h = 0; h < 24; h++) {
      insertSlot.run(date, h);
    }
  }
});
seedAll();

app.get('/', (_, res) => {
  return res.status(200).json({ message: 'The backend is live' })
})

//user routes
app.get('/api/slots/:date', (req, res) => {
  const { date } = req.params;

  const rows = db
    .prepare('SELECT hour, sub_slots, blocked FROM slots WHERE date = ? ORDER BY hour')
    .all(date);

  const result = rows.map(r => ({
    hour: r.hour,
    available: r.sub_slots > 0 && r.blocked === 0,
  }));
  res.json(result);
});

app.post('/api/slots/book', (req, res) => {
  const { date, hour } = req.body;
  if (date === undefined || hour === undefined) {
    return res.status(400).json({ error: 'date and hour are required' });
  }

  const upd = db
    .prepare(
      `UPDATE slots SET sub_slots = sub_slots - 1
       WHERE date = ? AND hour = ? AND sub_slots > 0 AND blocked = 0`
    )
    .run(date, hour);

  if (upd.changes > 0) return res.json({ success: true });

  const slot = db.prepare('SELECT * FROM slots WHERE date = ? AND hour = ?').get(date, hour);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  if (slot.blocked) return res.status(400).json({ error: 'Slot is blocked' });
  return res.status(400).json({ error: 'No sub-slots remaining' });
});

//admin routes
app.get('/api/admin/slots/:date', (req, res) => {
  const { date } = req.params;
  const rows = db
    .prepare('SELECT hour, sub_slots, blocked FROM slots WHERE date = ? ORDER BY hour')
    .all(date);
  res.json(rows);
});

app.post('/api/admin/slots/block', (req, res) => {
  const { date, hour, blocked } = req.body;
  if (date === undefined || hour === undefined || blocked === undefined) {
    return res.status(400).json({ error: 'date, hour, and blocked are required' });
  }

  const noOfSubSlots = db.prepare('SELECT sub_slots FROM slots WHERE date = ? AND hour = ?').get(date, hour);
  if (noOfSubSlots == 0) {
    return res.status(400).json({ error: 'this slot is already booked fully' })
  }

  const result = db
    .prepare('UPDATE slots SET blocked = ? WHERE date = ? AND hour = ?')
    .run(blocked ? 1 : 0, date, hour);

  if (result.changes === 0) return res.status(404).json({ error: 'Slot not found' });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Kybans server running on http://localhost:${PORT}`);
});

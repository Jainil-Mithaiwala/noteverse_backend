const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// const mongoUser = 'mongo';
// const mongoPassword = 'xGARnhVCdFajnTHonTcRSIydATFCDxmU';
// const mongoHost = 'mongodb.railway.internal';
// const mongoDatabase = 'noteVerseDB';

// mongoose.connect('mongodb://localhost:27017/noteverse')
mongoose.connect('mongodb+srv://jainilmithaiwala:kw4aXKLTxxngvMjG@noteverse.pfoob.mongodb.net/')
  .then(() => console.log("Database Connected"))
  .catch((err) => console.log("Database connection error:", err));

const noteSchema = new mongoose.Schema({
  title: String,
  content: String,
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

const Note = mongoose.model('Note', noteSchema);

app.get('/notes', async (req, res) => {
  const notes = await Note.find();
  res.json(notes);
});

app.post('/notes', async (req, res) => {
  const newNote = new Note({
    title: req.body.title,
    content: req.body.content,
  });
  await newNote.save();
  res.json(newNote);
});

app.put('/notes/:id', async (req, res) => {
  const note = await Note.findByIdAndUpdate(
    req.params.id,
    { completed: req.body.completed },
    { new: true }
  );
  res.json(note);
});

app.delete('/notes/:id', async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});

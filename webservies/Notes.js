const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: String,
  content: String,
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

const Note = mongoose.model("Note", noteSchema);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
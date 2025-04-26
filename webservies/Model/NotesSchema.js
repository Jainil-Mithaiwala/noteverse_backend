// const noteSchema = new mongoose.Schema({
//   title: String,
//   content: String,
//   completed: { type: Boolean, default: false },
//   date: { type: Date, default: Date.now },
// });

export default class NoteSchema {
  constructor() {
    this._id;
    this.title = { type: String, default: "" };
    this.content = { type: String, default: "" };
    this.status = { type: Number, default: 0 };
    this.date = { type: String, default: "" };
  }
}

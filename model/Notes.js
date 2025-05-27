export default class Notes {
        constructor() {
                this._id
                this.title = { type: String, required: true, default: "" }
                this.content = { type: String, required: true, default: "" }
                this.status = { type: Number, required: true, default: 0 }           // 0: Not-Complete, 1: Complete
                this.timestamp = { type: String, required: true, default: "" }
        }
}
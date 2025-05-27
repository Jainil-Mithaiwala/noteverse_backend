export default class Users {
        constructor() {
                this._id
                this.name = { type: String, required: true, default: "" }
                this.mobile = { type: String, required: true, default: "" }
                this.email = { type: String, required: true, default: "" }
                this.password = { type: String, required: true, default: "" }
                this.createdAt = { type: String, required: true, default: "" }
        }
}
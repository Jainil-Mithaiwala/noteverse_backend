export default class History {
        constructor() {
                this._id
                this.ipaddress = { type: String, required: true }
                this.platform = { type: String, required: true }
                this.datetime = { type: Date, required: true, default: Date.now }
                this.body = { type: Object, required: true }
                this.headers = { type: Object, required: true }
                this.url = { type: String, required: true }
        }
}


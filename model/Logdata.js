export default class Logdata {
        constructor() {
                this._id
                this.tblname = { type: String, required: true }
                this.dataary = { type: String, required: true }
                this.operation = { type: String, required: true }
                this.errorcode = { type: String, required: true }
                this.errormsg = { type: String, required: true }
                this.pagename = { type: String, required: true }
                this.platform = { type: String, required: true }
                this.ipaddress = { type: String, required: true }
                this.cmpname = { type: String, required: true }
                this.logdatetime = { type: String, required: true }
        }
}


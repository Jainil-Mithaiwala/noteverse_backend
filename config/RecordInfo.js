class RecordInfo {
  constructor() {
    this.timestamp = { type: Date, required: true, default: Date.now() };
    this.isactive = { type: Number, required: true, default: 1 };
    this.entryuid = { type: String, required: true };
    this.entryby = { type: String, required: true };
    this.entrydate = { type: Date, required: true };
    this.updateuid = { type: String, required: true };
    this.updateby = { type: String, required: true };
    this.updatedate = { type: String, required: true };
  }

  setTimestamp(timestamp) {
    this.timestamp = timestamp;
  }
  setIsactive(isactive) {
    this.isactive = isactive;
  }
  setEntryuid(entryuid) {
    this.entryuid = entryuid;
  }
  setEntryby(entryby) {
    this.entryby = entryby;
  }
  setEntrydate(entrydate) {
    this.entrydate = entrydate;
  }
  setUpdateuid(updateuid) {
    this.updateuid = updateuid;
  }
  setUpdateby(updateby) {
    this.updateby = updateby;
  }
  setUpdatedate(updatedate) {
    this.updatedate = updatedate;
  }

  getTimestamp() {
    return this.timestamp;
  }
  getIsactive() {
    return this.isactive;
  }
  getEntryuid() {
    return this.entryuid;
  }
  getEntryby() {
    return this.entryby;
  }
  getEntrydate() {
    return this.entrydate;
  }
  getUpdateuid() {
    return this.updateuid;
  }
  getUpdateby() {
    return this.updateby;
  }
  getUpdatedate() {
    return this.updatedate;
  }
}

export default RecordInfo;

import _Config from "./Config.js";
import _DBConfig from "./DBConfig.js";
import _Methods from "./Methods.js";
import _PaginationInfo from "./PaginationInfo.js";
import _RecordInfo from "./RecordInfo.js";

export var Config = new _Config();
export var Methods = new _Methods();
export var MainDB = new _DBConfig(true);
export var RecordInfo = new _RecordInfo();
export var PaginationInfo = new _PaginationInfo();
import _mongoose from "mongoose";
import dotenv1 from "dotenv";
import jwt from "jsonwebtoken";
import { Config, Methods, MainDB } from "./Init.js";
import _History from "../model/History.js";
import _Logdata from "../model/Logdata.js";
import _Tokenexpiry from "../model/Authentication/Tokenexpiry.js";
import fs from "fs";
import axios from "axios";

var privateKEY = fs.readFileSync("./config/private.key", "utf8");
var publicKEY = fs.readFileSync("./config/public.key", "utf8");

dotenv1.config({ path: ".env" });

var _URL
var _RequestBody
var _RequestHeaders
var _IpAddress

class DB {
    constructor() {
        var DBName;
        var DBUser;
        var DBHost;
        var DBPass;
        var DBPort;
        var DBConn;
        var DBType;
        var mongoose;

        this.DBType = "MONGODB";
        this.DBName = process.env.MONGODB_DBNAME;
        this.DBHost = process.env.MONGODB_HOST;
        this.DBPort = process.env.MONGODB_PORT;
        this.DBUser = process.env.MONGODB_USER;
        this.DBPass = process.env.MONGODB_PASS;
    }

    Connect() {
        // const errmsg = Config.errmsg

        try {
            let check = _mongoose.connections.map(function (s) {
                return s.name;
            }).includes(this.DBName);

            if (this.DBType == "MONGODB" && this.DBName && this.DBHost && !check) {
                const connectDB = async () => {
                    try {
                        var connectionstring = "mongodb://" + this.DBHost + ":" + this.DBPort + "/" + this.DBName;
                        if (Config.servermode == "prod" || Config.servermode == "uat" | Config.servermode == "dev") {
                            connectionstring = "mongodb+srv://" + this.DBUser + ":" + this.DBPass + "@" + this.DBHost + "/" + this.DBName
                        }
                        this.mongoose = _mongoose.createConnection(connectionstring, {
                            useNewUrlParser: true,
                            useUnifiedTopology: true,
                            retryWrites: true,
                            readPreference: "nearest"
                        });
                        this.mongoose.set("runValidators", true); // here is your global setting

                        console.log("CONNECTION COUNT: " + _mongoose.connections.length + "  MONGODB CONNECTED TO: " + this.DBName);
                    } catch (err) {
                        console.log("Failed to connect to MongoDB", err);
                    }
                };
                connectDB();
            }
        } catch (e) {
            console.log(e);
        }
    }

    createmodel(collection, schema) {
        try {
            var Objres = {};
            var ObjModel;

            const compoundIndex = typeof schema.compoundIndex === 'function' ? schema.compoundIndex() : []

            const { Schema } = _mongoose;
            schema = new Schema(schema);

            //this.mongoose && this.mongoose.models && this.mongoose.models[collection]
            if (this.mongoose.models[collection]) {
                ObjModel = this.mongoose.models[collection];
            } else {
                if (this.mongoose) {
                    schema.set("autoIndex", true);
                    if (compoundIndex.length > 0) {
                        compoundIndex.forEach(element => {
                            schema.index(element, { unique: true })
                        });
                    }
                    ObjModel = this.mongoose.model(collection, schema, collection);
                }
            }

            Objres["objModel"] = ObjModel;
            Objres["collection"] = collection;
            return Objres;
        } catch (e) {
            console.log(" ****************** Start Mongoose Model Error ************************** ");
            console.log("DATABASE INFO", this.DBName, this.DBUser, this.DBHost, this.DBPass, this.DBPort, this.DBConn, this.DBType, this.mongoose);
            console.log(e);
            console.log(" ****************** End Mongoose Model Error ************************** ");
        }
    }

    async puthistory(RequestBody, RequestHeaders, IpAddress, URL) {
        try {

            if (this.DBType === "MONGODB") {

                _RequestBody = RequestBody
                _RequestHeaders = RequestHeaders
                _IpAddress = IpAddress
                // this._URL=URL
                _URL = URL
                var HistoryData = {}
                HistoryData.ipaddress = IpAddress
                HistoryData.platform = RequestHeaders['user-agent']
                HistoryData.datetime = Methods.GetTimestamp()
                HistoryData.body = RequestBody
                HistoryData.headers = RequestHeaders
                HistoryData.url = URL
                await this.executedata('i', new _History(), 'tblnv_history', HistoryData, false)

            }
        }
        catch (e) {
            console.log(e)
        }
        /*-------------End History Table data insert ------------- */
    }

    async executedata(operation, SchemaClassObj, CollectionName, data, insertlog = true, dependency = []) // operation=i,u,d  ObjModel=table name    data=array of data  extra= extra id parameter with value, 
    {

        const ObjectId = _mongoose.Types.ObjectId

        var resp = {
            'status': 400,
            'message': Config.errmsg['dberror']
        }

        try {

            const ObjModel = this.createmodel(CollectionName, SchemaClassObj)

            if (this.DBType == 'MONGODB') {
                if (operation == 'i') {
                    var DataInsert = new ObjModel['objModel'](data)

                    const err = DataInsert.validateSync()

                    if (err) {
                        throw err
                    }
                    else {
                        resp.data = await DataInsert.save()
                        resp.status = 200
                        resp.message = Config.errmsg['insert']
                    }
                }
                else if (operation == 'u') {
                    const updateResp = await ObjModel['objModel'].findByIdAndUpdate(new ObjectId(data._id), data, { runValidators: true, new: true })
                    resp.data = updateResp
                    resp.status = 200
                    resp.message = Config.errmsg['update']
                }
                else if (operation == 'd') {
                    // check in dependancy variable 
                    var check = null
                    if (dependency.length) {
                        for (var i = 0; i < dependency.length; i++) {
                            check = await dependency[i][0].findOne(dependency[i][1])
                            if (check) {
                                break
                            }
                        }
                    }
                    if (!check) {
                        var DataDelete = await ObjModel['objModel'].findByIdAndDelete(data)
                        if (DataDelete == null) {
                            resp.status = 200
                            resp.message = Config.errmsg['notexist']
                        }
                        else {
                            resp.status = 200
                            resp.data = DataDelete
                            resp.message = Config.errmsg['delete']
                        }
                    }
                    else {
                        resp.status = 401
                        resp.message = Config.errmsg['inuse']
                    }
                }
            }
        }
        catch (err) {
            resp.message = Config.errmsg['dberror'] + ' ' + err.toString()
            resp.status = 400

            // Duplicate Data Error
            if (err.code === 11000) {
                resp.message = `The ${Object.keys(err.keyValue).map(val => Config.uniquekeymsg[val]).toString()} is already exist in records.`
                resp.status = 409
            }
            // Requiredfield Error
            else if (err.name === 'ValidationError') {
                resp.message = Object.values(err.errors).map(val => val.message).join(', ')
                resp.status = 400
            }
        }

        if (insertlog == true) {  // if request comes from insertlogdata
            //insert Logs of Operation 
            this.insertlogdata(_RequestBody, _RequestHeaders, _IpAddress, _URL, CollectionName, operation, resp.status, resp.message)
        }

        return resp
    }

    async insertlogdata(RequestBody, RequestHeaders, IpAddress, URL, tblname, operation, errorcode, errormsg) {
        try {
            if (this.DBType === "MONGODB") {
                // Page name from URL
                var PageName = URL.split("/")
                var page = PageName[PageName.length - 1]

                var useragent = RequestHeaders['user-agent']

                var LogDetails = {}
                LogDetails.tblname = tblname
                LogDetails.dataary = 'Body : ' + Methods.Jsontostring(RequestBody) + ' Headers : ' + Methods.Jsontostring(RequestHeaders)
                LogDetails.operation = operation
                LogDetails.errorcode = errorcode
                LogDetails.errormsg = errormsg
                LogDetails.pagename = page
                LogDetails.platform = useragent
                LogDetails.cmpname = 'Note Verse'
                LogDetails.ipaddress = IpAddress
                LogDetails.logdatetime = Methods.getdatetimestr()

                var response = await this.executedata('i', new _Logdata(), 'tblnv_log', LogDetails, false)
            }
        }
        catch (e) {
            console.log(e)
        }
    }

    async Update(CollectionName, SchemaClassObj, pipeline, options = {}, insertlog = false) {

        var resp = {
            'status': 400,
            'message': Config.errmsg['dberror']
        }

        try {
            const ObjSchemaModel = this.createmodel(CollectionName, SchemaClassObj)
            const result = await ObjSchemaModel['objModel'].updateOne(pipeline[0], pipeline[1], options)
            resp.status = 200
            resp.message = Config.errmsg['update']
            // return result

        } catch (err) {
            resp.message = Config.errmsg['dberror'] + ' ' + err.toString()
            resp.status = 400

            // Duplicate Data Error
            if (err.code === 11000) {
                console.log(err)
                resp.message = Config.errmsg['isexist']
                resp.status = 409
            }
            // Required field Error
            else if (err.name === 'ValidationError') {
                resp.message = Object.values(err.errors).map(val => val.message).toString()
                //resp.message=Config.errmsg['required']
                resp.status = 400
            }
        }

        if (insertlog == true) {
            //insert Logs of Operation 
            this.insertlogdata(_RequestBody, _RequestHeaders, _IpAddress, _URL, CollectionName, 'u', resp.status, resp.message)
        }

        return resp
    }

    async UpdateMany(CollectionName, SchemaClassObj, pipeline) {
        const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
        const result = await ObjSchemaModel['objModel'].updateMany(pipeline[0], pipeline[1])

        return result
    }

    async DeleteMany(CollectionName, SchemaClassObj, pipeline) {
        var resp = {
            'status': 400,
            'message': Config.errmsg['dberror']
        }

        try {
            if (this.DBType == 'MONGODB') {
                const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
                await ObjSchemaModel['objModel'].deleteMany(pipeline)

                resp.status = 200
                resp.message = Config.errmsg['delete']
            }

        }
        catch (err) {
            resp.message = Config.errmsg['dberror'] + ' ' + err.toString()
            resp.status = 400
        }

        return resp
    }

    // GENERATE GWT TOKEN
    async getjwt(uid, unqkey, exph = "2h") {
        try {
            if (uid && unqkey) {

                // PAYLOAD
                var payload = {
                    uid: uid.toString(),
                    unqkey: unqkey
                };

                // SIGNING OPTIONS
                var signOptions = {
                    expiresIn: exph,
                };

                let data = {
                    unqkey: unqkey,
                    uid: uid.toString(),
                    exp: exph,
                    entry_date: Methods.getdatetimestr(),
                    isvalid: 1,
                    update_date: ''
                }

                try {
                    var t = jwt.sign(payload, process.env.ENCRYPTION_KEY, signOptions);
                } catch (err) {
                    console.error('JWT Error:', err);
                }

                const add = await this.executedata('i', new _Tokenexpiry(), 'tblnv_expiry', data)
                return t;
            }
        } catch (err) {
            console.log(err);
        }
    }

    // VERIFICATION OF THE JWT TOKEN
    async validatejwt(token, uid, unqkey, action = '') {
        const errmsg = Config.errmsg

        var resp = {}
        resp.status = 401
        resp.message = errmsg['invalidtoken']
        var id = ''
        try {
            if (uid.includes("guest-")) {
                // checksubdomain = false
            }
            var decoded = jwt.verify(token, process.env.ENCRYPTION_KEY)

            if (decoded.uid === uid && decoded.unqkey === unqkey) {
                // check the expiry of token
                const pipeline = [{ $match: { unqkey: unqkey, isvalid: '1' } }]

                var responseData = await this.getmenual('tblnv_expiry', new _Tokenexpiry(), pipeline)

                if (responseData && responseData.ResultData[0]) {
                    id = responseData.ResultData[0]._id
                    resp.status = 200
                    resp.message = errmsg['tokenvalidate']
                } else {
                    resp.autologout = true
                }
            }

        }
        catch (e) {
            resp.message = errmsg['invalidtoken']
            resp.status = 401
            console.log('e :>> ', e);
            if (e instanceof jwt.TokenExpiredError) {
                if (action == '') {
                    unqkey = Methods.generateuuid()
                    resp.key = await this.getjwt(uid, unqkey)
                    resp.unqkey = unqkey
                    resp.message = errmsg['tokenvalidate']
                    resp.status = 200
                }
            } else {
                resp.autologout = true
            }
            if (id) {
                const delResp = await this.executedata('d', new _Tokenexpiry(), 'tblnv_expiry', { _id: id })
            }
        }

        return resp
    }

    async getmenual(CollectionName, SchemaClassObj, pipeline, requiredPage = {}, sort = {}, fieldorder = false, projection = {}, customeFiledOrder = {}, internalCall = false,) {
        try {
            const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
            var ResultData
            var ResponseData = {}
            var currentpage = 0
            var nextpage = 0
            var Documents = 0

            var countPipeline = [...pipeline]
            countPipeline.push({ $count: "doccount" })

            if (Object.keys(projection).length !== 0) {
                pipeline.push({
                    '$project': projection
                })
            }
            if (Object.keys(sort).length !== 0) {
                pipeline.push({
                    "$sort": sort
                })
            }

            if (Object.keys(requiredPage).length !== 0) {

                currentpage = requiredPage.pageno
                pipeline.push(
                    {
                        "$limit": requiredPage.pagelimit + requiredPage.skip
                    },
                    {
                        "$skip": requiredPage.skip
                    },
                )

                ResultData = await ObjSchemaModel['objModel'].aggregate(pipeline).collation({ locale: "en", strength: 1 }).allowDiskUse(true);

                const countDoc = await ObjSchemaModel['objModel'].aggregate(countPipeline)
                if (countDoc && countDoc[0] && countDoc[0].doccount) {
                    Documents = countDoc[0].doccount
                }

                var totalPage = Math.ceil(Documents / requiredPage.pagelimit)
                if (totalPage > currentpage)
                    nextpage = 1
            }
            else {
                ResultData = await ObjSchemaModel['objModel'].aggregate(pipeline)
            }

            // get data 
            var fieldorderdata = 0

            if (fieldorder) {

                const ObjSchemaModelOrder = this.createmodel('tblfieldorder', new _FieldOrder())
                let fieldpage = customeFiledOrder.pagename ? customeFiledOrder.pagename : CollectionName

                fieldorderdata = await ObjSchemaModelOrder['objModel'].findOne({ 'userid': RequestHeaders.uid, 'pagename': fieldpage }, { '_id': 0, 'fields': '$fields' })

                //new addon
                const Obj = SchemaClassObj
                var fieldorder

                if (customeFiledOrder.staticOrder) {
                    fieldorder = customeFiledOrder.staticOrder
                } else if (typeof Obj.getFieldOrder === 'function') {
                    fieldorder = Obj.getFieldOrder()
                }

                var updatedFields = []

                //if static has field add

                if (fieldorderdata && fieldorder && fieldorder.fields) {
                    fieldorderdata.fields.map(function (o) {
                        let staticField = fieldorder.fields.find(k => k.field == o.field)
                        if (staticField) {
                            staticField.active = o.active
                            updatedFields.push(staticField)
                        }
                    })
                }


                // if(fieldorderdata && fieldorder && fieldorder.fields){
                // 	fieldorderdata.fields.map(function(o){
                // 		let staticField = fieldorder.fields.find(k=>k.field == o.field)
                // 		if(staticField){
                // 			staticField.active = o.active
                // 			updatedFields.push(o)
                // 		}
                // 	})
                // }

                //add from static if not exist on data
                if (fieldorder && fieldorder.fields) {
                    fieldorder.fields.map(function (o) {
                        let staticField
                        if (fieldorderdata) { staticField = fieldorderdata.fields.find(k => k.field == o.field) }
                        if (staticField) { } else {
                            updatedFields.push(o)
                        }
                    })
                }

                //freezed fields first
                updatedFields.sort(function (a, b) { return b.freeze - a.freeze })
                fieldorderdata = { fields: updatedFields }
            }


            // ResponseData.fromdb = this.DBName
            ResponseData.ResultData = ResultData
            ResponseData.currentpage = currentpage
            ResponseData.nextpage = nextpage
            ResponseData.totaldocs = Documents
            ResponseData.fieldorderdata = fieldorderdata

            return ResponseData

        } catch (err) {
            console.log(err);

            return {
                ResultData: [],
                currentpage: 0,
                nextpage: 0
            }
        }

    }

    async FindOne(CollectionName, SchemaClassObj, pipeline, projection = {}) {
        const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj);

        // If projection is empty, don't apply it (i.e., return all fields)
        const projectionQuery = Object.keys(projection).length ? projection : null;

        var ResultData = await ObjSchemaModel['objModel']
            .findOne(pipeline)
            .collation({ locale: "en", strength: 1 })
            .select(projectionQuery);  // Apply projection if provided, otherwise return all fields

        return ResultData;
    }

    getDBName() {
        return this.DBName;
    }
    getDBUser() {
        return this.DBUser;
    }
    getDBHost() {
        return this.DBHost;
    }
    getDBPass() {
        return this.DBPass;
    }
    getDBPort() {
        return this.DBPort;
    }
    getDBType() {
        return this.DBType;
    }
    getDBConn() {
        return this.DBConn;
    }

    // setter method to set the db config
    setDBName(DBName) {
        this.DBName = DBName;
    }
    setDBUser(DBUser) {
        this.DBUser = DBUser;
    }
    setDBHost(DBHost) {
        this.DBHost = DBHost;
    }
    setDBPass(DBPass) {
        this.DBPass = DBPass;
    }
    setDBPort(DBPort) {
        this.DBPort = DBPort;
    }
    setDBType(DBType) {
        this.DBType = DBType;
    }
    setDBConn(DBConn) {
        this.DBConn = DBConn;
    }
}

export default DB;
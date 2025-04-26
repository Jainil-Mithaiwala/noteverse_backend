import _Config from "./Config.js"
import _DBConfig from "../config/DBConfig.js"
import _IISMethods from "./IISMethods.js"
import _mongoose from "mongoose"
import fs from "fs"
import jwt from "jsonwebtoken"
import _History from "../model/History.js"
import _Logdata from "../model/Logdata.js"
import _FieldOrder from "./FieldOrder.js"
import _Employee from "../model/Onboarding/Employee.js"
import _Customer from "../model/Onboarding/Customer.js"
import _GateKeeper from "../model/Onboarding/GateKeeper.js"

// import _Users from "../model/Users.js"

import _Series from "../model/masters/Series.js"
import _SeriesType from "../model/SeriesType.js"
import _TaskLog from "../model/masters/Task/TaskLog.js"
import _TaskStatusLog from "../model/masters/Task/TaskLog.js"
import _TaskStatus from "../model/masters/Task/Taskstatus.js"
import _Device from "../model/APP/Device.js"

import { RequestHeaders, ResponseHeaders } from "./apiconfig.js"
import _Tokenexpiry from "../model/Tokenexpiry.js"

import _Userrights from "../model/masters/UserManagement/Userrights.js"
import _UserRoleHierarchy from "../model/masters/UserManagement/UserRoleHierarchy.js"
import { query } from "express"
import { IISMethods, MainDB, RecordInfo, FieldConfig, Config } from "./Init.js"
import { addJob } from "../cronjobs/BullQueue.js"

import _EmailSMTP from "../model/masters/Configurations/EmailSMTP.js"
import _EmailTemplate from "../model/masters/Configurations/EmailTemplate.js"
import _EmailLogs from "../model/EmailLog.js"
import _APIIntegration from "../model/APIIntegration.js"
import _ComplaintStage from "../model/Complaint/ComplaintStage.js"
import _ComplaintStatusAction from "../model/Complaint/ComplaintStatusActionLog.js"
import _Errorlog from "../model/ErrorLog.js"

import { Worker } from "worker_threads"

var privateKEY = fs.readFileSync("./config/private.key", "utf8")
var publicKEY = fs.readFileSync("./config/public.key", "utf8")

// Person Session Log
import _PersonSessionLog from "../model/PersonSessionLog.js"
// Person Change Log
import _PersonChangeLog from "../model/PersonChangeLog.js"
import { MongoClient, ObjectId } from "mongodb"
import instance from "./AxiosInstance.js"
import _ZohoToken from "../model/Zoho/zohoToken.js"

import _MenuDesign from "../model/masters/Menu/MenuDesign.js"
import _MenuAssign from "../model/masters/Menu/MenuAssign.js"

import { Propertycommon } from "../model/masters/Property/PropertyMaster.js"

var _URL
var _RequestBody
var _RequestHeaders
var _IpAddress

class DB {
  constructor() {
    var DBName
    var DBUser
    var DBHost
    var DBPass
    var DBPort
    var DBConn
    var DBType
    var mongoose
  }

  Connect(ismaindb) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()

    try {
      if (this.DBType == "MONGODB") {
        const connectDB = async () => {
          try {
            let connectionstring = "mongodb://" + this.DBHost + ":" + this.DBPort + "/" + this.DBName

            if (Config.servermode == "prod" || Config.servermode == "uat") {
              connectionstring = "mongodb+srv://" + this.DBUser + ":" + this.DBPass + "@" + this.DBHost + "/" + this.DBName
            }

            this.mongoose = _mongoose.createConnection(connectionstring, {
              useNewUrlParser: true,
              useUnifiedTopology: true,
              retryWrites: true,
              readPreference: "nearest",
            })
            // node_Log("DB.js:271 ~ connectionstring:", connectionstring)

            this.mongoose.set("runValidators", true)

            console.log("DB.js:275 ~ MongoDB " + this.DBName + " connected!!")

            console.log(`DB.js:277 ~ Number of Connections ${_mongoose.connections.length - 1}`)

            if (ismaindb) {
              const client = new MongoClient(connectionstring)
              await client.connect()

              global.dbclient = client
            }
          } catch (err) {
            //node_Log("Failed to connect to MongoDB", err)
          }
        }

        connectDB()
      }
    } catch (e) {
      //node_Error(e);
    }
  }

  DisConnect() {
    this.DBName = ""
    this.DBUser = ""
    this.DBHost = ""
    this.DBPass = ""
    this.DBPort = ""
    this.DBConn = ""
    this.DBType = ""
    // this.mongoose=''
  }

  async puthistory(RequestBody, RequestHeaders, IpAddress, URL) {
    const IISMethods = new _IISMethods()
    try {
      if (this.DBType === "MONGODB") {
        const History = new _History()

        _RequestBody = RequestBody
        _RequestHeaders = RequestHeaders
        _IpAddress = IpAddress
        // this._URL=URL
        _URL = URL

        History.ipaddress = IpAddress
        History.platform = RequestHeaders["user-agent"]
        History.datetime = IISMethods.getdatetimestr()
        History.data = "Body : " + IISMethods.Jsontostring(RequestBody) + " Headers : " + IISMethods.Jsontostring(RequestHeaders)
        History.url = URL

        if (["dev", "prod"].includes(Config.servermode)) {
          await this.executedata("i", new _History(), "tblhistory", History, false)
        }
      }
    } catch (e) {
      //node_Error(e);
    }
    /*-------------End History Table data insert ------------- */
  }

  getModel(collection) {
    let ObjModel

    if (this.mongoose && this.mongoose.models && this.mongoose.models[collection]) {
      ObjModel = this.mongoose.models[collection]
    }

    return ObjModel
  }

  async createmodel(collection, schema) {
    try {
      const Objres = {}
      let ObjModel = {}

      const { Schema } = _mongoose
      const schemaIndexes = typeof schema.getIndexes === "function" ? schema.getIndexes() : []
      const compoundIndex = typeof schema.compoundIndex === "function" ? schema.compoundIndex() : []

      schema = new Schema(schema)
      // console.log("🚀 ~ createmodel ~ schema:", schema)

      if (this.mongoose && this.mongoose.models && this.mongoose.models[collection]) {
        ObjModel = this.mongoose.models[collection]
      } else {
        if (this.mongoose) {
          schema.set("autoIndex", true)
          if (compoundIndex.length > 0) {
            compoundIndex.forEach((element) => {
              schema.index(element, { unique: true })
            })
          }
          ObjModel = this.mongoose.model(collection, schema, collection)
          // console.log("🚀 ~ createmodel ~ ObjModel:", ObjModel)

          try {
            if (global.dbclient) {
              const collectionModel = await global.dbclient.db(this.DBName).collection(collection)

              const existIndexes = (await collectionModel.indexes()).map((index) => index.key)

              for (const indexObj of schemaIndexes) {
                if (Array.isArray(indexObj) && !existIndexes.find((obj) => JSON.stringify(obj) === JSON.stringify(indexObj[0]))) {
                  await collectionModel.createIndex(indexObj[0], indexObj[1])
                } else if (!Object.values(indexObj).includes(true) && !existIndexes.find((obj) => JSON.stringify(obj) === JSON.stringify(indexObj))) {
                  await collectionModel.createIndex(indexObj)
                }
              }
            }
          } catch (err) { }
        }
      }

      Objres["objModel"] = ObjModel
      Objres["collection"] = collection

      return Objres
    } catch (e) {
      // node_Error(" ****************** Start Mongoose Model Error ************************** ")
      // node_Error("DATABASE INFO", this.DBName, this.DBUser, this.DBHost, this.DBPass, this.DBPort, this.DBConn, this.DBType, this.mongoose)
      // node_Error(e);
      // node_Error(" ****************** End Mongoose Model Error ************************** ")
    }
  }

  async dropcollection(collection) {
    try {
      var dropres = this.mongoose.collection(collection).drop()
      return dropres
    } catch (e) {
      //node_Error(e);
    }
  }

  async executedata(
    operation,
    SchemaClassObj,
    CollectionName,
    data,
    insertlog = true,
    dependency = [], // operation=i,u,d  ObjModel=table name    data=array of data  extra= extra id parameter with value,
    extraMessage
  ) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()
    let DataName = ""

    var resp = {
      status: 400,
      message: errmsg["dberror"],
    }

    const ObjModel = await this.createmodel(CollectionName, SchemaClassObj)
    DataName = typeof SchemaClassObj.getDataName === "function" ? SchemaClassObj.getDataName() : ""
    if (extraMessage) {
      DataName = extraMessage
    }

    try {
      if (this.DBType == "MONGODB") {
        if (operation == "i") {
          var DataInsert = new ObjModel["objModel"](data)
          // console.log(DataInsert);

          const err = DataInsert.validateSync()
          if (err) {
            throw err
          } else {
            const data = await DataInsert.save()
            resp.data = data
            resp.status = 200
            resp.message = `${DataName} ${Config.errmsg["insert"]}`
          }
        } else if (operation === "u") {
          let existdataPagename = []
          // console.log("Data: ", data);

          if (!data?.isactive) {
            if (dependency.length) {
              for (const dep of dependency) {
                const check = await dep[0].findOne(dep[1])

                if (check && dep[2]) {
                  existdataPagename.push(dep[2])
                }
              }
            }
          }

          if (!existdataPagename.length) {
            if (data._id) {
              const query_res = await ObjModel["objModel"].findByIdAndUpdate(data._id, data, {
                runValidators: true,
                new: true,
              })

              console.log("//////")
              resp.data = query_res
              resp.status = 200
              resp.message = `${DataName} ${Config.errmsg["update"]}`
            }
          } else {
            resp.status = 400
            resp.message = `The data you want to update is currently in use at: ${existdataPagename.join(", ")}.`
            resp.existdataPagename = existdataPagename
          }
        } else if (operation == "d") {
          // check in dependancy variable
          let existdataPagename = []

          var check = null
          if (dependency.length) {
            for (var i = 0; i < dependency.length; i++) {
              check = await dependency[i][0].findOne(dependency[i][1])

              if (check) {
                if (dependency[i][2]?.pagename != "") {
                  existdataPagename.push(dependency[i][2])
                }
              }
              // if (check && data.isdelete) {
              // 	//parth
              // 	await dependency[i][0].deleteMany(dependency[i][1])
              // 	existdataPagename = []
              // }
            }
          }

          if (!existdataPagename.length) {
            var DataDelete = await ObjModel["objModel"].findByIdAndDelete(data)
            if (DataDelete == null) {
              resp.status = 200
              resp.message = errmsg["notexist"]
            } else {
              resp.status = 200
              resp.message = `${DataName} ${Config.errmsg["delete"]}`
            }
          } else {
            resp.status = 400
            resp.message = `The data you want to delete is currently in use at ${existdataPagename.join(", ")}.`
            resp.existdataPagename = existdataPagename
          }
        }
      }
    } catch (err) {
      //node_Error(err)
      resp.message = errmsg["dberror"] + " " + err.toString()
      resp.status = 400

      // Duplicate Data Error
      // if (err.code === 11000) {
      //     resp.message = `The ${Object.keys(err.keyValue).map(val => Config.uniquekeymsg[val]).join(', ')} already exist in records.`
      //     resp.status = 409
      // }
      if (err.code === 11000) {
        resp.message = errmsg["isexist"]
        resp.status = 409
      }
      // Requiredfield Error
      else if (err.name === "ValidationError") {
        resp.message = Object.values(err.errors)
          .map((val) => val.message)
          .toString()

        if (Object.values(err.errors)[0].name === "CastError") {
          // node_Error(Object.values(err.errors))
          resp.message = err.message.replace(/for model "(.*?)"/, "")
        }
        //resp.message=errmsg['required']
        resp.status = 400
      }
      // cast error handling
      else if (err.name === "BSONTypeError") {
        // node_Error(Object.values(err.errors))
        resp.message = err.message.replace(/for model "(.*?)"/, "")
        resp.status = 400
      }
      // cast error
      else if (err.name === "CastError") {
        //node_Error(err)
        resp.message = err.message.replace(/for model "(.*?)"/, "")
        resp.status = 400
      }
    }
    // ["prod"].includes(Config.servermode)
    if (insertlog == true && _RequestHeaders) {
      // if request comes from insertlogdata
      //insert Logs of Operation
      this.insertlogdata(_RequestBody, _RequestHeaders, _IpAddress, _URL, ObjModel["collection"], operation, resp.status, resp.message)
    }

    return resp
  }

  async insertlogdata(RequestBody, RequestHeaders, IpAddress, URL, tblname, operation, errorcode, errormsg) {
    const IISMethods = new _IISMethods()

    try {
      if (this.DBType === "MONGODB") {
        // Page name from URL
        var PageName = URL.split("/")
        var page = PageName[PageName.length - 1]

        var useragent = RequestHeaders["user-agent"]
        const Logdata = new _Logdata()

        Logdata.tblname = tblname
        Logdata.dataary = "Body : " + IISMethods.Jsontostring(RequestBody) + " Headers : " + IISMethods.Jsontostring(RequestHeaders)
        Logdata.operation = operation
        Logdata.errorcode = errorcode
        Logdata.errormsg = errormsg
        Logdata.pagename = page
        Logdata.platform = useragent
        Logdata.ipaddress = IpAddress
        Logdata.logdatetime = IISMethods.getdatetimestr()

        var response = await this.executedata("i", new _Logdata(), "tbllog", Logdata, false)
      }
    } catch (e) {
      // node_Error(e);
    }
  }

  /********************************************* Error Log *********************************************/
  async createErrLog({ data, url }) {
    try {
      // const stackTrace = data.stack.split("\n")
      // const lineInfo = stackTrace[1].match(/(.*):(\d+):(\d+)/)
      // const filename = path.basename(lineInfo[1])
      // const lineNumber = lineInfo[2]
      const stackTrace = []
      const lineInfo = []
      const filename = ""
      const lineNumber = 1

      const errorLog = {
        url,
        filename,
        linenumber: lineNumber,
        error: `${data?.name}: ${data?.message}`,
        errorstack: data?.stack,
      }

      await this.executedata("i", new _Errorlog(), "tblerrorlog", errorLog, false)
    } catch (err) {
      //node_Error(err)
    }
  }

  async addErrLog({ req, data, url }) {
    try {
      console.log("db files calling")
      const errorLog = {
        url: url,
        error: data.message,
        filename: "Unknown file",
        linenumber: "Unknown line",
        errorstack: data.stack,
        headers: req.headers,
        body: req.body,
      }

      const stackLines = data.stack.split("\n")
      let apiErrorCaptured = false

      for (let line of stackLines) {
        const match = /at\s+(?:async\s+)?(?:[^ ]+ \()?([^()]+?):(\d+):(\d+)\)?/.exec(line)
        if (match) {
          let filePath = match[1].replace("file:///", "").replace(/\\/g, "/")
          const fileName = filePath.split("/").pop() // Extracts the filename from the path
          const lineNo = match[2]

          // Adjust this path check to specifically match your API directory structure
          if (filePath.includes("/api/") && !filePath.includes("/node_modules/")) {
            errorLog.filename = fileName // Logs only the filename
            errorLog.linenumber = lineNo
            apiErrorCaptured = true
            break // Capture the first API error and exit
          }
        }
      }

      if (!apiErrorCaptured) {
        // Fallback: If no API error was captured, log the last stack trace element that was not from node_modules
        for (let line of stackLines) {
          const match = /at\s+(?:async\s+)?(?:[^ ]+ \()?([^()]+?):(\d+):(\d+)\)?/.exec(line)
          if (match) {
            let filePath = match[1].replace("file:///", "").replace(/\\/g, "/")
            const fileName = filePath.split("/").pop() // Extracts the filename from the path
            if (!filePath.includes("/node_modules/")) {
              errorLog.filename = fileName // Logs only the filename
              errorLog.linenumber = match[2]
              break
            }
          }
        }
      }

      console.log("🚀 ~ addErrLog ~ errorLog:", errorLog)
      const d = await this.executedata("i", new _Errorlog(), "tblerrorlog", errorLog, false)
      console.log("🚀 ~ addErrLog ~ d:", d)
    } catch (err) {
      console.log("🚀 ~ addErrLog ~ err:", err)
      // node_Error(err)
    }
  }

  //DATABASE OPRATIONS ------------------------------------------------------------------------------------------------DATABASE OPRATIONS//
  async getmenual(CollectionName, SchemaClassObj, pipeline, requiredPage = {}, sort = {}, fieldorder = 0, customdbconnection = "", projection = {}, pagename = "") {
    try {
      const Config = new _Config()
      const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
      var ResultData
      var ResponseData = {}
      var currentpage = 0
      var nextpage = 0
      var Documents = 0
      var countPipeline = [...pipeline]
      countPipeline.push({
        $count: "doccount",
      })
      if (Object.keys(projection).length !== 0) {
        pipeline.push({
          $project: projection,
        })
      }
      if (Object.keys(sort).length !== 0) {
        pipeline.push({
          $sort: sort,
        })
      }
      if (Object.keys(requiredPage).length !== 0 && requiredPage.pagelimit !== "*") {
        currentpage = requiredPage.pageno
        pipeline.push(
          {
            $limit: requiredPage.pagelimit + requiredPage.skip,
          },
          {
            $skip: requiredPage.skip,
          }
        )
        ResultData = await ObjSchemaModel["objModel"]
          .aggregate(pipeline)
          .collation({
            locale: "en",
            strength: 1,
          })
          .allowDiskUse(true)
        // const searchObj = pipeline.reduce((result, obj) => {
        // 	if (obj.$match) {
        // 		result = { ...result, ...obj.$match }
        // 	}
        // 	return result
        // }, {})
        // const Documents = await ObjSchemaModel["objModel"].countDocuments(searchObj)
        const countDoc = await ObjSchemaModel["objModel"].aggregate(countPipeline)
        if (countDoc && countDoc[0] && countDoc[0].doccount) {
          Documents = countDoc[0].doccount
        }
        var totalPage = Math.ceil(Documents / requiredPage.pagelimit)
        if (totalPage > currentpage) nextpage = 1
      } else {
        ResultData = await ObjSchemaModel["objModel"].aggregate(pipeline)
      }
      // get data

      let fieldorderdata,
        formfieldorderdata = {}

      if (fieldorder) {
        let fieldorderModel = {}

        fieldorderModel = await this.createmodel("tblfieldorder", new _FieldOrder())

        fieldorderdata = await fieldorderModel["objModel"].findOne({ userid: RequestHeaders.uid, pagename: CollectionName }, { _id: 0, fields: "$fields" })

        let fieldorder

        // Get FieldOrder From Schema Class
        if (typeof SchemaClassObj.getFieldOrder === "function") {
          fieldorder = SchemaClassObj.getFieldOrder()
        }

        if (typeof SchemaClassObj.getFormFieldOrder === "function") {
          formfieldorderdata = SchemaClassObj.getFormFieldOrder()
        }

        const updateFieldOrder = []

        // If FieldOrder Exists
        if (fieldorder && fieldorder.fields && fieldorderdata) {
          fieldorderdata.fields.map((obj) => {
            const staticField = fieldorder.fields.find((obj1) => obj1.field === obj.field)

            if (staticField) {
              staticField.active = obj.active
              updateFieldOrder.push(staticField)
            }
          })
        }

        // Add New Static Field Order If Added
        if (fieldorder && fieldorder.fields) {
          fieldorder.fields.map((obj) => {
            let staticField = fieldorderdata?.fields.find((obj1) => obj1.field === obj.field)

            if (!staticField) updateFieldOrder.push(obj)
          })
        }

        // Freezed fields first
        updateFieldOrder.sort((a, b) => b.freeze - a.freeze)

        fieldorderdata = { fields: updateFieldOrder }
      }
      // ResponseData.fromdb = this.DBName
      ResponseData.ResultData = ResultData
      ResponseData.currentpage = currentpage
      ResponseData.nextpage = nextpage
      ResponseData.totaldocs = Documents
      ResponseData.fieldorderdata = fieldorderdata
      ResponseData.formfieldorderdata = formfieldorderdata
      return ResponseData
    } catch (err) {
      console.log(err)
      return {
        ResultData: [],
        currentpage: 0,
        nextpage: 0,
      }
    }
  }

  async getmenualwithfind(
    collectionName,
    schemaObj,
    pipeline,
    requiredPage = {},
    sort = {},
    fieldorder = false,
    customdbconnection = "",
    projection = {},
    formfieldorderdata = false
  ) {
    let ResponseData = {
      fromdb: this.DBName,
      ResultData: [],
      fieldorderdata: 0,
    }

    try {
      const ObjectId = IISMethods.getobjectid()
      const schemaModel = await this.createmodel(collectionName, schemaObj)
      let ResultData = []
      let QureryData = []
      // Applying query
      let filter = {
        $and: [],
      }

      for (const stage of pipeline) {
        if ("$match" in stage) {
          filter.$and.push(stage.$match)
        }
      }

      let queryCursor = schemaModel["objModel"].find(filter)

      // Applying projection
      if (Object.keys(projection).length) {
        queryCursor = queryCursor.select(projection)
      }

      // Applying sorting
      if (Object.keys(sort).length) {
        queryCursor = queryCursor.sort(sort)
      }

      // Applying pagination
      if (Object.keys(requiredPage).length !== 0 && requiredPage.pagelimit !== "*") {
        const nextpageid = requiredPage.nextpageid
        const pagelimit = requiredPage.pagelimit
        const skip = requiredPage.skip

        let idbasedpagination = 1

        if (Object.keys(sort).length && !sort.hasOwnProperty("_id")) {
          idbasedpagination = 0
        }

        if (idbasedpagination && nextpageid) {
          const sortValues = Object.values(sort)
          const ascordesc = sortValues.length === 0 || sortValues[sortValues.length - 1] === 1 ? "gt" : "lt"

          queryCursor = queryCursor.where("_id")[ascordesc](new ObjectId(nextpageid))
        } else {
          queryCursor = queryCursor.skip(skip)
        }

        queryCursor = queryCursor.limit(pagelimit)
      }

      if (hint) {
        queryCursor = queryCursor.hint(hint)
      }

      // Executing the query
      QureryData = await queryCursor.exec()

      ResultData = QureryData.map((obj) => obj.toJSON())

      let fieldorderdata = 0

      // Field order handling
      if (fieldorder) {
        let fieldorderModel = {}

        if (customdbconnection) {
          fieldorderModel = await customdbconnection.createmodel("tblfieldorder", new _FieldOrder())
        } else {
          fieldorderModel = await this.createmodel("tblfieldorder", new _FieldOrder())
        }

        fieldorderdata = await fieldorderModel["objModel"].findOne({ userid: RequestHeaders.uid, pagename: collectionName }, { _id: 0, fields: "$fields" })

        let fieldorder

        // Get FieldOrder From Schema Class
        if (typeof schemaObj.getFieldOrder === "function") {
          fieldorder = schemaObj.getFieldOrder()
        }

        const updateFieldOrder = []

        // If FieldOrder Exists
        if (fieldorder && fieldorder.fields && fieldorderdata) {
          fieldorderdata.fields.map((obj) => {
            const staticField = fieldorder.fields.find((obj1) => obj1.field === obj.field)

            if (staticField) {
              staticField.active = obj.active
              updateFieldOrder.push(staticField)
            }
          })
        }

        // Add New Static Field Order If Added
        if (fieldorder && fieldorder.fields) {
          fieldorder.fields.map((obj) => {
            let staticField = fieldorderdata?.fields.find((obj1) => obj1.field === obj.field)

            if (!staticField) updateFieldOrder.push(obj)
          })
        }

        // Freezed fields first
        updateFieldOrder.sort((a, b) => b.freeze - a.freeze)

        fieldorderdata = { fields: updateFieldOrder }
      }
      ResponseData.fromdb = this.DBName
      ResponseData.ResultData = ResultData
      ResponseData.fieldorderdata = fieldorderdata
    } catch (err) {
      //node_Error(err)
    }

    return ResponseData
  }

  async CountDocs(CollectionName, SchemaClassObj, pipeline = {}) {
    const DocumentsCount = await ObjSchemaModel["objModel"].countDocuments(pipeline)
    const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
    return DocumentsCount
  }

  async FindOne(CollectionName, SchemaClassObj, pipeline, sort = {}) {
    // let projection = {}
    // if (!allowprivatefields) {
    // 	for (const key of Object.keys(SchemaClassObj)) {
    // 		if (SchemaClassObj[key]?.private != undefined && SchemaClassObj[key]?.private == true) projection[key] = 0
    // 	}
    // }

    try {
      const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
      if (sort) {
        var ResultData = await ObjSchemaModel["objModel"].findOne(pipeline).sort(sort).collation({ locale: "en", strength: 1 }).lean()
      } else {
        var ResultData = await ObjSchemaModel["objModel"].findOne(pipeline).collation({ locale: "en", strength: 1 }).lean()
      }
      return ResultData
    } catch (err) {
      throw new Error(err)
    }
  }

  async Update(CollectionName, SchemaClassObj, pipeline, insertlog = false) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()

    var resp = {
      status: 400,
      message: errmsg["dberror"],
    }

    try {
      const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
      const result = await ObjSchemaModel["objModel"].updateOne(pipeline[0], pipeline[1])
      resp.data = result
      resp.status = 200
      resp.message = errmsg["update"]
      // return result
    } catch (err) {
      resp.message = errmsg["dberror"] + " " + err.toString()
      resp.status = 400

      // Duplicate Data Error
      if (err.code === 11000) {
        //node_Error(err)
        resp.message = errmsg["isexist"]
        resp.status = 409
      }
      // Requiredfield Error
      else if (err.name === "ValidationError") {
        resp.message = Object.values(err.errors)
          .map((val) => val.message)
          .toString()
        //resp.message=errmsg['required']
        resp.status = 400
      }
    }

    if (insertlog == true) {
      //insert Logs of Operation
      this.insertlogdata(_RequestBody, _RequestHeaders, _IpAddress, _URL, CollectionName, "u", resp.status, resp.message)
    }

    return resp
  }

  async UpdateByFilter(CollectionName, SchemaClassObj, pipeline, insertlog = false) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()

    var resp = {
      status: 400,
      message: errmsg["dberror"],
    }

    try {
      const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
      const result = await ObjSchemaModel["objModel"].updateOne(...pipeline)

      resp.data = result
      resp.status = 200
      resp.message = errmsg["update"]
      // return result
    } catch (err) {
      resp.message = errmsg["dberror"] + " " + err.toString()
      resp.status = 400

      // Duplicate Data Error
      if (err.code === 11000) {
        //node_Error(err)
        resp.message = errmsg["isexist"]
        resp.status = 409
      }
      // Requiredfield Error
      else if (err.name === "ValidationError") {
        resp.message = Object.values(err.errors)
          .map((val) => val.message)
          .toString()
        //resp.message=errmsg['required']
        resp.status = 400
      }
    }

    if (insertlog == true) {
      //insert Logs of Operation
      this.insertlogdata(_RequestBody, _RequestHeaders, _IpAddress, _URL, CollectionName, "u", resp.status, resp.message)
    }

    return resp
  }

  async UpdateMany(CollectionName, SchemaClassObj, pipeline) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()
    var resp = {
      status: 400,
      message: errmsg["dberror"],
    }

    try {
      const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)

      await ObjSchemaModel["objModel"].updateMany(pipeline[0], pipeline[1])
      resp.status = 200
      resp.message = errmsg["update"]
    } catch (err) {
      resp.message = errmsg["dberror1"] + " " + err.toString()
      resp.status = 400

      // Duplicate Data Error
      if (err.code === 11000) {
        //node_Error(err)
        resp.message = errmsg["isexist"]
        resp.status = 409
      }
      // Requiredfield Error
      else if (err.name === "ValidationError") {
        resp.message = Object.values(err.errors)
          .map((val) => val.message)
          .toString()
        //resp.message=errmsg['required']
        resp.status = 400
      }
    }
    return resp
  }

  async UpdateManyByFilter(CollectionName, SchemaClassObj, pipeline) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()
    var resp = {
      status: 400,
      message: errmsg["dberror"],
    }

    try {
      const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
      await ObjSchemaModel["objModel"].updateMany(...pipeline)

      resp.status = 200
      resp.message = errmsg["update"]
    } catch (err) {
      resp.message = errmsg["dberror1"] + " " + err.toString()
      resp.status = 400

      // Duplicate Data Error
      if (err.code === 11000) {
        //node_Error(err)
        resp.message = errmsg["isexist"]
        resp.status = 409
      }
      // Requiredfield Error
      else if (err.name === "ValidationError") {
        resp.message = Object.values(err.errors)
          .map((val) => val.message)
          .toString()
        //resp.message=errmsg['required']
        resp.status = 400
      }
    }
    return resp
  }

  async DeleteMany(CollectionName, SchemaClassObj, pipeline) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()

    var resp = {
      status: 400,
      message: errmsg["dberror"],
    }

    try {
      if (this.DBType == "MONGODB") {
        const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
        await ObjSchemaModel["objModel"].deleteMany(pipeline)

        resp.status = 200
        resp.message = errmsg["delete"]
      }
    } catch (err) {
      resp.message = errmsg["dberror"] + " " + err.toString()
      resp.status = 400
    }

    return resp
  }

  async InsertMany(CollectionName, SchemaClassObj, data) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()

    var resp = {
      status: 400,
      message: errmsg["dberror"],
    }
    try {
      if (this.DBType == "MONGODB") {
        const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
        await ObjSchemaModel["objModel"].insertMany(data)

        resp.status = 200
        resp.message = errmsg["insert"]
      }
    } catch (err) {
      resp.message = errmsg["dberror"] + " " + err.toString()
      resp.status = 400

      // Duplicate Data Error
      if (err.code === 11000) {
        resp.message = errmsg["isexist"]
        resp.status = 409
      }

      // Requiredfield Error
      else if (err.name === "ValidationError") {
        resp.message = Object.values(err.errors)
          .map((val) => val.message)
          .toString()
        //resp.message=errmsg['required']
        resp.status = 400
      }
    }

    return resp
  }

  getautoid(tblname) {
    if (this.DBType == "MONGODB") {
    }
  }

  // Get JWT Token
  async getjwt({ domainname = "", uid = "", unqkey = "", iss = "", useragent = "", aud = "", exph = "10hr" }) {
    const IISMethods = new _IISMethods()
    console.log(uid, unqkey, useragent, iss, aud, exph)

    if (iss && uid && unqkey && useragent) {
      // Payload
      const payload = {
        uid: uid,
        unqkey: unqkey,
        useragent: useragent,
      }

      if (domainname) {
        payload.domainname = domainname
      }
      console.log(payload)

      // Signing Options
      const signOptions = {
        issuer: iss,
        audience: aud,
        expiresIn: exph,
        algorithm: "RS256",
      }

      // Token Data
      const tokenExpiry = {
        unqkey: unqkey,
        uid: uid,
        iss: iss,
        useragent: useragent,
        exp: exph,
        entry_date: IISMethods.getdatetimestr(),
        isvalid: 1,
        token: jwt.sign(payload, privateKEY, signOptions),
        update_date: "",
      }

      //console.log("tokenexpire: ", tokenExpiry) //added

      // Add Token Expiry Data
      const tblentry = await this.executedata("i", new _Tokenexpiry(), "tblexpiry", tokenExpiry, false)
      // console.log(tblentry);

      return tokenExpiry.token
    }

    return null
  }

  // Validate JWT Token
  async validatejwt({ domainname = "", token = "", uid = "", unqkey = "", iss = "", useragent = "", aud = "", action = "" }) {
    const Config = new _Config()
    const IISMethods = new _IISMethods()

    const resp = {}
    let tokenResp = {}
    let checkdomain = true
    console.log("Verify token: ", token, uid, unqkey, iss, useragent, aud) //added
    try {
      if (uid.includes("guest-") || Config.actions.includes(action)) {
        checkdomain = false
      }

      const tokenPipeline = [{ $match: { uid: uid, unqkey: unqkey, token: token, isvalid: 1 } }]
      console.log("tokenpipline: ", tokenPipeline)

      tokenResp = await MainDB.getmenual("tblexpiry", new _Tokenexpiry(), tokenPipeline)
      console.log("tblexpire", tokenResp)

      if (tokenResp.ResultData.length) {
        const decoded = jwt.verify(token, publicKEY)
        console.log("Decode: ", decoded) //added

        if (
          decoded.uid === uid &&
          decoded.unqkey === unqkey &&
          decoded.iss === iss &&
          decoded.useragent === useragent
          // (checkdomain === false || decoded.domainname === domainname)
        ) {
          resp.status = 200
          resp.message = Config.getErrmsg()["tokenvalidate"]
        } else {
          resp.status = 401
          resp.message = Config.getErrmsg()["invalidtoken"]
        }
      } else {
        resp.status = 400
        resp.message = Config.getErrmsg()["invalidtoken"]
      }
    } catch (err) {
      console.log("jwt token 1", err)
      if (err instanceof jwt.TokenExpiredError) {
        if (action == "" || (Config.actions.includes(action) && !Config.invalidactions.includes(action))) {
          unqkey = IISMethods.generateuuid()
          resp.unqkey = unqkey

          if (checkdomain === false) {
            // await MainDB.executedata("d", new _Tokenexpiry(), "tblexpiry", delTokenPipeline, false)
            resp.key = await MainDB.getjwt({ uid, unqkey, iss, useragent, aud })
          } else {
            // await this.executedata("d", new _Tokenexpiry(), "tblexpiry", delTokenPipeline, false)
            resp.key = await this.getjwt({ domainname, uid, unqkey, iss, useragent, aud })
          }

          if (resp.key) {
            const deviceUpdatePipeline = [{ token }, { $set: { token: resp.key } }]
            await this.UpdateByFilter("tbldevice", new _Device(), deviceUpdatePipeline)
          }

          resp.status = 200
          resp.message = Config.getErrmsg()["tokenvalidate"]
        } else {
          resp.status = 401
          resp.message = Config.getErrmsg()["invalidtoken"]
        }
      } else {
        resp.status = 401
        resp.message = Config.getErrmsg()["invalidtoken"]
      }
    }

    return resp
  }

  // Authenticate User
  async authenticateuser(
    token,
    domainname,
    uid,
    unqkey,
    iss,
    useragent,
    aud,
    platform,
    userpagename,
    useraction,
    propertyid,
    userroleid,
    masterlisting,
    extraaction = "",
    extraformdataaction = {},
    action,
    checkreportto,
    checkapproveto,
    apptype
  ) {
    const Config = new _Config()
    const IISMethods = new _IISMethods()
    const ObjectId = IISMethods.getobjectid()

    try {
      // Validate token
      const resp = await this.validatejwt({ domainname, token, uid, unqkey, iss, useragent, aud, action })

      if (resp.status == 200) {
        if (uid.includes("guest-") !== false || userpagename == "Login") {
          // For Guest User Without login
          resp.status = 200
          resp.message = Config.getErrmsg()["uservalidate"]
          resp.rights = { all: 1, self: 1, managerequest: 1 }
        } else {
          // const personPipeline = [{ $match: { _id: ObjectId(uid) } }]
          // const person = await this.getmenual("tblpersonmaster", new _Person(), personPipeline)
          const person = await MainDB.getPersonData({ apptype: apptype, personid: [uid], pagename: userpagename })

          // Validate userroleid
          if (person.length) {
            const valid = person[0].userrole.find((o) => o.userroleid.toString() == userroleid)

            if (valid && person[0].isactive === 1) {
              // if (userpagename && useraction && companyid) {
              if (userpagename && useraction) {
                const userrights = await this.getUserRight({
                  uid,
                  propertyid: propertyid,
                  userroleid,
                  page: userpagename,
                  useraction,
                  checkreportto,
                  checkapproveto,
                  apptype,
                })

                if ((userrights && (userrights.rights["all"] === 1 || userrights.rights["self"] === 1)) || masterlisting === "true" || masterlisting === true) {
                  resp.status = 200
                  resp.message = Config.getErrmsg()["uservalidate"]
                  resp.rights = userrights.rights
                  resp.uid = userrights.uid
                } else {
                  resp.status = 400
                  resp.message = Config.getErrmsg()["userright"]
                }
              } else {
                resp.status = 400
                resp.message = Config.getErrmsg()["userright"]
              }
            } else {
              if (useraction !== "configure") {
                resp.status = 400
                resp.message = Config.getErrmsg()["deactivate"]
              } else {
                resp.status = 200
                resp.message = Config.getErrmsg()["uservalidate"]
              }
            }
          }
        }
      }

      return resp
    } catch (err) {
      // node_Error(err)
    }
  }

  async getBottomUserroles(userid) {
    try {
      const ObjectId = _mongoose.Types.ObjectId

      const person = await this.getPersonData({ apptype: 1, personid: [userid] })
      let personsRoles = person[0]?.userrole.map(function (k) {
        return k.userroleid.toString()
      })

      const hierarchyPipeline = [{ $match: {} }]
      const userroleHierarchyResp = await this.getmenual("tbluserrolehierarchy", new _UserRoleHierarchy(), hierarchyPipeline)

      //get bottom user roles
      async function getbottomroles(userroleid) {
        //get bottom userroles with tbl hiehrarchy
        var bottomuserroles = [userroleid]
        var fromnode
        function findnode(from) {
          if (from._id == userroleid) {
            fromnode = from
          } else {
            if (from.children.length !== 0) {
              var found = from.children.find((Obj) => Obj._id == userroleid)
              if (!found) {
                from.children.forEach(function (cobj) {
                  findnode(cobj)
                })
              } else {
                fromnode = found
              }
            }
          }
        }

        function getchildrens(find) {
          if (find.children.length !== 0) {
            find.children.forEach((obj) => {
              bottomuserroles.push(obj._id)
              getchildrens(obj)
            })
          }
        }

        if (userroleHierarchyResp.ResultData.length > 0) {
          findnode(userroleHierarchyResp.ResultData[0].userrolehierarchy)
        }
        if (fromnode) {
          getchildrens(fromnode)
        }
        return bottomuserroles
      }

      var accessuserroles = []

      for (const iterator of personsRoles) {
        let btmroles = []
        btmroles = await getbottomroles(iterator)
        btmroles.forEach(function (k) {
          if (!accessuserroles.includes(k.toString())) {
            accessuserroles.push(k.toString())
          }
        })
      }
      return accessuserroles
    } catch (err) {
      console.log(err)
    }
  }

  // async getBottomUserroles({  userroleid }) {
  //     const ObjectId = IISMethods.getobjectid()

  //     const userrolehierarchyPipeline = [{ $match: {  } }]
  //     const userrolehierarchy = await this.getmenual("tbluserrolehierarchy", new _UserRoleHierarchy(), userrolehierarchyPipeline)
  //     console.log("🚀 ~ getBottomUserroles ~ userrolehierarchy:", JSON.stringify(userrolehierarchy))

  //     const bottomuserroles = [userroleid]

  //     let fromnode

  //     function findnode(from){
  //         if (from._id === userroleid) {
  //             fromnode = from
  //         } else {
  //             if (from.children && from.children.length) {
  //                 const found = from.children.find((obj) => obj._id === userroleid)

  //                 if (!found) {
  //                     from.children.forEach((childobj) => {
  //                         findnode(childobj)
  //                     })
  //                 } else {
  //                     fromnode = found
  //                 }
  //             }
  //         }
  //     }

  //     function getchildrens = (find) => {
  //         if (find.children && find.children.length) {
  //             find.children.forEach((obj) => {
  //                 bottomuserroles.push(obj._id)
  //                 getchildrens(obj)
  //             })
  //         }
  //     }

  //     if (userrolehierarchy.ResultData.length && userrolehierarchy.ResultData[0].userrolehierarchy) {
  //         findnode(userrolehierarchy.ResultData[0].userrolehierarchy)
  //     }

  //     if (fromnode) {
  //         getchildrens(fromnode)
  //     }

  //     return bottomuserroles
  // }

  // Get User Rights
  async getUserRight({ uid, propertyid, userroleid, moduletypeid, page, useraction, person = {}, checkreportto = false, checkapproveto = false, apptype }) {
    const ObjectId = IISMethods.getobjectid()

    const result = {
      rights: { all: 0, self: 0, managerequest: 0 },
      page: page,
      useraction: useraction,
      userroleid: userroleid,
      uid: uid,
    }

    let isadmin = await this.IsSuperAdmin(uid)

    if (isadmin) {
      result.rights.all = 1
      result.rights.self = 1
      result.rights.managerequest = 1
      checkreportto = false
      checkapproveto = false

      return result
    } else {
      let all
      let self
      if (useraction == "viewright") {
        all = "allviewright"
        self = "selfviewright"
      } else if (useraction == "addright") {
        all = "alladdright"
        self = "selfaddright"
      } else if (useraction == "editright") {
        all = "alleditright"
        self = "selfeditright"
      } else if (useraction == "delright") {
        all = "alldelright"
        self = "selfdelright"
      }

      try {
        let userRights = []
        if (!Object.keys(person).length) {
          const personResp = await MainDB.getPersonData({ apptype: apptype, personid: [uid], pagename: page })
          person = personResp[0]
          // const personPipeline = { _id: uid, isactive: 1 }
          // person = await this.FindOne("tblpersonmaster", new _Person(), personPipeline)
        }

        const accessuserroles = []

        for (const userrole of person.userrole) {
          const bottomuserroles = await this.getBottomUserroles(uid)

          bottomuserroles.forEach((userroleid) => {
            if (!accessuserroles.includes(userroleid)) {
              accessuserroles.push(userroleid)
            }
          })
        }

        // get rights with userid
        const userrightsByPersonPipeline = [
          { $match: { propertyid: propertyid, personid: uid, alias: page } },
          { $project: { [all]: 1, [self]: 1, requestright: 1 } },
          { $sort: { [all]: -1, [self]: -1 } },
        ]
        const userrightsByPerson = await this.getmenual("tbluserrights", new _Userrights(), userrightsByPersonPipeline)

        // not found with person
        if (userrightsByPerson.ResultData.length) {
          userRights = userrightsByPerson.ResultData
        } else if (person) {
          // get rights with userrole
          const userrightsByUserrolePipeline = [
            { $match: { propertyid: propertyid, userroleid: { $in: person.userrole.map((obj) => obj.userroleid.toString()) }, alias: page } },
            { $project: { [all]: 1, [self]: 1, requestright: 1 } },
            { $sort: { [all]: -1, [self]: -1 } },
          ]

          const userrightsByUserrole = await this.getmenual("tbluserrights", new _Userrights(), userrightsByUserrolePipeline)

          userRights = userrightsByUserrole.ResultData
        }

        if (userRights.length !== 0) {
          result.rights.all = userRights[0][all]
          result.rights.self = userRights[0][self]
          result.rights.managerequest = userRights[0].requestright || 0

          if (result.rights.all === 1) {
            // get bottom userroles with tbl hiehrarchy
            // const bottomuserroles = await this.getBottomUserroles({
            // 	propertyid: propertyid,
            // 	userroleid: userroleid
            // })

            const personPipeline = [
              { $match: { "userrole.userroleid": { $in: accessuserroles.map((userroleid) => ObjectId(userroleid)) } } },
              { $project: { userrole: 1, reportingtos: 1, approvetos: 1 } },
            ]

            const personResp = await this.getmenual("tblemployee", new _Employee(), personPipeline)
            const personData = personResp.ResultData

            let personids = [uid]
            // get all approveto and reportingto id of bottom
            // const personData = await MainDB.getPersonData({ apptype: apptype, personid: [uid], pagename: page })
            // let personids = [uid]

            const hold = []

            function getReporting(personid, reportingperson = [], type = 0) {
              var allperson = personData.filter((o) => Array.isArary(o.reportingtos) && o.reportingtos.find((obj) => obj.reportingtoid.toString() == personid))

              if (type === 1) {
                allperson = personData.filter((o) => Array.isArray(o.approvetos) && o.approvetos.find((obj) => obj.approvetoid.toString() == personid))
              }

              if (type === 2) {
                allperson = personData.filter(
                  (o) =>
                    (Array.isArray(o.approvetos) && o.approvetos.find((obj) => obj.approvetoid.toString() == personid)) ||
                    (Array.isArray(o.reportingtos) && o.reportingtos.find((obj) => obj.reportingtoid.toString() == personid))
                )
              }

              if (allperson.length) {
                for (const p of allperson) {
                  if (p._id != personid) {
                    if (!reportingperson.includes(p._id.toString())) {
                      reportingperson.push(p._id.toString())
                    }
                    getReporting(p._id.toString(), reportingperson)
                  }
                }
              }
              return reportingperson
            }

            if (checkreportto || checkapproveto) {
              if (checkreportto == true && checkapproveto == false) {
                personData.forEach(function (person) {
                  if (
                    Array.isArray(person.reportingtos) &&
                    person.reportingtos.find((reportingto) => reportingto.reportingtoid && personids.includes(reportingto.reportingtoid.toString()))
                  ) {
                    personids.push(person._id.toString())
                  } else {
                    hold.push(person._id.toString())
                  }
                })

                personData.forEach(function (person) {
                  if (
                    Array.isArray(person.reportingtos) &&
                    person.reportingtos.find((reportingto) => reportingto.reportingtoid && personids.includes(reportingto.reportingtoid.toString())) &&
                    !personids.includes(person._id.toString())
                  ) {
                    personids.push(person._id.toString())
                  }
                })

                personids = getReporting(uid, personids)
              } else if (checkreportto == false && checkapproveto == true) {
                personData.forEach(function (person) {
                  if (
                    Array.isArray(person.approvetos) &&
                    person.approvetos.find((approveto) => approveto.approvetoid && personids.includes(approveto.approvetoid.toString()))
                  ) {
                    personids.push(person._id.toString())
                  } else {
                    hold.push(person._id.toString())
                  }
                })

                personData.forEach(function (person) {
                  if (
                    Array.isArray(person.approvetos) &&
                    person.approvetos.find((approveto) => approveto.approvetoid && personids.includes(approveto.approvetoid.toString())) &&
                    !personids.includes(person._id.toString())
                  ) {
                    personids.push(person._id.toString())
                  }
                })

                personids = getReporting(uid, personids, 1)
              } else {
                personData.forEach(function (person) {
                  if (
                    (Array.isArray(person.approvetos) &&
                      person.approvetos.find((approveto) => approveto.approvetoid && personids.includes(approveto.approvetoid.toString()))) ||
                    (Array.isArray(person.reportingtos) &&
                      person.reportingtos.find((reportingto) => reportingto.reportingtoid && personids.includes(reportingto.reportingtoid.toString())))
                  ) {
                    personids.push(person._id.toString())
                  } else {
                    hold.push(person._id.toString())
                  }
                })

                personData.forEach(function (person) {
                  if (
                    ((Array.isArray(person.approvetos) &&
                      person.approvetos.find((approveto) => approveto.approvetoid && personids.includes(approveto.approvetoid.toString()))) ||
                      (Array.isArray(person.reportingtos) &&
                        person.reportingtos.find((reportingto) => reportingto.reportingtoid && personids.includes(reportingto.reportingtoid.toString())))) &&
                    !personids.includes(person._id.toString())
                  ) {
                    personids.push(person._id.toString())
                  }
                })

                personids = getReporting(uid, personids, 2)
              }
            } else {
              personData.forEach(function (person) {
                personids.push(person._id.toString())
              })
            }

            result.uid = personids
          }
        }

        return result
      } catch (err) {
        //node_Error(err)
      }
    }
  }

  async getPersonData({ apptype = 1, personid = [], pagename = "", projection, pipeline }) {
    try {
      const ObjectId = IISMethods.getobjectid()
      let PersonResp = []

      const PersonId = personid?.map((obj) => ObjectId(obj))
      const personPipeline = [{ $match: { _id: { $in: PersonId } } }]

      if (projection) {
        personPipeline.push({ $project: projection })
      }

      // if(pipeline){
      //     personPipeline.push(pipeline)
      // }
      console.log(JSON.stringify(personPipeline))

      if (apptype == 1 || pagename == "employee") {
        const EmployeeData = await MainDB.getmenual("tblemployee", new _Employee(), personPipeline)
        PersonResp = EmployeeData.ResultData
      } else if (apptype == 2 || pagename == "gatekeeper") {
        const GatekeeperData = await MainDB.getmenual("tblgatekeeper", new _GateKeeper(), personPipeline)
        PersonResp = GatekeeperData.ResultData
      } else if (apptype == 3 || pagename == "customer") {
        const CustomerData = await MainDB.getmenual("tblcustomer", new _Customer(), personPipeline)
        PersonResp = CustomerData.ResultData
      }

      return PersonResp
    } catch (error) {
      console.log("👉 ~ file: DB.js:1588 ~ getPersonData ~ error:", error)
    }
  }

  async getPersonDataUpdate({ apptype = 0, pagename = "", personObj = {} }) {
    try {
      const ObjectId = IISMethods.getobjectid()
      let PersonResp = []

      if (apptype == 1 || pagename == "employee") {
        PersonResp = await MainDB.executedata("u", new _Employee(), "tblemployee", personObj)
      } else if (apptype == 2 || pagename == "gatekeeper") {
        PersonResp = await MainDB.executedata("u", new _GateKeeper(), "tblgatekeeper", personObj)
      } else if (apptype == 3 || pagename == "customer") {
        PersonResp = await MainDB.executedata("u", new _Customer(), "tblcustomer", personObj)
      }

      console.log("🚀 ~ getPersonDataUpdate ~ PersonResp:", PersonResp)
      return PersonResp
    } catch (error) {
      console.log("👉 ~ file: DB.js:1588 ~ getPersonData ~ error:", error)
    }
  }

  async EmployeeEmails(emailto, igonreActiveAccount = true) {
    const ObjectId = IISMethods.getobjectid()
    var emailtoids = []
    var emails = []

    emailto.forEach(function (data) {
      if (IISMethods.ValidateObjectId(data)) {
        emailtoids.push(ObjectId(data))
      } else {
        emails.push(data)
      }
    })

    //get emailid of person
    const employeepipeline = [{ $match: { _id: { $in: emailtoids } } }, { $project: { personemail: 1, isactive: 1 } }]

    if (igonreActiveAccount == false) {
      employeepipeline.push({ $match: { isactive: 1 } })
    }
    const employeeResp = await this.getmenual("tblemployee", new _Employee(), employeepipeline)

    employeeResp.ResultData.forEach(function (data) {
      emails.push(data.personemail)
    })
    return emails
  }

  //role wise menu
  async getMenu(moduleTypeId, userdata, isadmin, platform = 1, propertyid) {
    // use to filter the rights based on roles
    function rolebasedrightsfilter(mainarray) {
      const ORUserrights = []
      mainarray.forEach(function (r) {
        let push = r

        let find = ORUserrights.find((f) => r.alias == f.alias)
        let findIndex = ORUserrights.findIndex((f) => r.alias == f.alias)

        if (find) {
          push.alladdright = find.alladdright || r.alladdright
          push.allexportdata = find.allexportdata || r.allexportdata
          push.allimportdata = find.allimportdata || r.allimportdata
          push.alldelright = find.alldelright || r.alldelright
          push.alleditright = find.alleditright || r.alleditright
          push.allfinancialdata = find.allfinancialdata || r.allfinancialdata
          push.allprintright = find.allprintright || r.allprintright
          push.allviewright = find.allviewright || r.allviewright
          push.changepriceright = find.changepriceright || r.changepriceright
          push.requestright = find.requestright || r.requestright
          push.selfaddright = find.selfaddright || r.selfaddright
          push.selfdelright = find.selfdelright || r.selfdelright
          push.selfeditright = find.selfeditright || r.selfeditright
          push.selffinancialdata = find.selffinancialdata || r.selffinancialdata
          push.selfprintright = find.selfprintright || r.selfprintright
          push.selfviewright = find.selfviewright || r.selfviewright
          ORUserrights[findIndex] = push
        } else {
          ORUserrights.push(push)
        }
      })
      return ORUserrights
    }

    // user to covert the array in the tree format
    function treedatamaker(mainarray) {
      let convertarray = []
      mainarray.forEach(function (arrayItem) {
        if (arrayItem.isparent == 1) {
          var newchildren = []
          mainarray.forEach(function (childArrayItem) {
            if (arrayItem.menuid.toString() == childArrayItem.parentid.toString() && childArrayItem.isparent !== 1) {
              newchildren.push(childArrayItem)
            }
          })
          arrayItem.children = newchildren
          convertarray.push(arrayItem)
        }
      })
      return convertarray
    }

    const ObjectId = _mongoose.Types.ObjectId
    let menuData = []

    //get data from design-tbl with userid
    const designResp = await this.getmenual("tblmenudesignmaster", new _MenuDesign(), [
      { $match: { moduletypeid: new ObjectId(moduleTypeId) } },
      { $match: { $or: [{ userid: new ObjectId(userdata._id.toString()) }, { isdefaultmenu: 1 }] } },
      { $sort: { isdefaultmenu: 1 } },
      { $limit: 1 },
    ])

    //get data from assign-tbl
    let menuassignpipeline = [{ $match: { moduletypeid: moduleTypeId } }, { $addFields: { children: [], title: "$menuname", expanded: true } }]

    if (platform == 2) {
      menuassignpipeline.unshift({ $match: { forandroid: 1 } })
    } else if (platform == 3) {
      menuassignpipeline.unshift({ $match: { forios: 1 } })
    }

    const assignResp = await this.getmenual("tblmenuassignmaster", new _MenuAssign(), menuassignpipeline)
    const assignResponseData = assignResp.ResultData

    //convert assign data format to tree
    const assignDataFormated = treedatamaker(assignResponseData)

    //Check if userrole is Admin
    if (isadmin) {
      //check if data is available in design table
      if (designResp.ResultData.length == 0) {
        menuData = assignDataFormated
      } else {
        const designResponseData = designResp.ResultData[0].menudesigndata

        //Combine data form design and assign
        var combinedData = []

        //add from design if it exists in assign
        designResponseData.forEach(function (designObj) {
          var isExist = assignResponseData.find((assignObj) => assignObj.alias == designObj.alias)
          if (isExist !== undefined) {
            combinedData.push(designObj)
          }
        })

        //add from assign if it does not exist
        assignResponseData.forEach(function (assignObj) {
          var isExist = designResponseData.find((designObj) => designObj.alias == assignObj.alias)
          if (isExist === undefined) {
            combinedData.push(assignObj)
          }
        })

        //convert combineData format to tree
        const combinedDataFormated = treedatamaker(combinedData)
        menuData = combinedDataFormated
      }
    } else {
      var rightsResponseData = []

      //Get user rights with userid
      const rightsRespwithuser = await this.getmenual("tbluserrights", new _Userrights(), [
        { $match: { personid: userdata._id.toString(), propertyid: propertyid } },
        { $match: { moduletypeid: moduleTypeId } },
        { $match: { $or: [{ allviewright: 1 }, { selfviewright: 1 }] } },
      ])

      // Get user rights with userroleid
      if (rightsRespwithuser.ResultData.length == 0) {
        let rolesFrom = userdata.userrole.map(function (rl) {
          return rl.userroleid.toString()
        })

        var userrightswithrolepipeline = [
          { $match: { moduletypeid: moduleTypeId, propertyid: propertyid } },
          { $match: { $or: [{ allviewright: 1 }, { selfviewright: 1 }] } },
          { $match: { userroleid: { $in: rolesFrom } } },
        ]

        const rightsRespwithuserrole = await this.getmenual("tbluserrights", new _Userrights(), userrightswithrolepipeline)
        rightsResponseData = rightsRespwithuserrole.ResultData

        const ORUserrights = rolebasedrightsfilter(rightsResponseData)
        rightsResponseData = ORUserrights
      } else {
        rightsResponseData = rightsRespwithuser.ResultData
      }

      if (designResp.ResultData.length == 0) {
        //data from assign and rights
        var combineAssignRights = []

        //add from assign if right exist
        assignResponseData.forEach(function (assignObj) {
          var isExist = rightsResponseData.find((rightObj) => rightObj.alias == assignObj.alias)
          if (isExist !== undefined || assignObj.containright !== 1) {
            combineAssignRights.push(assignObj)
          }
        })

        //convert combineData format to tree
        const combineAssignRightsFormated = treedatamaker(combineAssignRights)
        menuData = combineAssignRightsFormated
      } else {
        const designResponseData = designResp.ResultData[0].menudesigndata

        var combineDesignRights = []

        //add from design if it exist in rights
        designResponseData.forEach(function (designObj) {
          var isExist = rightsResponseData.find((rightObj) => rightObj.alias == designObj.alias)
          if (isExist !== undefined || designObj.containright != 1) {
            combineDesignRights.push(designObj)
          }
        })

        //add from rights if it does exists in design
        rightsResponseData.forEach(function (rightObj) {
          var isExist = designResponseData.find((designObj) => designObj.alias == rightObj.alias)
          if (isExist === undefined) {
            //find from menu assign
            var respMenu = assignResponseData.find((assignObj) => assignObj.alias == rightObj.alias)
            if (respMenu !== undefined) {
              combineDesignRights.push(respMenu)
            }
          }
        })

        //convert combineData format to tree
        const combineDesignRightsFormated = treedatamaker(combineDesignRights)
        menuData = combineDesignRightsFormated
      }
    }

    return menuData
  }

  // get upper level person of login user
  async gethierarchy_personwiseidarray(parentid, idarray = [], subdbobj) {
    const ObjectId = IISMethods.getobjectid()
    let pipeline = [
      {
        $match: {
          _id: ObjectId(parentid),
        },
      },
    ]
    const personResp = await subdbobj.getmenual("tblpersonmaster", new _Person(), pipeline)
    const PersonData = personResp.ResultData

    var allreporter = idarray
    for (const personData of PersonData) {
      allreporter.push({ _id: personData._id, userrole: personData.userrole })
      if (personData.reportingtoid) {
        allreporter = subdbobj.gethierarchy_personwiseidarray(personData.reportingtoid.toString(), allreporter, subdbobj)
      }
    }
    // personData.forEach(function (personData) {
    //     idarray.push(personData._id.toString())
    //     idarray = subdbobj.gethierarchy_personwiseidarray(personData.reportingtoid.toString(), allreporter,subdbobj)
    // })
    return allreporter
  }

  // GENERATE SERIES NO
  async getseriesno(
    propertyid,
    seriesid,
    type,
    schema,
    idate, // canteenid,seriesid,type,idate
    maxid = 0
  ) {
    const ObjectId = _mongoose.Types.ObjectId
    let now = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "")

    // If idate exists, override now with it
    if (idate) {
      now = String(idate)
    }

    // Safely handle the substring operation
    const dateyear = now.substring(0, 4)
    const datemonth = now.substring(5, 7)

    var tablename = "tbl" + type.toLowerCase()
    // if (type.toLowerCase() === "customer") {
    //     tablename += "master"
    // }

    const seriesPipeline = [{ $match: { _id: seriesid } }]
    const seriesResp = await this.getmenual("tblseriesmaster", new _Series(), seriesPipeline)

    //get series type
    const seriestypePipeline = [{ $match: { _id: seriesResp.ResultData[0].seriestypeid } }]
    // const seriesTypeResp = await this.getmenual("tblseriestype", new _SeriesType(), seriestypePipeline)
    const seriesTypeResp = await MainDB.getmenual("tblseriestype", new _SeriesType(), seriestypePipeline)

    const seriesstart = seriesResp.ResultData[0].startnumber
    const seriesend = seriesResp.ResultData[0].noofseries || 0
    const serieslen = seriesend.toString().length
    const seriesprefix = seriesResp.ResultData[0].prefix
    const seriesinfinite = seriesResp.ResultData[0]?.isinfinite || 0

    if (seriesTypeResp.ResultData[0]?.hasproperty) {
      //get property prefix
      var propertyResp, propertyPrefix
      if (propertyid !== "") {
        propertyResp = await this.getmenual("tblproperty", new Propertycommon(), [{ $match: { _id: propertyid } }])
        propertyPrefix = propertyResp.ResultData[0].prefix
      }
    }

    //get maximum id
    // let maxidResp = await this.getmenual(tablename,schema ,[{$match:{seriesid:seriesid}},{$sort:{maxid:-1}},{$limit:1},{$project:{maxid:1}}])
    let err = 0
    let maxidResp
    var iid
    console.log("table name", tablename)
    if (type === "property") {
      maxidResp = await this.getmenual(tablename, schema, [
        { $match: { seriesid: ObjectId(seriesid) } },
        { $sort: { _id: -1 } },
        { $limit: 1 },
        { $project: { maxid: "$maxid", recordinfo: "$recordinfo" } },
      ])
    } else {
      maxidResp = await this.getmenual(tablename, schema, [
        { $match: { seriesid: ObjectId(seriesid) } },
        { $sort: { _id: -1 } },
        { $limit: 1 },
        { $project: { maxid: "$maxid", recordinfo: "$recordinfo" } },
      ])
    }

    if (maxid) {
      iid = maxid
    } else {
      if (maxidResp.ResultData?.length > 0) {
        if (seriesend <= maxidResp.ResultData[0].maxid && !seriesinfinite) {
          err = 1
        }

        const respElements = seriesResp.ResultData[0]?.elements

        const month = respElements.filter((obj) => obj.elementid.toString() == Config.serieselement.currentmonth)
        const year = respElements.filter(
          (obj) => obj.elementid.toString() == Config.serieselement.currentyear && obj.elementid.toString() != Config.serieselement.currentmonth
        )

        if (month.length || year.length) {
          if (maxidResp?.ResultData[0].recordinfo?.entrydate?.substring(0, 7) != now.substring(0, 7) && month.length && seriesinfinite != 1) {
            iid = seriesstart
          } else if (maxidResp?.ResultData[0].recordinfo?.entrydate?.substring(0, 4) != now.substring(0, 4) && year.length && seriesinfinite != 1) {
            iid = seriesstart
          } else {
            iid = maxidResp.ResultData[0].maxid + 1
          }
        } else {
          iid = maxidResp.ResultData[0].maxid + 1
        }
      } else {
        iid = seriesstart
      }
    }

    var seriesno = ""

    if (seriesid) {
      const seriesPipeline = [{ $match: { _id: new ObjectId(seriesid) } }]
      const seriesResp = await this.getmenual("tblseriesmaster", new _Series(), seriesPipeline)

      const respElements = seriesResp.ResultData[0]?.elements

      // var startyear = seriesResp.ResultData[0].startdate.substring(0, 4);
      // var endyear = seriesResp.ResultData[0].enddate.substring(2, 4);

      for (let i = 0; i < respElements?.length; i++) {
        var eleid = respElements[i].elementid
        eleid = eleid.toString()

        var startyear = now.substring(0, 4)
        var endyear = now.substring(2, 4)

        //branch prefix
        if (eleid == "623bee87278a8e4326f1adec") {
          seriesno = seriesno + propertyPrefix
        }
        //series prefix
        else if (eleid == "623bef98278a8e4326f1adf4") {
          seriesno = seriesno + seriesprefix
        }
        //saparator (-)
        else if (eleid == "623bef49278a8e4326f1adf1") {
          seriesno = seriesno + "-"
        }
        //saparator (/)
        else if (eleid == "623bef65278a8e4326f1adf2") {
          seriesno = seriesno + "/"
        }
        // current month (MM)
        else if (eleid == "623beefe278a8e4326f1adef") {
          seriesno = seriesno + datemonth
        }
        //current year (20XX)
        else if (eleid == "623bef1d278a8e4326f1adf0") {
          seriesno = seriesno + dateyear
        } else if (eleid == "628f1bd20af5f3828824f8c0") {
          seriesno = seriesno + dateyear.substring(2, 4)
        }
        //Current FY (20XX/YY)
        else if (eleid == "623beeda278a8e4326f1aded") {
          seriesno = seriesno + startyear + "/" + endyear
        }
        //Current FY (20XX-YY)
        else if (eleid == "623beee7278a8e4326f1adee") {
          seriesno = seriesno + startyear + "-" + endyear
        }
        //series number
        else if (eleid == "623bef78278a8e4326f1adf3") {
          var number = iid.toString().padStart(serieslen, "0")
          seriesno = seriesno + number
        }
      }
    }

    if (err) {
      return "err"
    }

    return seriesno
  }

  async getmaxid(seriesid, type, schema, propertyid = "") {
    const ObjectId = _mongoose.Types.ObjectId
    var now = new Date().toISOString().replace(/T/, "").replace(/\..+/, "")

    var tablename = "tbl" + type.toLowerCase()
    if (type.toLowerCase() === "person" || type.toLowerCase() === "opening" || type.toLowerCase() === "loan") {
      tablename += "master"
    }

    let pipeline = []

    pipeline = [{ $match: { seriesid: seriesid } }, { $sort: { _id: -1 } }, { $limit: 1 }, { $project: { maxid: "$maxid", recordinfo: "$recordinfo" } }]

    //get maximum id
    const maxidResp = await this.getmenual(tablename, schema, pipeline)

    const seriesPipeline = [{ $match: { _id: seriesid } }]
    const seriesResp = await this.getmenual("tblseriesmaster", new _Series(), seriesPipeline)
    const seriesend = seriesResp.ResultData[0]?.noofseries
    const seriesinfinite = seriesResp.ResultData[0]?.isinfinite || 0

    const respElements = seriesResp.ResultData[0]?.elements

    const month = respElements?.filter((obj) => obj.elementid.toString() == Config.serieselement?.currentmonth)
    const year = respElements?.filter((obj) => obj.elementid.toString() == Config.serieselement?.currentyear && obj.elementid.toString() != Config.serieselement?.currentmonth)

    var iid
    if (maxidResp.ResultData.length) {
      if (
        // (typeof maxidResp?.ResultData[0]?.recordinfo?.entrydate === "string" && maxidResp?.ResultData[0]?.recordinfo?.entrydate.substring(0, 7) != now.substring(0, 7)) && seriesinfinite != 1
        maxidResp?.ResultData[0]?.recordinfo?.entrydate.substring(0, 7) != now.substring(0, 7) &&
        month?.length &&
        seriesinfinite != 1
      ) {
        iid = 1
      } else if (maxidResp?.ResultData[0].recordinfo?.entrydate?.substring(0, 4) != now.substring(0, 4) && year.length && seriesinfinite != 1) {
        iid = 1
      } else if (seriesend <= maxidResp.ResultData[0].maxid && seriesinfinite != 1) {
        iid = 1
      } else {
        iid = maxidResp.ResultData[0].maxid + 1
      }
    } else {
      iid = 1
    }
    return iid
  }

  async getMaxId(type, schema) {
    let tablename = "tbl" + type.toLowerCase()
    if (type.toLowerCase() === "person" || type.toLowerCase() === "opening") {
      tablename += "master"
    }

    var pipeline = [{ $sort: { maxid: -1 } }, { $limit: 1 }, { $project: { maxid: 1 } }]
    //get maximum id
    const maxidResp = await this.getmenual(tablename, schema, pipeline)
    var iid
    if (maxidResp.ResultData.length > 0) {
      iid = maxidResp.ResultData[0].maxid + 1
    } else {
      iid = 1
    }
    return iid
  }

  async IsSuperAdmin(id) {
    try {
      const Config = new _Config()

      const ObjectId = _mongoose.Types.ObjectId
      let resp = []
      if (id && typeof id == "string" && !id?.includes("guest-") && id?.length == 24 && ObjectId.isValid(id)) {
        const pipeline = [{ $match: { _id: ObjectId(id), "userrole.userroleid": ObjectId(Config.getAdminutype()) } }]
        resp = await this.getmenual("tblemployee", new _Employee(), pipeline)
      }

      if (resp?.ResultData?.length) {
        return true
      } else {
        return false
      }
    } catch (e) {
      //node_Error(e);
    }
  }

  async IsAdmin(id) {
    try {
      const Config = new _Config()

      const ObjectId = _mongoose.Types.ObjectId
      let resp = []
      if (id && typeof id == "string" && !id?.includes("guest-") && id?.length == 24 && ObjectId.isValid(id)) {
        const pipeline = [{ $match: { _id: ObjectId(id), "userrole.userroleid": ObjectId(Config.getAdminutype()) } }]
        resp = await this.getmenual("tblpersonmaster", new _Person(), pipeline)
      }

      if (resp?.ResultData?.length) {
        return true
      } else {
        return false
      }
    } catch (e) {
      // node_Error(e);
    }
  }

  // Get Platform Policy Menu
  async GetPlatformPolicyMenu({ req, person, requestIP }) {
    try {
      const ObjectId = IISMethods.getobjectid()

      const platformaccesspolicyIds = person.platformaccesspolicy.map((obj) => obj.policyid)

      const platformaccesspolicyPipeline = [
        { $match: { _id: { $in: platformaccesspolicyIds }, moduletypeid: ObjectId(Config.moduletype[req.headers.moduletype]) } },
        {
          $addFields: {
            allowedmenu: {
              $filter: {
                input: "$data",
                as: "item",
                cond: {
                  $or: [{ $in: ["0.0.0.0", "$$item.allowips.ip"] }, { $in: [requestIP, "$$item.allowips.ip"] }],
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            allowedmenu: 1,
          },
        },
      ]
      const platformaccesspolicyResp = await this.getmenual("tblplatformaccesspolicy", new _PlatformAccessPolicy(), platformaccesspolicyPipeline)
      const platformaccesspolicyData = platformaccesspolicyResp.ResultData

      const allowedmenualias = []

      for (const platformaccesspolicy of platformaccesspolicyData) {
        for (const menu of platformaccesspolicy.allowedmenu) {
          allowedmenualias.push(menu.alias)
        }
      }

      return allowedmenualias
    } catch (err) {
      //node_Error(err)

      return []
    }
  }

  // MAIL SYSTEM --------------------------------------------------------------------------------------------------------------------------- MAIL SYSTEM //
  async sendMail(
    emailfrom,
    emailto,
    templateid,
    subject = "",
    data = {},
    files = "",
    bcc = "",
    cc = "",
    sendername = "",
    emailhostid = "",
    attachments = [],
    refdata = {},
    tonames = []
  ) {
    try {
      const ObjectId = _mongoose.Types.ObjectId
      var template
      var body

      if (IISMethods.ValidateObjectId(templateid)) {
        //get template from type
        const emailtemplatePipeline = [{ $match: { _id: new ObjectId(templateid) } }]
        const emailtemplateResp = await this.getmenual("tblemailtemplatemaster", new _EmailTemplate(), emailtemplatePipeline)

        template = emailtemplateResp.ResultData[0]

        //make body
        body = this.createBody(template.body, data)
      } else {
        template = templateid
        let tempbody = await IISMethods.getFileContent(template.body, "utf8")
        body = tempbody
        body = this.createBody(body, data)
      }

      //HOST SETUP----------------------------------------------------------------------------------//
      var mailsmtpPipeline = [{ $match: { default: 1 } }]

      var transporterdata = {
        pool: false,
        host: "localhost",
        port: 1025,
        secure: false,
        auth: {
          user: "project.1",
          pass: "secret.1",
        },
      }

      if (emailhostid !== "") {
        mailsmtpPipeline = [{ $match: { _id: new ObjectId(emailhostid) } }]
      } else if (template.emailhostid) {
        mailsmtpPipeline = [{ $match: { _id: template.emailhostid } }]
      }

      //get transporter from database
      const emailSmtpResp = await this.getmenual("tblemailsmtp", new _EmailSMTP(), mailsmtpPipeline)

      if (emailSmtpResp.ResultData.length > 0) {
        transporterdata = {
          host: emailSmtpResp.ResultData[0].host,
          port: emailSmtpResp.ResultData[0].port,
          secure: false,
          tls: {
            ciphers: "SSLv3",
            rejectUnauthorized: false,
          },
          auth: {
            user: emailSmtpResp.ResultData[0].username,
            pass: emailSmtpResp.ResultData[0].password,
          },
        }
      }

      // var transporter = nodemailer.createTransport(transporterdata);
      //-------------------------------------------------------------------------------------HOST SETUP//

      //RECEIVER SETUP----------------------------------------------------------------------------------//

      // var emailtoids = emailto.filter((id) => IISMethods.ValidateObjectId(id))
      var emailtoids = []
      var emails = []

      emailto.forEach(function (data) {
        if (IISMethods.ValidateObjectId(data)) {
          emailtoids.push(new ObjectId(data))
        } else {
          emails.push(data)
        }
      })

      //get emailid of person
      const personPipeline = [{ $match: { _id: { $in: emailtoids } } }, { $project: { personemail: 1 } }]
      const personResp = await this.getmenual("tblpersonmaster", new _Person(), personPipeline)

      personResp.ResultData.forEach(function (data) {
        emails.push(data.personemail)
      })

      const receivers = emails.toString()

      //----------------------------------------------------------------------------------RECEIVER SETUP//

      //SENDING MAIL------------------------------------------------------------------------------------//

      //with other thread
      const worker = new Worker("./workers/sendmail.js", {
        workerData: {
          // mailtransporter: transporter,
          mailemailfrom: emailfrom == "" ? emailSmtpResp.ResultData[0].email : emailfrom,
          to: receivers,
          mailsubject: subject == "" ? template.subject : subject, // Subject line
          text: "", // plain text body
          html: body, // html body
          mailattachments: attachments,
          mailbcc: bcc,
          mailcc: cc,
          mytransporterdata: transporterdata,
        },
      })

      //Listen for a message from worker
      worker.once("message", async (result) => {
        // node_Log(`Email Sent`)

        if (Object.keys(refdata).length !== 0) {
          let emaildata = {
            from: emailfrom == "" ? emailSmtpResp.ResultData[0].email : emailfrom,
            datetime: IISMethods.getdatetimeisostr(),
            to: receivers,
            subject: subject == "" ? template.subject : subject,
            body: body,
            bcc: bcc,
            cc: cc,
            host: transporterdata.host,
            port: transporterdata.port,
            type: refdata.type,
            // refdata:refdata,
            tonames: tonames,
            recordinfo: refdata.recordinfo,
          }

          delete refdata.recordinfo

          let adddata = { ...refdata, ...data }
          emaildata.refdata = adddata

          if (emailSmtpResp.ResultData.length > 0) {
            emaildata.smtpid = emailSmtpResp.ResultData[0]._id
          }

          //store log
          const resp = await this.executedata("i", new _EmailLogs(), "tblemaillog", emaildata)
        }
      })

      worker.on("error", (error) => {
        // node_Log("🚀 ~ file: DB.js:1916 ~ DB ~ error:", error)
      })

      worker.on("exit", (exitCode) => {
        // node_Log("🚀 ~ file: DB.js:1918 ~ DB ~ exitCode:", exitCode)
      })

      //------------------------------------------------------------------------------------SENDING MAIL//
    } catch (e) {
      // node_Error(e);
    }
  }

  async sendMail_New(
    emailfrom,
    emailto,
    templateid,
    subject = "",
    data = {},
    files = "",
    bcc = "",
    cc = "",
    sendername = "",
    emailhostid = "",
    attachments = [],
    refdata = {},
    tonames = []
  ) {
    try {
      const ObjectId = _mongoose.Types.ObjectId
      var template
      var body

      if (IISMethods.ValidateObjectId(templateid)) {
        //get template from type
        const emailtemplatePipeline = [{ $match: { _id: new ObjectId(templateid) } }]
        const emailtemplateResp = await this.getmenual("tblemailtemplatemaster", new _EmailTemplate(), emailtemplatePipeline)

        template = emailtemplateResp.ResultData[0]

        //make body
        body = this.createBody(template.body, data)
      } else {
        template = templateid
        let tempbody = await IISMethods.getFileContent(template.body, "utf8")
        body = tempbody
        body = this.createBody(body, data)
      }

      //HOST SETUP----------------------------------------------------------------------------------//
      var mailsmtpPipeline = [{ $match: { default: 1 } }]

      var transporterdata = {
        pool: false,
        host: "localhost",
        port: 1025,
        secure: false,
        auth: {
          user: "project.1",
          pass: "secret.1",
        },
      }

      if (emailhostid !== "") {
        mailsmtpPipeline = [{ $match: { _id: new ObjectId(emailhostid) } }]
      } else if (template.emailhostid) {
        mailsmtpPipeline = [{ $match: { _id: template.emailhostid } }]
      }

      //get transporter from database
      const emailSmtpResp = await this.getmenual("tblemailsmtp", new _EmailSMTP(), mailsmtpPipeline)

      if (emailSmtpResp.ResultData.length > 0) {
        transporterdata = {
          host: emailSmtpResp.ResultData[0].host,
          port: emailSmtpResp.ResultData[0].port,
          secure: false,
          tls: {
            ciphers: "SSLv3",
            rejectUnauthorized: false,
          },
          auth: {
            user: emailSmtpResp.ResultData[0].username,
            pass: emailSmtpResp.ResultData[0].password,
          },
        }
      }

      // var transporter = nodemailer.createTransport(transporterdata);
      //-------------------------------------------------------------------------------------HOST SETUP//

      //RECEIVER SETUP----------------------------------------------------------------------------------//

      // var emailtoids = emailto.filter((id) => IISMethods.ValidateObjectId(id))
      var emailtoids = []
      var emails = []

      emailto.forEach(function (data) {
        if (IISMethods.ValidateObjectId(data)) {
          emailtoids.push(new ObjectId(data))
        } else {
          emails.push(data)
        }
      })

      //get emailid of person
      const personPipeline = [{ $match: { _id: { $in: emailtoids } } }, { $project: { personemail: 1 } }]
      const personResp = await this.getmenual("tblpersonmaster", new _Person(), personPipeline)

      personResp.ResultData.forEach(function (data) {
        emails.push(data.personemail)
      })

      const receivers = emails.toString()

      //----------------------------------------------------------------------------------RECEIVER SETUP//

      //SENDING MAIL------------------------------------------------------------------------------------//

      //with other thread
      const worker = new Worker("./workers/sendmail.js", {
        workerData: {
          // mailtransporter: transporter,
          mailemailfrom: emailfrom == "" ? emailSmtpResp.ResultData[0].email : emailfrom,
          to: receivers,
          mailsubject: subject == "" ? template.subject : subject, // Subject line
          text: "", // plain text body
          html: body, // html body
          mailattachments: attachments,
          mailbcc: bcc,
          mailcc: cc,
          mytransporterdata: transporterdata,
        },
      })

      //Listen for a message from worker
      worker.once("message", async (result) => {
        // node_Log(`Email Sent`)

        if (Object.keys(refdata).length !== 0) {
          let emaildata = {
            from: emailfrom == "" ? emailSmtpResp.ResultData[0].email : emailfrom,
            datetime: IISMethods.getdatetimeisostr(),
            to: receivers,
            subject: subject == "" ? template.subject : subject,
            body: body,
            bcc: bcc,
            cc: cc,
            host: transporterdata.host,
            port: transporterdata.port,
            type: refdata.type,
            // refdata:refdata,
            tonames: tonames,
            recordinfo: refdata.recordinfo,
          }

          delete refdata.recordinfo

          let adddata = { ...refdata, ...data }
          emaildata.refdata = adddata

          if (emailSmtpResp.ResultData.length > 0) {
            emaildata.smtpid = emailSmtpResp.ResultData[0]._id
          }

          //store log
          const resp = await this.executedata("i", new _EmailLogs(), "tblemaillog", emaildata)
        }
      })

      worker.on("error", (error) => {
        // node_Log("🚀 ~ file: DB.js:1916 ~ DB ~ error:", error)
      })

      worker.on("exit", (exitCode) => {
        //node_Log("🚀 ~ file: DB.js:1918 ~ DB ~ exitCode:", exitCode)
      })

      //------------------------------------------------------------------------------------SENDING MAIL//
    } catch (e) {
      // node_Error(e);
    }
  }

  createBody(body, data) {
    let startIndex = 0
    let result = []
    for (let strchar = 0; strchar <= body.length; strchar++) {
      if (body.charAt(strchar) === "#") {
        startIndex = strchar
      } else if (body.charAt(strchar) === "?") {
        result.push(body.substring(parseInt(startIndex), parseInt(strchar) + 1))
      }
    }

    for (let i = -0; i < result.length; i++) {
      body = body.replaceAll(result[i], data[result[i].substring(1, result[i].length - 1)])
    }

    return body
  }

  async getAvailabelSeriesDataForSurvey(seriesResponse) {
    if (seriesResponse.length) {
      for (var seriesResult of seriesResponse) {
        let maxid = await this.getmaxid(seriesResult._id, "surveyresponse", new _SurveyResponse())
        if (seriesResult.noofseries > maxid || seriesResult.isinfinite == 1) {
          return seriesResult
        }
      }
    }
    return null
  }

  async UpdateMany_new(CollectionName, ObjModel, pipeline) {
    const Config = new _Config()
    const errmsg = Config.getErrmsg()

    var resp = {
      status: 400,
      message: errmsg["dberror"],
    }

    try {
      await ObjModel["objModel"].updateMany(pipeline[0], pipeline[1])
      resp.status = 200
      resp.message = errmsg["update"]
    } catch (err) {
      resp.message = errmsg["dberror1"] + " " + err.toString()
      resp.status = 400

      // Duplicate Data Error
      if (err.code === 11000) {
        //node_Error(err)
        resp.message = errmsg["isexist"]
        resp.status = 409
      }
      // Requiredfield Error
      else if (err.name === "ValidationError") {
        resp.message = Object.values(err.errors)
          .map((val) => val.message)
          .toString()
        //resp.message=errmsg['required']
        resp.status = 400
      }
    }
    return resp
  }

  async BulkWrite(CollectionName, SchemaClassObj, pipeline) {
    var resp = {
      status: 400,
      message: Config.errmsg["dberror"],
    }
    try {
      if (this.DBType == "MONGODB") {
        const ObjSchemaModel = await this.createmodel(CollectionName, SchemaClassObj)
        const temp = await ObjSchemaModel["objModel"].bulkWrite(pipeline)

        resp.status = 200
        resp.message = Config.errmsg["success"]
      }
      return resp
    } catch (err) {
      resp.message = Config.errmsg["dberror"] + " " + err.toString()
      resp.status = 400
      return resp
    }
  }

  async getusersdevices(userids) {
    //fetch device tokens of assignee from tbldevice
    const fetchdevicepipeline = [{ $match: { uid: { $in: userids } } }]
    const deviceResp = await this.getmenual("tbldevice", new _Device(), fetchdevicepipeline)
    var tokens = deviceResp.ResultData.map(function (data) {
      return data.deviceid
    })
    return tokens
  }

  async getDeviceTokensOld({ userids, moduletype = "", moduletypeid, checkrights = null, groupby = false }) {
    const ObjectId = IISMethods.getobjectid()
    let userRightsData = []
    if (checkrights) {
      userRightsData = await this.getPersonUserRightsWise(userids, checkrights.propertyid, checkrights.pagealias, checkrights.rights)
    }

    const devicePipeline = [{ $match: { uid: { $in: userids }, moduletypeid: { $in: moduletypeid } } }]

    const deviceResp = await this.getmenual("tbldevice", new _Device(), devicePipeline)

    if (moduletype === "chat") {
      const chatsettingPipeline = [{ $match: { personid: { $in: userids.map((id) => ObjectId(id)) } } }]
      const chatsettingResp = await this.getmenual("tblchatsetting", new _ChatSetting(), chatsettingPipeline)

      return deviceResp.ResultData.map((device) => {
        const chatsetting = chatsettingResp.ResultData.find((obj) => obj.personid.toString() === device.uid)

        const chatNotificationSetting = {
          Normal: {
            channelId: chatsetting ? chatsetting.standardnotifysound.soundkey : Config.chatNotificationSetting["Normal"].soundkey,
            notificationSound: chatsetting ? chatsetting.standardnotifysound.soundname : Config.chatNotificationSetting["Normal"].soundname,
            notificationEnable: chatsetting ? chatsetting.standardnotifysound.notificationenable : Config.chatNotificationSetting["Normal"].notificationenable,
          },
          Imp: {
            channelId: chatsetting ? chatsetting.impnotifysound.soundkey : Config.chatNotificationSetting["Imp"].soundkey,
            notificationSound: chatsetting ? chatsetting.impnotifysound.soundname : Config.chatNotificationSetting["Imp"].soundname,
            notificationEnable: chatsetting ? chatsetting.impnotifysound.notificationenable : Config.chatNotificationSetting["Imp"].notificationenable,
          },
          Urgent: {
            channelId: chatsetting ? chatsetting.urgentnotifysound.soundkey : Config.chatNotificationSetting["Urgent"].soundkey,
            notificationSound: chatsetting ? chatsetting.urgentnotifysound.soundname : Config.chatNotificationSetting["Urgent"].soundname,
            notificationEnable: chatsetting ? chatsetting.urgentnotifysound.notificationenable : Config.chatNotificationSetting["Urgent"].notificationenable,
          },
          guestmessage: {
            channelId: chatsetting ? chatsetting.guestnotifysound.soundkey : Config.chatNotificationSetting["guestmessage"].soundkey,
            notificationSound: chatsetting ? chatsetting.guestnotifysound.soundname : Config.chatNotificationSetting["guestmessage"].soundname,
            notificationEnable: chatsetting ? chatsetting.guestnotifysound.notificationenable : Config.chatNotificationSetting["guestmessage"].notificationenable,
          },
          reminder: {
            channelId: chatsetting ? chatsetting.remindernotifysound?.soundkey : Config.chatNotificationSetting["reminder"].soundkey,
            notificationSound: chatsetting ? chatsetting.remindernotifysound?.soundname : Config.chatNotificationSetting["reminder"].soundname,
            notificationEnable: chatsetting ? chatsetting.remindernotifysound?.notificationenable : Config.chatNotificationSetting["reminder"].notificationenable,
          },
          reaction: {
            channelId: chatsetting ? chatsetting.reactionnotifysound?.soundkey : Config.chatNotificationSetting["reaction"].soundkey,
            notificationSound: chatsetting ? chatsetting.reactionnotifysound?.soundname : Config.chatNotificationSetting["reaction"].soundname,
            notificationEnable: chatsetting ? chatsetting.reactionnotifysound?.notificationenable : Config.chatNotificationSetting["reaction"].notificationenable,
          },
        }

        return { platform: device.platform, deviceid: device.deviceid, chatNotificationSetting, macaddress: device.macaddress, uid: device.uid }
      })
    }

    if (checkrights) {
      var deviceResult = deviceResp.ResultData.filter(
        (obj) =>
          userRightsData.filter((right) => right.moduletypeid?.toString() == obj.moduletypeid?.toString() && right.personid == obj.uid).length ||
          obj.moduletypeid?.toString() == Config.moduletype.guestexperience
      )
    } else {
      var deviceResult = deviceResp.ResultData /* .map((device) => device.deviceid) */
    }

    if (groupby == true) {
      let guest = {},
        other = {}
      let guestData = deviceResult.filter((obj) => obj.moduletypeid?.toString() == Config.moduletype.guestexperience)
      guest.token = [...new Set(guestData.map((device) => device.deviceid))]
      guest.userids = [...new Set(guestData.map((device) => device.uid))]

      let otherData = deviceResult.filter((obj) => obj.moduletypeid?.toString() != Config.moduletype.guestexperience)
      other.token = [...new Set(otherData.map((device) => device.deviceid))]
      other.userids = [...new Set(otherData.map((device) => device.uid))]
      return { guest: guest, other: other }
    }
    return deviceResult.map((device) => device.deviceid)
  }

  async getDeviceTokens({ userids = [], moduletype = "", moduletypeid, checkrights = null, groupby = false, logintype }) {
    const ObjectId = IISMethods.getobjectid()

    const devicePipeline = [{ $match: { uid: { $in: userids }, moduletypeid: { $in: moduletypeid } } }]
    const deviceResp = await this.getmenual("tbldevice", new _Device(), devicePipeline)

    const personPipeline = [{ $match: { _id: { $in: userids?.map((id) => ObjectId(id)) }, isactive: 1 } }, { $project: { isappnotificationdnd: 1, iswebnotificationdnd: 1 } }]
    const personResp = await this.getmenual("tblpersonmaster", new _Person(), personPipeline)

    const deviceTokens = deviceResp?.ResultData?.filter((obj) => {
      const person = personResp?.ResultData?.find((ob) => ob._id.toString() === obj.uid)

      if (person) {
        if (
          (obj.moduletypeid === Config.moduletype["app"] && person.isappnotificationdnd === 1) ||
          (obj.moduletypeid === Config.moduletype["web"] && person.iswebnotificationdnd === 1)
        ) {
          return false
        }

        if (moduletypeid.includes(Config.moduletype["web"])) {
          try {
            jwt.verify(obj.token ? obj.token : "", publicKEY)
          } catch (err) {
            return false
          }
        }

        return true
      } else {
        return false
      }
    })

    if (moduletype === "chat") {
      const chatsettingPipeline = [{ $match: { personid: { $in: userids.map((id) => ObjectId(id)) } } }]
      const chatsettingResp = await this.getmenual("tblchatsetting", new _ChatSetting(), chatsettingPipeline)

      return deviceTokens?.map((device) => {
        const chatsetting = chatsettingResp.ResultData?.find((obj) => obj.personid.toString() === device.uid)

        const chatNotificationSetting = {
          Normal: {
            channelId: chatsetting ? chatsetting.standardnotifysound.soundkey : Config.chatNotificationSetting["Normal"].soundkey,
            notificationSound: chatsetting ? chatsetting.standardnotifysound.soundname : Config.chatNotificationSetting["Normal"].soundname,
            notificationEnable: chatsetting ? chatsetting.standardnotifysound.notificationenable : Config.chatNotificationSetting["Normal"].notificationenable,
          },
          Imp: {
            channelId: chatsetting ? chatsetting.impnotifysound.soundkey : Config.chatNotificationSetting["Imp"].soundkey,
            notificationSound: chatsetting ? chatsetting.impnotifysound.soundname : Config.chatNotificationSetting["Imp"].soundname,
            notificationEnable: chatsetting ? chatsetting.impnotifysound.notificationenable : Config.chatNotificationSetting["Imp"].notificationenable,
          },
          Urgent: {
            channelId: chatsetting ? chatsetting.urgentnotifysound.soundkey : Config.chatNotificationSetting["Urgent"].soundkey,
            notificationSound: chatsetting ? chatsetting.urgentnotifysound.soundname : Config.chatNotificationSetting["Urgent"].soundname,
            notificationEnable: chatsetting ? chatsetting.urgentnotifysound.notificationenable : Config.chatNotificationSetting["Urgent"].notificationenable,
          },
          guestmessage: {
            channelId: chatsetting ? chatsetting.guestnotifysound.soundkey : Config.chatNotificationSetting["guestmessage"].soundkey,
            notificationSound: chatsetting ? chatsetting.guestnotifysound.soundname : Config.chatNotificationSetting["guestmessage"].soundname,
            notificationEnable: chatsetting ? chatsetting.guestnotifysound.notificationenable : Config.chatNotificationSetting["guestmessage"].notificationenable,
          },
          reminder: {
            channelId: chatsetting ? chatsetting.remindernotifysound?.soundkey : Config.chatNotificationSetting["reminder"].soundkey,
            notificationSound: chatsetting ? chatsetting.remindernotifysound?.soundname : Config.chatNotificationSetting["reminder"].soundname,
            notificationEnable: chatsetting ? chatsetting.remindernotifysound?.notificationenable : Config.chatNotificationSetting["reminder"].notificationenable,
          },
          reaction: {
            channelId: chatsetting ? chatsetting.reactionnotifysound?.soundkey : Config.chatNotificationSetting["reaction"].soundkey,
            notificationSound: chatsetting ? chatsetting.reactionnotifysound?.soundname : Config.chatNotificationSetting["reaction"].soundname,
            notificationEnable: chatsetting ? chatsetting.reactionnotifysound?.notificationenable : Config.chatNotificationSetting["reaction"].notificationenable,
          },
        }

        return { platform: device.platform, deviceid: device.deviceid, chatNotificationSetting, macaddress: device.macaddress, uid: device.uid }
      })
    }

    let deviceResult = deviceTokens || []

    if (checkrights) {
      const userRightsData = await this.getPersonUserRightsWise(userids, checkrights.propertyid, checkrights.pagealias, checkrights.rights)

      deviceResult = deviceTokens?.filter(
        (obj) =>
          userRightsData.filter(
            (right) =>
              (right.moduletypeid?.toString() == obj.moduletypeid?.toString() && right.personid == obj.uid) || (right.uid == obj.uid && right.userroleid == Config.adminutype)
          ) || obj.moduletypeid?.toString() === Config.moduletype.guestexperience
      )
    }

    if (groupby == true) {
      const guest = {},
        other = {}

      const guestData = deviceResult.filter((obj) => obj.moduletypeid?.toString() == Config.moduletype.guestexperience)
      guest.token = [...new Set(guestData.map((device) => device.deviceid))]
      guest.userids = [...new Set(guestData.map((device) => device.uid))]

      const otherData = deviceResult.filter((obj) => obj.moduletypeid?.toString() != Config.moduletype.guestexperience)
      other.token = [...new Set(otherData.map((device) => device.deviceid))]
      other.userids = [...new Set(otherData.map((device) => device.uid))]

      return { guest: guest, other: other }
    }

    return deviceResult.map((device) => device.deviceid)
  }

  async getPersonUserRightsWise(personIds, propertyid, pageAlias, rights = []) {
    const ObjectId = IISMethods.getobjectid()

    // ****************************** Check userights to send notification ******************************/
    let aliasApp = pageAlias?.app || ""
    let aliasWeb = pageAlias?.web || ""
    let aliasChat = pageAlias?.chat || ""
    let aliasDesktop = pageAlias?.desktop || ""
    let aliasGuestexperience = pageAlias?.guestexperience || ""

    let alias = []
    if (aliasApp) {
      alias.push(aliasApp)
    }
    if (aliasWeb) {
      alias.push(aliasWeb)
    }
    if (aliasChat) {
      alias.push(aliasChat)
    }
    if (aliasDesktop) {
      alias.push(aliasDesktop)
    }
    if (aliasGuestexperience) {
      alias.push(aliasGuestexperience)
    }
    const getUserRightsPipeline = [
      {
        $match: {
          propertyid: ObjectId(propertyid),
          // alias: { $in: alias },
          $and: [
            {
              $or: [{ personid: { $in: personIds } }, { userroleid: { $ne: "" } }],
            },
            {
              $or: [{ allviewright: 1 }, { selfviewright: 1 }],
            },
          ],
        },
      },
    ]

    for (let right of rights) {
      if (right == "addright") {
        getUserRightsPipeline.push({
          $match: {
            $or: [
              {
                alladdright: 1,
              },
              {
                selfaddright: 1,
              },
            ],
          },
        })
      }

      if (right == "editright") {
        getUserRightsPipeline.push({
          $match: {
            $or: [
              {
                alleditright: 1,
              },
              {
                selfeditright: 1,
              },
            ],
          },
        })
      }

      if (right == "delright") {
        getUserRightsPipeline.push({
          $match: {
            $or: [
              {
                alldelright: 1,
              },
              {
                selfdelright: 1,
              },
            ],
          },
        })
      }

      if (right == "requestright") {
        getUserRightsPipeline.push({ $match: { requestright: 1 } })
      }
    }

    const userRightsResp = await this.getmenual("tbluserrights", new _Userrights(), getUserRightsPipeline)
    let userRightsData = userRightsResp.ResultData

    // ****************************** Check Person wise rights ******************************/
    let rightsPersonWiseData = userRightsData.filter((obj) => obj.personid)
    let rightsPersonId = rightsPersonWiseData.map((obj) => obj.personid)
    rightsPersonWiseData = rightsPersonWiseData.filter((obj) => alias.includes(obj.alias))

    // Get person wise not assigned userrights personids
    let noneOfRightsPersonId = personIds.filter((personid) => !rightsPersonId.includes(personid))
    // ****************************** Check Person wise rights ******************************/

    // Not assigned userrights personwise for  Userrole wise userrights
    let makePersonRightsArray = []

    if (noneOfRightsPersonId.length) {
      //Get not assigned userrights person's userrole userrights from tbluserrights

      // ****************************** Check userrole wise userrights ******************************/
      const personPipeline = [{ $match: { _id: { $in: noneOfRightsPersonId.map((objid) => ObjectId(objid)) } } }, { $project: { userrole: 1 } }]
      const personResp = await this.getmenual("tblpersonmaster", new _Person(), personPipeline)

      for (let person of personResp.ResultData) {
        let personUserRoleId = person.userrole.map((userrole) => userrole.userroleid.toString()) //map userroles of persons

        let userRightsFindData = userRightsData.filter(
          (rights) =>
            personUserRoleId.includes(rights.userroleid) &&
            alias.includes(rights.alias) &&
            (rights.allviewright == 1 || rights.selfviewright == 1) &&
            rights.propertyid.toString() == propertyid.toString()
        )

        if (userRightsFindData.length) {
          for (let userRight of userRightsFindData) {
            userRight.personid = person._id?.toString()
            makePersonRightsArray.push({ ...userRight })
          }
        } else {
          //Super admin rights
          if (personUserRoleId.includes(Config.adminutype)) {
            makePersonRightsArray.push({
              uid: person._id?.toString(),
              userroleid: Config.adminutype,
            })
          }
        }
      }
      // ****************************** Check userrole wise userrights ******************************/
    }
    return rightsPersonWiseData.concat(makePersonRightsArray)
    // ****************************** Check userights to send notification ******************************/
  }

  async getPersonUserroleData(personIds) {
    const ObjectId = IISMethods.getobjectid()
    const pipeline = [{ $match: { _id: { $in: personIds } } }, { $project: { userrole: 1 } }]
    const resp = await this.getmenual("tblpersonmaster", new _Person(), pipeline)

    return resp.ResultData
  }

  // NOTIFICATION --------------------------------------------------------------------------------------------------------------------------- NOTIFICATION //

  async sendNotification(tousers, payload, webpush = "") {
    const config = new _Config()
    //create data
    var notificationData = []
    const time = IISMethods.getdatetimestr()

    tousers.forEach(function (user) {
      notificationData.push({
        title: payload.title,
        body: payload.body,
        type: payload.type,
        pagename: payload.pagename,
        receiverid: user,
        status: 0,
        star: 0,
        time: time,
        recordinfo: payload.recordinfo,
      })
    })

    const resp = await this.InsertMany("tblnotification", new _Notification(), notificationData)

    if (resp.status == 200) {
      var send = {
        title: payload.title,
        body: payload.body,
        type: payload.type,
        pagename: payload.pagename,
        status: 0,
        star: 0,
        time: time,
      }

      if (webpush) {
        //fetch user subsriptions
        const fetchsubpipeline = [{ $match: { uid: { $in: userids } } }]
        const subResp = await this.getmenual("tblsubscription", new _Device(), fetchsubpipeline)

        for (const obj of subResp) {
        }
      }
    }
  }

  // NOTIFICATION --------------------------------------------------------------------------------------------------------------------------- NOTIFICATION //

  getNotificationAlias(categoryid) {
    var alias = ""
    if (FieldConfig.housekeeperIds.includes(categoryid.toString())) {
      alias = FieldConfig.housekeepingAlias
    } else if (FieldConfig.maintenanceIds.includes(categoryid.toString())) {
      alias = FieldConfig.maintenanceAlias
    }

    return { alias: alias }
  }

  async isNotificationEnable(subDomain, personid, alias = "", statustype = "") {
    const ObjectId = IISMethods.getobjectid()

    const notisettingRecord = await SubDBPool[subDomain].getmenual("tblnotificationsetting", new NotificationSetting(), [
      { $match: { personid: ObjectId(personid), alias: alias, "statusarray.statustype": statustype, "statusarray.isselected": 1 } },
    ])

    return notisettingRecord.ResultData.length ? true : false
  }

  getDBName() {
    return this.DBName
  }

  setDBName(DBName) {
    this.DBName = DBName
  }

  getDBUser() {
    return this.DBUser
  }

  setDBUser(DBUser) {
    this.DBUser = DBUser
  }

  getDBHost() {
    return this.DBHost
  }

  setDBHost(DBHost) {
    this.DBHost = DBHost
  }

  getDBPass() {
    return this.DBPass
  }

  setDBPass(DBPass) {
    this.DBPass = DBPass
  }

  getDBPort() {
    return this.DBPort
  }

  setDBPort(DBPort) {
    this.DBPort = DBPort
  }

  getDBType() {
    return this.DBType
  }

  setDBType(DBType) {
    this.DBType = DBType
  }

  getDBConn() {
    return this.DBConn
  }

  setDBConn(DBConn) {
    this.DBConn = DBConn
  }

  async getSuperAdminWisePersonIds(propertyid = null, isstring = false) {
    const ObjectId = IISMethods.getobjectid()
    const pipeline = []
    if (propertyid) {
      // pipeline.push({ $match: { "property.propertyid": ObjectId(propertyid) } })
      pipeline.push({
        $match: {
          $or: [{ "property.propertyid": ObjectId(propertyid) }],
        },
      })
    }
    pipeline.push({ $project: { _id: 1 } })
    const resp = await this.getmenual("tblemployee", new _Employee(), pipeline)
    const PersonResp = resp.ResultData
    if (isstring) {
      return PersonResp.map((obj) => obj._id.toString())
    }
    return PersonResp.map((obj) => obj._id)
  }

  async getPersonByUserroleHierarchyForScheduler(personid, propertyid, ignorepersonid = Config.dummyObjid, personlist = [], userrolehierarchylist = []) {
    const ObjectId = IISMethods.getobjectid()

    let person = null
    if (personlist.length) {
      person = personlist.find((p) => p._id.toString() == personid.toString())
    } else {
      const personPipeline = { _id: ObjectId(personid) }
      person = await this.FindOne("tblpersonmaster", new _Person(), personPipeline)
    }

    if (person) {
      let userrolehierarchy = { ResultData: [] }
      if (userrolehierarchy.length) {
        userrolehierarchy.ResultData = userrolehierarchylist.filter((hierarchy) => hierarchy.propertyid.toString() == propertyid.toString())
      } else {
        const userrolehierarchyPipeline = [{ $match: { propertyid: ObjectId(propertyid) } }]
        userrolehierarchy = await this.getmenual("tbluserrolehierarchy", new _UserRoleHierarchy(), userrolehierarchyPipeline)
      }

      let hierarchy = userrolehierarchy.ResultData[0]?.userrolehierarchy || {}

      const userroleids = person?.userrole.map((data) => data.userroleid.toString())

      const upperUserroles = new Set()

      function findHierarchy(node, parents) {
        if (userroleids.includes(node._id)) {
          for (const parentId of parents) {
            if (!userroleids.includes(parentId)) {
              upperUserroles.add(parentId)
            }
          }
        }

        for (const child of node.children || []) {
          findHierarchy(child, [...parents, node._id])
        }
      }

      findHierarchy(hierarchy, [])

      const upperUserrolesArr = Array.from(upperUserroles)
      if (upperUserrolesArr.length) {
        let userroleWisePersonResp = { ResultData: [] }
        if (personlist.length) {
          userroleWisePersonResp.ResultData = personlist
            .filter((p) => {
              let personuserroleids = p.userrole.map((role) => role?.userroleid?.toString())
              let propertyids = p.property.map((singleproperty) => singleproperty?.propertyid?.toString())
              let schedulepropertyids = p.schedulerproperty.map((singleschedulerproperty) => singleschedulerproperty?.propertyid?.toString())

              // let userrolefound = upperUserrolesArr.find((data)=> personuserroleids.includes(data.toString()))
              let userrolefound = personuserroleids.find((data) => upperUserrolesArr.includes(data.toString()))
              if (
                p._id.toString() != ignorepersonid &&
                userrolefound &&
                (propertyids.includes(propertyid.toString()) || schedulepropertyids.includes(propertyid.toString()))
              ) {
                return true
              }
            })
            .map((p) => {
              return {
                _id: p._id,
                personname: p.personname,
                userrole: p.userrole,
              }
            })
        } else {
          const userroleWisePersonPipeline = [
            {
              $match: {
                $or: [{ "property.propertyid": ObjectId(propertyid) }, { "schedulerproperty.propertyid": ObjectId(propertyid) }],
                // "property.propertyid": ObjectId(propertyid),
                "userrole.userroleid": { $in: upperUserrolesArr.map((data) => ObjectId(data)) },
                _id: { $ne: ObjectId(ignorepersonid) },
              },
            },
            { $project: { _id: 1, userrole: 1, personname: 1 } },
          ]

          userroleWisePersonResp = await this.getmenual("tblpersonmaster", new _Person(), userroleWisePersonPipeline)
        }
        // const userroleWisePersonResp = await this.getmenual("tblpersonmaster", new _Person(), userroleWisePersonPipeline)

        return userroleWisePersonResp.ResultData
      } else {
        return []
      }
    } else {
      return []
    }
  }

  // get all approver
  async getPersonApproverData(personId, getCurrentPersonId = false, propertyid = "") {
    const ObjectId = IISMethods.getobjectid()
    const pipeline = [{ $project: { approvetoid: 1, userrole: 1, property: 1 } }]
    const resp = await this.getmenual("tblpersonmaster", new _Person(), pipeline)
    const personResp = resp.ResultData
    const personDataArray = []
    const PersonHierarchy = (approvetoid) => {
      let FindPerson = personResp.find((person) => {
        let personapprovingId = person?.approvetoid || ""
        return person._id.toString() == approvetoid.toString() && personapprovingId.toString() != personId.toString()
      })
      if (FindPerson) {
        if (FindPerson._id.toString() != personId.toString() || getCurrentPersonId) {
          var isvalidperson = 1
          if (propertyid) {
            let findproperty = FindPerson?.property?.find((obj) => obj.propertyid.toString() == propertyid.toString())
            if (!findproperty) {
              isvalidperson = 0
            }
          }
          if (isvalidperson) {
            personDataArray.push(FindPerson)
          }
        }
        if (FindPerson?.approvetoid) {
          PersonHierarchy(FindPerson.approvetoid)
        }
      }
    }

    PersonHierarchy(personId)

    return personDataArray
  }

  async getAllBottomApproverAndReporter(Personid = "", reportingperson = 0) {
    const ObjectId = IISMethods.getobjectid()

    var added = []
    var reportingpersons = []

    reportingpersons.push(ObjectId(Personid))

    const pipeline = [{ $project: { approvetos: 1, userrole: 1, property: 1, reportingtos: 1 } }]
    const personResp = await this.getmenual("tblpersonmaster", new _Person(), pipeline)

    function getAllApprover(personid) {
      var allperson = personResp.ResultData?.filter((o) => Array.isArray(o.approvetos) && o.approvetos.find((obj) => obj.approvetoid.toString() == personid))

      if (allperson.length > 0) {
        for (const p of allperson) {
          if (p._id.toString() != personid) {
            if (!added.includes(p._id.toString())) {
              reportingpersons.push(p)
              added.push(p._id.toString())
            }
            getAllApprover(p._id.toString())
          }
        }
      }
    }

    function getAllReporting(personid) {
      var allperson = personResp.ResultData.filter((o) => Array.isArray(o.reportingtos) && o.reportingtos.find((obj) => obj.reportingtoid.toString() == personid))

      if (allperson.length > 0) {
        for (const p of allperson) {
          if (p._id.toString() != personid) {
            if (!added.includes(p._id.toString())) {
              reportingpersons.push(p)
              added.push(p._id.toString())
            }
            getAllReporting(p._id.toString())
          }
        }
      }
    }

    if (reportingperson == 1) {
      getAllReporting(Personid)
    } else {
      getAllApprover(Personid)
    }

    return reportingpersons
  }

  async getPersonUserroleData(personIds, moduletypeid = "") {
    const ObjectId = IISMethods.getobjectid()
    let pipeline = [{ $match: { _id: { $in: personIds } } }, { $project: { userrole: 1 } }]

    if (moduletypeid && moduletypeid == Config.moduletype["web"]) {
      pipeline.push({ $match: { iswebnotificationdnd: 0 } })
    } else if (moduletypeid && moduletypeid == Config.moduletype["app"]) {
      pipeline.push({ $match: { isappnotificationdnd: 0 } })
    }

    const resp = await this.getmenual("tblpersonmaster", new _Person(), pipeline)

    return resp.ResultData
  }

  async getUserroleHierarchy(userroleid) {
    const userrolehierarchyPipeline = [{ $match: {} }, { $limit: 1 }, { $project: { userrolehierarchy: 1 } }]
    const userrolehierarchy = await this.getmenual("tbluserrolehierarchy", new _UserRoleHierarchy(), userrolehierarchyPipeline)

    let hierarchy = userrolehierarchy.ResultData[0]?.userrolehierarchy || {}

    const userroleids = [userroleid]

    const upperUserroles = new Set()

    function findHierarchy(node, parents) {
      if (userroleids === node._id) {
        // Direct comparison instead of `includes`
        for (const parentId of parents) {
          if (!upperUserroles.has(parentId)) {
            // Prevent duplicates
            upperUserroles.add(parentId)
          }
        }
      }

      for (const child of node.children || []) {
        findHierarchy(child, [...parents, node._id])
      }
    }

    // Run the hierarchy finding
    findHierarchy(hierarchy, [])

    const upperUserrolesArr = Array.from(upperUserroles)
    return upperUserrolesArr
  }

  async getPersonHierarchyId(PersonId, ToString = false) {
    const ObjectId = IISMethods.getobjectid()
    const pipeline = [{ $project: { reportingtoid: 1 } }]
    const resp = await this.getmenual("tblpersonmaster", new _Person(), pipeline)
    const PersonResp = resp.ResultData
    const PersonIdArray = []
    const PersonHierarchy = (reportingtoid) => {
      let FindPerson = PersonResp.find((person) => person._id.toString() == reportingtoid.toString())
      if (FindPerson?.reportingtoid) {
        if (FindPerson?.reportingtoid?.toString() != PersonId) {
          if (ToString) {
            PersonIdArray.push(FindPerson.reportingtoid.toString())
          } else {
            PersonIdArray.push(ObjectId(FindPerson.reportingtoid))
          }
        }
        PersonHierarchy(FindPerson.reportingtoid)
      }
    }
    PersonHierarchy(PersonId)
    return PersonIdArray
  }

  async getPersonReportingData(personId, getCurrentPersonId = false, propertyid = "") {
    const ObjectId = IISMethods.getobjectid()
    const pipeline = [{ $project: { reportingtoid: 1, userrole: 1, property: 1 } }]
    const resp = await this.getmenual("tblemployee", new _Employee(), pipeline)
    const personResp = resp.ResultData
    const personDataArray = []
    const PersonHierarchy = (reportingtoid) => {
      let FindPerson = personResp.find((person) => {
        let personReportingId = person?.reportingtoid || ""
        return person._id.toString() == reportingtoid.toString() && personReportingId.toString() != personId.toString()
      })

      if (FindPerson) {
        if (FindPerson._id.toString() != personId.toString() || getCurrentPersonId) {
          var isvalidperson = 1
          if (propertyid) {
            let findproperty = FindPerson?.property?.find((obj) => obj.propertyid.toString() == propertyid.toString())
            if (!findproperty) {
              isvalidperson = 0
            }
          }
          if (isvalidperson) {
            personDataArray.push(FindPerson)
          }
        }
        if (FindPerson?.reportingtoid) {
          PersonHierarchy(FindPerson.reportingtoid)
        }
      }
    }

    PersonHierarchy(personId)

    return personDataArray
  }

  async getPersonByUserroleHierarchyWithPersonData(personid, propertyid, ignorepersonid = Config.dummyObjid, getuids = true, personData = null) {
    const ObjectId = IISMethods.getobjectid()

    let person = null
    if (personData) {
      person = personData
    } else {
      const personPipeline = { _id: ObjectId(personid) }
      person = await this.FindOne("tblemployee", new _Employee(), personPipeline)
    }

    if (person) {
      const userrolehierarchyPipeline = [{ $match: {} }, { $limit: 1 }, { $project: { userrolehierarchy: 1 } }]
      const userrolehierarchy = await this.getmenual("tbluserrolehierarchy", new _UserRoleHierarchy(), userrolehierarchyPipeline)

      let hierarchy = userrolehierarchy.ResultData[0]?.userrolehierarchy || {}

      const userroleids = person?.userrole.map((data) => data.userroleid.toString())

      const upperUserroles = new Set()

      function findHierarchy(node, parents) {
        if (userroleids === node._id) {
          // Direct comparison instead of `includes`
          for (const parentId of parents) {
            if (!upperUserroles.has(parentId)) {
              // Prevent duplicates
              upperUserroles.add(parentId)
            }
          }
        }

        for (const child of node.children || []) {
          findHierarchy(child, [...parents, node._id])
        }
      }

      // Run the hierarchy finding
      findHierarchy(hierarchy, [])

      const upperUserrolesArr = Array.from(upperUserroles)
      if (upperUserrolesArr.length) {
        const userroleWisePersonPipeline = [
          {
            $match: {
              // "property.propertyid": ObjectId(propertyid),
              $or: [{ "property.propertyid": ObjectId(propertyid) }],
              "userrole.userroleid": { $in: upperUserrolesArr.map((data) => ObjectId(data)) },
              _id: { $ne: ObjectId(ignorepersonid) },
            },
          },
          { $project: { _id: 1, userrole: 1, personname: 1 } },
        ]
        const userroleWisePersonResp = await this.getmenual("tblemployee", new _Employee(), userroleWisePersonPipeline)

        if (getuids) {
          return userroleWisePersonResp.ResultData?.map((data) => data?._id)
        }

        return userroleWisePersonResp.ResultData
      } else {
        return []
      }
    } else {
      return []
    }
  }

  //Upper userrole hierarchy 19/09/2023 Harsh V
  async getPersonByUserroleHierarchy(personid, propertyid, ignorepersonid = Config.dummyObjid) {
    const ObjectId = IISMethods.getobjectid()
    const personPipeline = { _id: ObjectId(personid) }
    const person = await this.FindOne("tblemployee", new _Employee(), personPipeline)

    if (person) {
      const userrolehierarchyPipeline = [{ $match: {} }]
      const userrolehierarchy = await this.getmenual("tbluserrolehierarchy", new _UserRoleHierarchy(), userrolehierarchyPipeline)

      let hierarchy = userrolehierarchy.ResultData[0]?.userrolehierarchy || {}

      const userroleids = person?.userrole.map((data) => data.userroleid.toString())

      const upperUserroles = new Set()

      function findHierarchy(node, parents) {
        if (userroleids.includes(node._id)) {
          for (const parentId of parents) {
            if (!userroleids.includes(parentId)) {
              upperUserroles.add(parentId)
            }
          }
        }

        for (const child of node.children || []) {
          findHierarchy(child, [...parents, node._id])
        }
      }

      findHierarchy(hierarchy, [])

      const upperUserrolesArr = Array.from(upperUserroles)

      if (upperUserrolesArr.length) {
        const userroleWisePersonPipeline = [
          {
            $match: {
              $or: [{ "property.propertyid": ObjectId(propertyid) }],
              "userrole.userroleid": { $in: upperUserrolesArr.map((data) => ObjectId(data)) },
              _id: { $ne: ObjectId(ignorepersonid) },
            },
          },
          { $project: { _id: 1, userrole: 1, personname: 1 } },
        ]
        const userroleWisePersonResp = await this.getmenual("tblpersonmaster", new _Person(), userroleWisePersonPipeline)

        return userroleWisePersonResp.ResultData
      } else {
        return []
      }
    } else {
      return []
    }
  }

  //********** Notification Functions **********/
  async getPersonToAllowNotification(
    personData, // persons to send notifications
    notificationCategoryId, //category check -> notification setting master [fixed entry "tblnotificationcategory"]  [FieldConfig.notificationcategory]
    notificationAlias, //category alias check -> notification setting master [fixed entry "tblnotificationcategorydata"] [FieldConfig.notificationalias]
    allowintervaldetails = false, //true -> interval details (repeat notification in (time, no. times)) -> notification setting master
    propertyid = "", //propertyid to check property assigned | Notification allowed
    allowpersonof = false, // true -> Check person of setting (person of -> person to)
    personofid = "" //person of id (person of -> person to)
  ) {
    const ObjectId = IISMethods.getobjectid()

    let currentDate = new Date()

    // ******************** Get dynamic message title alias wise "notification message master" ********************/
    let notificationMessage = ""
    const notificationCategoryDataResp = await MainDB.FindOne("tblnotificationcategorydata", new _NotificationCategoryData(), {
      notificationcategoryid: ObjectId(notificationCategoryId),
      alias: notificationAlias,
    })
    if (notificationCategoryDataResp && notificationCategoryDataResp?.message) notificationMessage = notificationCategoryDataResp?.message
    // ******************** Get dynamic message title alias wise ********************/

    // ****************************** Person wise notification ******************************/
    //Person to send notifications
    const personIdsSet = new Set(personData?.map((obj) => obj._id?.toString()))

    //Get person wise notification settings
    let notificationSettingPipeline = [
      {
        $match: {
          notificationcategoryid: ObjectId(notificationCategoryId),
          alias: notificationAlias,
        },
      },
    ]

    const notificationSettingResp = await this.getmenual("tblnotificationsettingmaster", new _NotificationSetting(), notificationSettingPipeline)

    let filteredNotificationSettingData = notificationSettingResp.ResultData?.filter((obj) => personIdsSet.has(obj.personid.toString()))
    const personWiseSettingUids = filteredNotificationSettingData.map((obj) => obj.personid?.toString()) //map person wise filter uids if exist

    //filter person off to persons send notifications
    if (allowpersonof == true && personofid && personofid != "" && !personofid?.includes("guest") && personofid?.toString() != Config.dummyObjid) {
      filteredNotificationSettingData = await this.personOfAllowedNotification(filteredNotificationSettingData, personofid)
    }

    let categorywiseInternvalDetails = []
    let personWiseAllowedIds = new Set()
    let allowedNotificationPersonId = new Set()
    let notAllowedNotificationPersonId = new Set()

    filteredNotificationSettingData?.forEach((obj) => {
      if (obj.isselected == 1) {
        allowedNotificationPersonId.add(obj.personid.toString())
        personWiseAllowedIds.add(obj.personid.toString())

        //push interval details
        if (obj?.interval != undefined && obj?.nooftimerepeat != undefined && obj?.interval > 0 && obj?.nooftimerepeat > 0) {
          categorywiseInternvalDetails.push({
            userid: obj.personid.toString(),
            intervaltime: obj?.interval,
            nooftimerepeat: obj?.nooftimerepeat,
            nextrepeattime: new Date(new Date(currentDate).setHours(currentDate.getHours(), currentDate.getMinutes() + obj?.interval, 0, 0)),
          })
        }
      } else if (obj.isselected == 0) {
        notAllowedNotificationPersonId.add(obj.personid.toString())
      }
    })

    // Concat allowed and not allowed person wise notification data
    const allowedNotAllowedData = new Set([...allowedNotificationPersonId, ...notAllowedNotificationPersonId])

    // Filter not assigned notification setting
    const notAssignedNotificationSetting = new Set([...personIdsSet].filter((personid) => !allowedNotAllowedData.has(personid.toString())))

    // ****************************** Person wise notification ******************************/

    // ****************************** Userrole wise notification ******************************/
    let filteredUserroleNotificationData = []

    if (notAssignedNotificationSetting.size) {
      filteredUserroleNotificationData = notificationSettingResp.ResultData?.filter((obj) => obj.isselected === 1 && obj.userroleid?.toString() !== Config.dummyObjid)

      if (allowpersonof == true && personofid != "" && !personofid?.includes("guest") && personofid?.toString() != Config.dummyObjid) {
        filteredUserroleNotificationData = await this.personOfAllowedNotification(filteredUserroleNotificationData, personofid)
      }

      personData
        .filter(
          (person) =>
            notAssignedNotificationSetting.has(person._id.toString()) &&
            person.userrole?.find((userrole) => filteredUserroleNotificationData.find((obj) => obj.userroleid.toString() == userrole.userroleid.toString())) &&
            !personWiseSettingUids.includes(person._id.toString())
        )
        .forEach((person) => allowedNotificationPersonId.add(person._id.toString()))
    }
    // ****************************** Userrole wise notification ******************************/

    // ****************************** Notification Interval ******************************
    if (allowintervaldetails) {
      //user role wise notification interval
      if (filteredUserroleNotificationData.length) {
        for (const person of personData) {
          if (!Array.from(personWiseAllowedIds)?.includes(person?._id?.toString())) {
            //Get all userroles personwise
            const personWiseUserRoles = person?.userrole?.map((userrole) => userrole.userroleid.toString())

            //find userrole wise notification settings
            const userroleWiseSetting = filteredUserroleNotificationData?.filter(
              (setting) =>
                personWiseUserRoles?.includes(setting.userroleid?.toString()) &&
                setting?.interval != undefined &&
                setting?.nooftimerepeat != undefined &&
                setting?.interval > 0 &&
                setting?.nooftimerepeat > 0
            )

            if (userroleWiseSetting.length)
              categorywiseInternvalDetails.push({
                userid: person._id.toString(),
                intervaltime: userroleWiseSetting[0]?.interval,
                nooftimerepeat: userroleWiseSetting[0]?.nooftimerepeat,
                nextrepeattime: new Date(new Date(currentDate).setHours(currentDate.getHours(), currentDate.getMinutes() + userroleWiseSetting[0]?.interval, 0, 0)),
              })
          }
        }
      }

      // Check property wise allowed notification for person
      if (propertyid && propertyid.toString() != Config.dummyObjid) {
        allowedNotificationPersonId = await this.propertyWiseAllowedNotification(Array.from(allowedNotificationPersonId), propertyid)
      }

      return {
        allownotificationpersonids: Array.from(allowedNotificationPersonId),
        intervaldetails: categorywiseInternvalDetails,
        notificationmessage: notificationMessage,
      }
      //***Return -> allownotificationpersonids -> allowed personids, intervaldetails -> categorywise interval (repetation) details, notificationmessage -> dynamic notification title
    }

    // ****************************** Notification Interval ******************************/

    // ****************************** Property wise notifications ******************************
    if (propertyid) {
      // Check property wise allowed notification for person
      return {
        allownotificationpersonids: await this.propertyWiseAllowedNotification(Array.from(allowedNotificationPersonId), propertyid),
        notificationmessage: notificationMessage,
      }
      //*** Return -> allownotificationpersonids -> allowed personids, notificationmessage -> dynamic notification title

      // ****************************** Property wise notifications ******************************/
    } else {
      // ****************************** without property and interval notification ******************************/

      return { allownotificationpersonids: Array.from(allowedNotificationPersonId), notificationmessage: notificationMessage }
      //*** Return -> allownotificationpersonids -> allowed personids, notificationmessage -> dynamic notification title
    }
  }

  //********** Notification Functions **********/

  /* ---------------------------------------------- Date Function ---------------------------------------------- */
  // Get Property System Date in UTC
  async getPropertySystemDateUTC({ propertyid = "", isdatewithtime = true, isutc = true }) {
    let systemDate = new Date()

    if (propertyid) {
      const propertyPipeline = { _id: propertyid }
      const property = await this.FindOne("tblproperty", new PropertyCommon(), propertyPipeline)

      if (property) {
        const timezone = property.location.timezone || FieldConfig.timezone

        if (property.systemdate) {
          systemDate = IISMethods.getUTCDate({ date: property.systemdate, timezone: timezone, currenttime: true })
        } else {
          systemDate = new Date()
        }

        if (isdatewithtime) {
          if (isutc) {
            return systemDate
          }

          return IISMethods.getTimezoneWiseDate({ date: systemDate, timezone: timezone })
        } else {
          if (isutc) {
            return new Date(`${new Date(systemDate).toISOString().split("T")[0]}T00:00:00.000Z`)
          }

          return IISMethods.getTimezoneWiseDate({ date: systemDate, timezone: timezone, isdatewithtime: false })
        }
      }
    }

    return systemDate
  }
  /* ---------------------------------------------- Date Function ---------------------------------------------- */

  /* ---------------------------------------------- Send SMS --------------------------------------------- */
  // Send SMS
  async sendSMS({ req }) {
    const ResponseBody = {
      status: 400,
      message: Config.getResponsestatuscode()["400"],
    }

    const ObjectId = IISMethods.getobjectid()
    const requestBody = req.body

    try {
      /********** API Integration FOR SMS SEND ***********/

      //send messages
      const sendMessageTemplates = requestBody.messagetemplates

      if (sendMessageTemplates?.length) {
        // Fetch Platform Details
        const platformPipline = { platformid: requestBody.platformid }
        const platform = await this.FindOne("tblapiintegration", new _APIIntegration(), platformPipline)

        if (platform) {
          if (requestBody.platformid.toString() === FieldConfig.guestmessageplatform.cloudtalk) {
            // For CloudTalk

            // SEND MESSAGE PAYLOAD BODY
            const sendMessageObj = {
              recipient: requestBody.recipient,
              message: "",
              sender: requestBody.sender,
              country_code: requestBody.contactcountrycode,
            }

            // Request Payload
            const payload = {
              method: "post",
              url: platform.url,
              data: {},
              auth: {
                username: platform.username,
                password: platform.password,
              },
            }

            for (let i = 0; i < sendMessageTemplates.length; i++) {
              sendMessageObj.message = sendMessageTemplates[i].message
              payload.data = sendMessageObj

              try {
                // Waiting For Complete All Request
                const axiosResp = await IISMethods.axiosRequest({ ...payload })
                const axiosData = axiosResp.data.responseData[0]

                ResponseBody.status = axiosData.status
                ResponseBody.message = axiosData.message
              } catch (err) {
                const errData = err.response.data.responseData

                ResponseBody.status = errData.status
                ResponseBody.message = errData.message
              }
            }
          } else if (requestBody.platformid.toString() === FieldConfig.guestmessageplatform.justcall) {
            // SEND MESSAGE PAYLOAD BODY
            const sendMessageObj = {
              from: requestBody.sender,
              to: requestBody.recipient,
              body: "",
              media_url: "",
            }

            // REQUEST PAYLOAD
            const payload = {
              method: "post",
              url: platform.url,
              data: {},
              headers: {
                Authorization: `${platform.username}:${platform.password}`,
              },
            }

            for (let i = 0; i < sendMessageTemplates.length; i++) {
              sendMessageObj.body = sendMessageTemplates[i].message
              // sendMessageObj.media_url = sendMessageData[i].files.length ? sendMessageData[i].files.map((file) => file.url).join(", ") : ""

              try {
                // Waiting For Complete All Request
                const axiosResp = await IISMethods.axiosRequest({ ...payload })
                const axiosData = axiosResp.data

                ResponseBody.status = axiosData.status
                ResponseBody.message = axiosData.message
              } catch (err) {
                const errData = err.response.data.responseData

                ResponseBody.status = errData.status
                ResponseBody.message = errData.message
              }
            }
          } else if (requestBody.platformid.toString() === FieldConfig.guestmessageplatform.twilio) {
            // For Twilio
            const twilioClient = _Twilio(platform.username, platform.password)

            // SEND MESSAGE PAYLOAD BODY
            const sendMessageObj = {
              from: requestBody.sender,
              to: requestBody.recipient,
              body: "",
              mediaUrl: [],
              // statusCallback: Config.guestmessagestatuscallback
            }

            let queryArray = []
            for (let i = 0; i < sendMessageTemplates.length; i++) {
              sendMessageObj.body = sendMessageTemplates[i].message.message

              // sendMessageObj.mediaUrl = sendMessageData[i].files.length ? sendMessageData[i].files.map((file) => file.url) : []

              try {
                // Message Platform API
                // queryArray.push(
                // 	twilioClient.messages.create(sendMessageObj)
                // )

                const resp = await twilioClient.messages.create(sendMessageObj)

                ResponseBody.status = 200
                ResponseBody.message = "Message Sent"
              } catch (err) {
                x.status = err.status
                ResponseBody.message = err.message
              }
            }

            // ResponseBody.status = 200
            // ResponseBody.message = "Message Sent"
            // const resp = await Promise.all(queryArray);
          }
        }
      }

      return ResponseBody
    } catch (err) {
      return { status: 500, message: Config.getResponsestatuscode()["500"], err }
    }
    /********** API Integration FOR SMS SEND ***********/
  }

  async generateSMSMessage({ messagetemplate, req, survey, person, reservation }) {
    const ResponseBody = {
      status: 401,
      message: Config.getResponsestatuscode()["401"],
    }
    try {
      const ObjectId = IISMethods.getobjectid()

      //Prepare SMS Message from message template
      if (messagetemplate) {
        let messageData = 0
        if (survey.surveytypeid?.toString() == Config.surveyformtype.privateform) {
          messageData = {
            firstname: person.firstname,
            lastname: person.lastname,
            email: person.personemail,
            contact: person.contact,
            surveyurl: survey.url,
            checkindate: "",
            checkoutdate: "",
            room: "",
            creditcardauthform: survey.url,
          }
        } else if (survey.surveytypeid?.toString() == Config.surveyformtype.ccaform) {
          const propertyPipeline = { _id: reservation.propertyid }
          const property = await MainDB.FindOne("tblproperty", new PropertyCommon(), propertyPipeline)

          const timezone = property?.location?.timezone || FieldConfig.timezone

          const timezonePropertyCheckInTime = IISMethods.getUTCDateWithDayLightSaving({
            originaldate: property.timing.checkintime,
            timezone,
            isutc: false,
          })

          const timezonePropertyCheckOutTime = IISMethods.getUTCDateWithDayLightSaving({
            originaldate: property.timing.checkouttime,
            timezone,
            isutc: false,
          })

          const propertycheckintime = IISMethods.getFormatWiseDate(timezonePropertyCheckInTime, 17)
          const propertycheckouttime = IISMethods.getFormatWiseDate(timezonePropertyCheckOutTime, 17)

          const checkindate = IISMethods.getFormatWiseDate(IISMethods.getTimezoneWiseDate({ date: reservation.checkindate, timezone }), 2)
          const checkoutdate = IISMethods.getFormatWiseDate(IISMethods.getTimezoneWiseDate({ date: reservation.checkoutdate, timezone }), 2)

          const mobilecheckinlink = IISMethods.getMobileCheckInLink(req.headers.subdomainname + "-" + reservation._id)
          const shortmobilecheckinlink = await IISMethods.getShortenURL(mobilecheckinlink)

          const guestexperiencelink = IISMethods.getGuestExperienceURL(req.headers.subdomainname + "-" + reservation._id)
          const shortguestexperiencelink = await IISMethods.getShortenURL(guestexperiencelink)

          const defaultCCAformPipeline = { surveytypeid: FieldConfig.creditcardauthform, isdefault: 1, propertyid: reservation.propertyid }
          const defaultCCAformResp = await this.FindOne("tblsurveyform", new _SurveyForm(), defaultCCAformPipeline)
          const ccaformLink = defaultCCAformResp ? IISMethods.getReservationSurveyLink(req, defaultCCAformResp?._id, reservation._id?.toString()) : ""

          messageData = {
            mobilecheckinlink: shortmobilecheckinlink ? shortmobilecheckinlink : mobilecheckinlink,
            guestexperiencelink: shortguestexperiencelink ? shortguestexperiencelink : guestexperiencelink,
            propertyname: reservation.propertyname,
            firstname: reservation.firstname,
            lastname: reservation.lastname,
            email: reservation.guestemail,
            contact: reservation.guestphoneno,
            checkindate: `${checkindate}`,
            checkoutdate: `${checkoutdate}`,
            room: reservation.roomno,
            propertyphonenumber: property.contactno,
            propertycheckintime: propertycheckintime,
            propertycheckouttime: propertycheckouttime,
            reviewlink: property.reviewlink ? property.reviewlink : "",
            creditcardauthform: ccaformLink,
          }
        } else if (survey.surveytypeid?.toString() == Config.surveyformtype.publicform) {
          messageData = {
            surveylink: survey.url,
          }
        }

        if (messageData) {
          messagetemplate.files?.forEach((file) => {
            file.url = IISMethods.getImageUrl(file.url)
          })

          const message = IISMethods.generateMessage(messagetemplate.message, messageData)

          return { message, files: messagetemplate.files || [] }
        }
      }

      return ResponseBody
    } catch (err) {
      return { status: 500, message: Config.getResponsestatuscode()["500"], err }
    }
  }
  /* ---------------------------------------------- Send SMS ---------------------------------------------- */

  //maxid autoincreament in tblmaxidincreament
  async maxIdAutoIncreament(updatetable) {
    try {
      const maxIdIncreamentObjModel = await this.createmodel("tblmaxidincreament", new _maxIdIncreament())

      var sequenceDoc = await maxIdIncreamentObjModel["objModel"].findOneAndUpdate({ tablename: updatetable }, { $inc: { maxid: 1 } }, { new: true })
      return sequenceDoc.maxid
    } catch (err) {
      // node_Error(err)

      res.status(500).send({ status: 500, message: Config.getResponsestatuscode()["500"] })
    }
  }

  // Room Transfer Function

  async getPageRightsWisePersonData(pagename, toString = false) {
    const ObjectId = IISMethods.getobjectid()

    const pipeline = [{ $match: { alias: pagename } }]
    const rightsResp = await this.getmenual("tbluserrights", new Userrights(), pipeline)

    var userRight = rightsResp?.ResultData
  }

  async getmyReportTo(personid, personData = []) {
    try {
      //          A
      //		   /  \
      // 		  b    c
      // 		 /\    /\
      //		d  e  f  g
      //	if passed g returns [A, c]
      if (personData.length == 0) {
        const personPipeline = [{ $sort: { _id: -1 } }, { $match: { iscustomer: { $ne: 1 } } }]
        const personResp = await this.getmenual("tblpersonmaster", new _Person(), personPipeline)
        personData = personResp.ResultData
      }

      const reportTo = []
      function getReportTo(personid) {
        let myPersonData = personData.find((o) => o._id.toString() == personid)
        let myPersonReportingData = myPersonData?.reportingtos?.map((obj) => obj.reportingtoid.toString())
        let repoting = personData?.find((p) => myPersonReportingData?.includes(p._id?.toString()))
        if (personid != repoting._id.toString()) {
          reportTo.push(repoting._id.toString())
          getReportTo(repoting._id.toString())
        }
      }

      getReportTo(personid)

      return reportTo
    } catch (err) {
      // node_Error(err)
      return []
    }
  }

  async getmyReportToPersonIds(personid, personData = []) {
    try {
      //          A
      //		   /  \
      // 		  b    c
      // 		 /\    /\
      //		d  e  f  g
      //	if passed g returns [A, c]
      if (personData.length == 0) {
        const personPipeline = [{ $sort: { _id: -1 } }]
        const personResp = await this.getmenual("tblpersonmaster", new _Person(), personPipeline)
        personData = personResp.ResultData
      }

      const reportTo = []
      function getReportTo(personid) {
        //persondata to get reportingid
        let myPersonData = personData?.find((o) => o._id?.toString() == personid)
        let myPersonReportingData = myPersonData?.reportingtos?.map((obj) => obj.reportingtoid.toString())
        //reporting data
        let repoting = personData?.find((p) => myPersonReportingData?.includes(p._id?.toString()))
        //person and repoting person is not same
        if (repoting && personid != repoting?._id.toString()) {
          reportTo.push(repoting?._id.toString())
          getReportTo(repoting?._id.toString())
        }
      }

      getReportTo(personid)

      return reportTo
    } catch (err) {
      // node_Error(err)
      return []
    }
  }

  async getmyApproveToPersonIds(personid, personData = []) {
    try {
      //          A
      //		   /  \
      // 		  b    c
      // 		 /\    /\
      //		d  e  f  g
      //	if passed g returns [A, c]
      if (personData.length == 0) {
        const personPipeline = [{ $sort: { _id: -1 } }]
        const personResp = await this.getmenual("tblemplyee", new _Employee(), personPipeline)
        personData = personResp.ResultData
      }

      const approveTo = []
      function getApproveTo(personid) {
        //persondata to get whom he's approving
        let mydata = personData?.find((o) => o._id?.toString() == personid)
        let myApproveData = mydata?.approvetos?.map((obj) => obj.approvetoid.toString())

        //approver data
        let approver = personData?.find((p) => myApproveData?.includes(p._id?.toString()))

        //person and approver is not same
        if (personid != approver?._id?.toString()) {
          approveTo.push(approver?._id?.toString())
          getApproveTo(approver?._id?.toString())
        }
      }

      getApproveTo(personid)

      return approveTo
    } catch (err) {
      // node_Error(err)
      return []
    }
  }

  async getAllReporter(personid, persondata = []) {
    try {
      //          A
      //		   /  \
      // 		  b    c
      // 		 /\    /\
      //		d  e  f   g
      //	if passed b returns [b, d, e]

      let personData = persondata
      if (personData?.length == 0) {
        const pipeline = [{ $sort: { _id: 1 } }]
        const personResp = await this.getmenual("tblemployee", new _Employee(), pipeline)
        personData = personResp.ResultData
      }
      var reportingperson = []
      var added = []

      var person = personData.find((o) => Array.isArray(o.reportingtos) && o._id?.toString() == personid)
      reportingperson.push(person)

      function myAllReporting(personid) {
        var allperson = personData.filter((o) => Array.isArray(o.reportingtos) && o.reportingtos.find((obj) => obj.reportingtoid.toString() == personid))
        if (allperson.length) {
          for (const p of allperson) {
            if (p._id != personid) {
              if (!added.includes(p._id?.toString())) {
                reportingperson.push(p)
                added.push(p?._id?.toString())
              }
              myAllReporting(p?._id?.toString())
            }
          }
        }
      }

      myAllReporting(personid)
      return reportingperson
    } catch (e) {
      //node_Error(e);
    }
  }

  async getAllApprover(personid, persondata = []) {
    try {
      //          A
      //		   /  \
      // 		  b    c
      // 		 /\    /\
      //		d  e  f  g
      //	if passed b returns [b, d, e]

      let personData = persondata
      if (personData?.length == 0) {
        const pipeline = [{ $sort: { _id: 1 } }]
        const personResp = await this.getmenual("tblemployee", new _Employee(), pipeline)
        personData = personResp.ResultData
      }

      let approvingPerson = []
      let added = []

      let person = personData.find((o) => Array.isArray(o.approvetos) && o._id?.toString() == personid)
      approvingPerson.push(person)

      function myAllApproving(personid) {
        let allperson = personData.filter((o) => Array.isArray(o.approvetos) && o.approvetos.find((obj) => obj.approvetoid.toString() == personid))
        if (allperson.length) {
          for (const p of allperson) {
            if (p._id != personid) {
              if (!added.includes(p._id?.toString())) {
                approvingPerson.push(p)
                added.push(p._id.toString())
              }
              myAllApproving(p._id.toString())
            }
          }
        }
      }

      myAllApproving(personid)
      return approvingPerson
    } catch (e) {
      //node_Error(e);
    }
  }

  async getPropertyWisePersonUserroleData(personIds, propertyIds) {
    // const pipeline = [{ $match: { _id: { $in: personIds }, "property.propertyid": { $in: propertyIds } } }, { $project: { userrole: 1 } }]
    const pipeline = [
      {
        $match: {
          _id: { $in: personIds },
          $or: [{ "property.propertyid": propertyIds }, { "schedulerproperty.propertyid": propertyIds }],
        },
      },
      { $project: { userrole: 1 } },
    ]
    const resp = await this.getmenual("tblpersonmaster", new _Person(), pipeline)

    return resp.ResultData
  }

  async getPersonLogOfDate({ personid, date = new Date() }) {
    try {
      const logPipeline = [
        { $addFields: { datelog: { $substr: ["$LogDate", 0, 10] } } },
        { $match: { UserId: personid, deleted: 0, logtype: 1 } },
        { $match: { datelog: new Date(date).toISOString().substring(0, 10) } },
        { $sort: { LogDate: 1 } },
      ]
      var tablename = "DeviceLogs_" + IISMethods.getCurrentMonth(date).toString() + "_" + IISMethods.getCurrentYear(date).toString()
      var logresp = await this.getmenual(tablename, new _LogManage(), logPipeline)

      return logresp.ResultData.sort(function (a, b) {
        return Date.parse(a.LogDate) - Date.parse(b.LogDate)
      })
    } catch (err) {
      // node_Error(err)
    }
  }
  // --------------------

  async addComplaintStatusLogs(complaintid, complaintstatusid) {
    //Insert complaint status
    const complaintStatusPipeline = [{ $match: {} }, { $sort: { order: 1 } }]
    const complaintStatusResp = await this.getmenual("tblcomplaintstage", new _ComplaintStage(), complaintStatusPipeline)

    let complaintStatusAction = []

    if (complaintStatusResp.ResultData.length) {
      for (const obj of complaintid) {
        for (let i = 0; i < complaintStatusResp.ResultData.length; i++) {
          var iscurrentstatus = 0
          var updateddate = null
          if (complaintStatusResp.ResultData[i]._id.toString() == complaintstatusid.toString()) {
            iscurrentstatus = complaintStatusResp.ResultData[i]._id.toString() == Config.getCompletedStatus() ? 0 : 1
            updateddate = new Date()
          }
          let complaintStatusActionLog = {
            complaintid: obj,
            statusid: complaintStatusResp.ResultData[i]._id,
            status: complaintStatusResp.ResultData[i].status,
            statusorder: complaintStatusResp.ResultData[i].order,
            date: new Date(),
            updateddate: updateddate,
            iscurrentstatus: iscurrentstatus,
          }
          if (complaintstatusid.toString() == Config.getUnAssignedStatus()) {
            complaintStatusActionLog.firstlogdate = new Date()
          }
          complaintStatusAction.push(complaintStatusActionLog)
        }
      }

      await this.InsertMany("tblcomplaintstageaction", new _ComplaintStatusAction(), complaintStatusAction)
      console.log("🚀 ~ addComplaintStatusLogs ~ complaintStatusAction:", complaintStatusAction)
    }
  }

  async getPersonByUserRoleAndProperty(propertyid, userroleids, getuids = true) {
    const ObjectId = IISMethods.getobjectid()

    if (userroleids?.length) {
      const bottomUserRolesIds = userroleids.filter((data) => data != undefined).map((userroleid) => ObjectId(userroleid))
      const personByBottomUserrolePipeline = [
        {
          $match: {
            "property.propertyid": ObjectId(propertyid),
            isactive: 1,
            "userrole.userroleid": { $in: bottomUserRolesIds },
          },
        },
        // {
        //     $project: {
        //         _id: 1,
        //         companyid: 1,
        //         salarydata: 1,
        //         employeecode: 1,
        //         approvetos: 1,
        //         reportingtos: 1,
        //         personname: 1,
        //         department: 1,
        //         isactive: 1,
        //         designation: 1,
        //         property: 1,
        //         profilepic: 1,
        //         clockindate: 1,
        //         clockoutdate: 1,
        //         breakindate: 1,
        //         breakoutdate: 1,
        //         travelindate: 1,
        //         traveloutdate: 1,
        //         designationid: 1,
        //         breaktype: 1,
        //         userrole: 1,
        //         workinghourday: 1,
        //         shiftdetails: 1,
        //         countrycode: 1,
        //         contact: 1,
        //     }
        // }
      ]
      //get bottom userrole persons
      const personByBottomUserroleResp = await this.getmenual("tblemployee", new _Employee(), personByBottomUserrolePipeline)

      if (getuids) {
        return personByBottomUserroleResp.ResultData?.map((data) => data?._id)
      }

      return personByBottomUserroleResp.ResultData
    }
  }

  /****************************************************** Logs ******************************************************/

  // Person Session Logs
  async addPersonSessionLogs({ req, data = 0, logtype = 0, type = 0 }) {
    try {
      const personsessionLog = {
        moduletypeid: Config.moduletype[req.headers.moduletype],
        moduletype: req.headers.moduletype,
        logtype: logtype,
        logname: "",
        userid: Config.dummyObjid,
        username: "",
        ipaddress: req.headers.ipaddress,
        useragent: req.headers["user-agent"],
        issuer: req.headers.issuer,
        requestbody: req.body,
        requestheader: req.headers,
      }

      if (data) {
        if (type === 1 || type === 3 || type === 6) {
          // Person

          personsessionLog.userid = data._id
          personsessionLog.username = data.firstname + " " + data.lastname
        }
      }

      switch (logtype) {
        case 1:
          personsessionLog.logname = Config.personsessionlogtype.login
          break

        case 2:
          personsessionLog.logname = Config.personsessionlogtype.logout
          break

        case 3:
          personsessionLog.logname = Config.personsessionlogtype.invalidlogin
          break
      }

      await MainDB.executedata("i", new _PersonSessionLog(), "tblpersonsessionlog", personsessionLog)

      if (["prod"].includes(Config.servermode)) {
        delete personsessionLog.requestbody
        delete personsessionLog.requestheader

        await IISMethods.addAWSCloudwatchLogs({ message: personsessionLog })
      }
    } catch (err) {
      // node_Error(err)
    }
  }

  // Person Change Log
  async addPersonChangeLog({ req, data = 0, logtype = 0 }) {
    try {
      const personchangeLog = {
        moduletypeid: Config.moduletype[req.headers.moduletype],
        moduletype: req.headers.moduletype,
        logtype: logtype,
        logname: "",
        requestpersonid: IISMethods.ValidateObjectId(req.headers.uid) ? req.headers.uid : Config.dummyObjid,
        requestpersonname: req.headers.personname,
        userid: data._id,
        username: data.personname,
        ipaddress: req.headers.ipaddress,
        useragent: req.headers["user-agent"],
        issuer: req.headers.issuer,
        requestbody: req.body,
        requestheader: req.headers,
      }

      switch (logtype) {
        case 1:
          personchangeLog.logname = Config.personchangelogtype.create
          break

        case 2:
          personchangeLog.logname = Config.personchangelogtype.update
          break

        case 3:
          personchangeLog.logname = Config.personchangelogtype.previlege
          break

        case 4:
          personchangeLog.logname = Config.personchangelogtype.delete
          break

        case 5:
          personchangeLog.logname = Config.personchangelogtype.passwordupdate
          personchangeLog.userpassword = IISMethods.GetMD5(req.body.newpassword)
          break

        case 6:
          personchangeLog.logname = Config.personchangelogtype.accountlock
          break

        case 7:
          personchangeLog.logname = Config.personchangelogtype.accountunlock
          break

        case 8:
          personchangeLog.logname = Config.personchangelogtype.creditcardpasswordupdate
          personchangeLog.usercreditcardpassword = IISMethods.GetMD5(req.body.newcreditcardpassword)
          break

        case 9:
          personchangeLog.logname = Config.personchangelogtype.passwordreset
          personchangeLog.userpassword = IISMethods.GetMD5(req.body.newpassword)
          break

        case 10:
          personchangeLog.logname = Config.personchangelogtype.creditcardpasswordreset
          personchangeLog.usercreditcardpassword = IISMethods.GetMD5(req.body.newcreditcardpassword)
          break
      }

      await MainDB.executedata("i", new _PersonChangeLog(), "tblpersonchangelog", personchangeLog)
    } catch (err) {
      // node_Error(err)
    }
  }

  async addTaskLogs(reqData) {
    const ObjectId = IISMethods.getobjectid()
    let resp = {
      status: 400,
      message: Config.getErrmsg()["dberror"],
    }
    if (reqData.taskid && reqData.userid) {
      if (reqData?.userid?.length < 24) {
        reqData.userid = Config.dummyObjid
      }
      var reqData = {
        taskid: ObjectId(reqData.taskid),
        userid: ObjectId(reqData?.userid),
        username: reqData.username,
        datetime: reqData.datetime,
        actionid: reqData.actionid || Config.dummyObjid,
        action_name: reqData.action_name,
        comment: reqData.comment || "",
        commentlog: reqData.commentlog,
        taskstatustype: reqData.taskstatustype || "",
        taskstatusid: reqData.taskstatusid || Config.dummyObjid,
        taskstatus: reqData.taskstatus || "",
        logtype: reqData.logtype,
        logtypefilter: reqData.logtypefilter || 0,
        imageslog: reqData.imageslog || [], // 21-03-24 Abhi Shah
        svg: reqData.svg || "",
        flag: reqData.flag || 0,
        products: reqData.products || [],
        recordinfo: reqData.recordinfo,
        actualdatetime: null,
        tasktransferreason: reqData?.tasktransferreason || "",
      }

      if (IISMethods.getFormatWiseDate(reqData.datetime) !== IISMethods.getFormatWiseDate(new Date())) {
        reqData.actualdatetime = new Date()
      }

      resp = await this.executedata("i", new _TaskLog(), "tbltasklog", reqData)
    }
    return resp
  }

  async InsertTaskStatusLog(task, systemdate) {
    // Insert TaskStatusLog Data
    const ObjectId = IISMethods.getobjectid()
    const TaskStatusPipeline = [
      { $match: { _id: ObjectId(task.taskstatusid) } },
      {
        $sort: {
          displayorder: 1,
        },
      },
    ]
    const TaskStatusResp = await this.getmenual("tbltaskstatusmaster", new _TaskStatus(), TaskStatusPipeline)
    const completedstatus = ["completed", "autocompleted"]
    for (let i = 0; i < TaskStatusResp.ResultData.length; i++) {
      var iscurrentstatus = 0
      var updateddate = null
      if (TaskStatusResp.ResultData[i]._id.toString() == task.taskstatusid?.toString()) {
        // iscurrentstatus = 1
        iscurrentstatus = completedstatus.includes(TaskStatusResp.ResultData[i].statustype) ? 0 : 1
        // updateddate = new Date(systemdate) // 02-04-2023 tushar
        updateddate = new Date()
      }
      const TaskStatusLogData = {
        taskid: task._id,
        statusid: TaskStatusResp.ResultData[i]._id,
        statustype: TaskStatusResp.ResultData[i].statustype,
        status: TaskStatusResp.ResultData[i].status,
        // date: new Date(systemdate), // 02-04-2023 tushar
        date: new Date(),
        updateddate: updateddate,
        iscurrentstatus: iscurrentstatus,
      }
      if (task.taskstatusid?.toString() == TaskStatusResp.ResultData[i]._id.toString()) {
        // TaskStatusLogData.firstlogdate = new Date(systemdate) // 03-04-2023 Mehul
        TaskStatusLogData.firstlogdate = new Date()
      }

      let resp = await this.executedata("i", new _TaskStatusLog(), "tbltaskstatuslog", TaskStatusLogData, false)
    }
  }

  /****************************************************** Logs ******************************************************/

  /****************************************************** Jainil ******************************************************/

  async addTask(data) {
    try {
      if (!global.add_Task) {
        throw new Error("Queue is not initialized")
      }
      console.log("data:- ", data)

      await addJob({ queue: global.add_Task, queuename: FieldConfig.addTask.task, data: { data } })
    } catch (err) {
      console.error("Error while adding task to queue:", err)
      throw err
    }
  }

  async SendMsg(data, time) {
    try {
      if (!global.add_msg) {
        throw new Error("Queue is not initialized")
      }
      console.log("data:- ", data)
      await addJob({ queue: global.add_msg, queuename: FieldConfig.messagedata.msgdata, data: { data, time } })
    } catch (err) {
      console.error("Error while adding Message to queue:", err)
      throw err
    }
  }

  /****************************************************** Jainil ******************************************************/

  /****************************************************** Email Functions ******************************************************/

  // Send Email
  async sendEmail(emaildata) {
    try {
      await addJob({ queue: global.Email_Queue, queuename: FieldConfig.queuejobs.emails, data: emaildata })
    } catch (err) {
      // node_Error(err)
    }
  }

  /****************************************************** Email Functions ******************************************************/

  // async getPersonData(id, projection = {}) {
  //     try {
  //         const ObjectId = IISMethods.getobjectid()
  //         const pipeline = [{ $match: { _id: new ObjectId(id) } }]
  //         if (Object.keys(projection).length) {
  //             pipeline.push({ $project: projection })
  //         }
  //         const resp = await this.getmenual("tblpersonmaster", new _Person(), pipeline)

  //         return resp.ResultData[0]
  //     } catch (err) {
  //         node_Error(err)
  //     }
  // }

  async getEmployeeData(id, projection = {}) {
    try {
      const ObjectId = IISMethods.getobjectid()
      const pipeline = [{ $match: { _id: new ObjectId(id) } }]
      if (Object.keys(projection).length) {
        pipeline.push({ $project: projection })
      }
      const resp = await this.getmenual("tblemployee", new _Employee(), pipeline)

      return resp.ResultData[0]
    } catch (err) {
      node_Error(err)
    }
  }

  /*-------------------------------------------- ZOHO APIS -----------------------------------------*/
  // currently not have any use
  async zohoPropertySyncUrl(req, res, next) {
    try {
      const ResponseBody = {}
      const clientId = "1000.NMD2FW3QTZWNCMRIMQNF9U2AKDBL3J"
      const redirectUri = "http://192.168.1.33:8080/v1/zohoauthorizationcode"
      const scop = "ZohoBooks.fullaccess.all"
      const authorizationUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${scop}&client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&prompt=Consent&access_type=offline`

      console.log("🚀 ~ file: DB.js:23894 ~ zohoPropertySyncUrl ~ code:", authorizationUrl)
      // ResponseBody.fltpagecollection = FltPageCollection
      ResponseBody.status = 200
      ResponseBody.authorizationUrl = authorizationUrl
      req.ResponseBody = ResponseBody
      next()
    } catch (error) {
      //   return ''
      console.log("Error fetching access token:", error)
    }
  }

  // currently not have any use
  async zohoAuthorizationCode(req, res, next) {
    try {
      const ResponseBody = {}
      const code = req.query.code

      console.log("🚀 ~ file: DB.js:23894 ~ zohoAuthorizationCode ~ code:", code)
      // ResponseBody.fltpagecollection = FltPageCollection
      ResponseBody.status = 200
      ResponseBody.code = code
      req.ResponseBody = ResponseBody
      next()
    } catch (error) {
      //   return ''
      console.log("Error fetching access token:", error)
    }
  }

  async getZohoAccessToken() {
    try {
      const oldToken = await this.FindOne("tblzohotoken", new _ZohoToken(), {}, { expiry: -1 })

      if (oldToken) {
        return { status: 200, accesstoken: oldToken.access_token }
      }

      // get the client id, secret and refresh_token from main db based on subdomain
      const person = await MainDB.FindOne("tblusermaster", new _Users(), { subdomainname: this.DBName })

      const url = Config.zohoaccesstokenurl
      const config = {
        extradata: {
          subdomain: this.DBName ?? "",
          req_for: "Zoho Authentication",
          req_operation: "Zoho Authentication",
        },
        params: {
          refresh_token: person.zohorefreshtoken,
          client_id: person.zohoclientid,
          client_secret: person.zohoclientsecret,
          // redirect_uri: 'http://www.zoho.in/books',
          grant_type: "refresh_token",
        },
      }

      const response = await instance.post(url, {}, config)
      if (response.status == 200 && response?.data?.expires_in) {
        const authData = {
          ...response.data,
          expiry: new Date(new Date().getTime() + response.data.expires_in * 1000),
        }
        await this.executedata("i", new _ZohoToken(), "tblzohotoken", authData)
      }

      return { status: 200, accesstoken: response.data.access_token }
    } catch (err) {
      console.log("Zoho Authentication Api Err", err)
    }
  }
  /*-------------------------------------------- ZOHO APIS -----------------------------------------*/
}

// module.exports = DB

export default DB

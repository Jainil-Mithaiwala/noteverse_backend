import Servermode from "./serverENV.js";
import dotenv1 from "dotenv";

if (!["uat", "dev", "production"].includes(process.env.NODE_ENV)) {
  dotenv1.config({ path: ".env" });
}

class Config {
  constructor() {
    this.servermode = Servermode; // prod - Live | uat - test | dev = development
    this.dataencryption = false;
    this.tokenkey = process.env.TOKEN_KEY;

    if (this.servermode == "local") {
      // Development
      this.port = process.env.PORT;
      this.endpointv1 = "/noteverse/v1";
      //       this.s3bucket = process.env.AWS_BUCKET;
      //       this.s3baseurl ="https://" + this.s3bucket + ".s3-ap-south-1.amazonaws.com/";
      this.dataencryption = false;
      this.logerror = true;
      this.DBType = "MONGODB";
      this.DBName = process.env.MONGODB_DBNAME;
      this.DBHost = process.env.MONGODB_HOST;
      this.DBPort = process.env.MONGODB_PORT;
      this.DBUser = process.env.MONGODB_USER;
      this.DBPass = process.env.MONGODB_PASS;
      this.version = 1;
    } else if (this.servermode == "prod") {
      // live
      this.port = process.env.PORT;
      this.endpointv1 = "/noteverse/v1";
      //       this.s3bucket = process.env.AWS_BUCKET;
      //       this.s3baseurl = "https://" + this.s3bucket + ".s3-ap-south-1.amazonaws.com/";
      this.dataencryption = true;
      this.logerror = true;
      this.DBType = "MONGODB";
      this.DBName = process.env.MONGODB_DBNAME;
      this.DBHost = process.env.MONGODB_HOST;
      this.DBPort = process.env.MONGODB_PORT;
      this.DBUser = process.env.MONGODB_USER;
      this.DBPass = process.env.MONGODB_PASS;
      this.version = 1;
    } else if (this.servermode == "uat") {
      // test
      this.port = process.env.PORT;
      this.endpointv1 = "/noteverse/v1";
      //       this.s3bucket = process.env.AWS_BUCKET;
      //       this.s3baseurl = "https://" + this.s3bucket + ".s3-ap-south-1.amazonaws.com/";
      this.dataencryption = false;
      this.logerror = true;
      this.DBType = "MONGODB";
      this.DBName = process.env.MONGODB_DBNAME;
      this.DBHost = process.env.MONGODB_HOST;
      this.DBPort = process.env.MONGODB_PORT;
      this.DBUser = process.env.MONGODB_USER;
      this.DBPass = process.env.MONGODB_PASS;
      this.version = 1;
    } else if (this.servermode == "dev") {
      // test
      this.port = process.env.PORT;
      this.endpointv1 = "/noteverse/v1";
      //       this.s3bucket = process.env.AWS_BUCKET;
      //       this.s3baseurl = "https://" + this.s3bucket + ".s3-ap-south-1.amazonaws.com/";
      this.dataencryption = false;
      this.logerror = true;
      this.DBType = "MONGODB";
      this.DBName = process.env.MONGODB_DBNAME;
      this.DBHost = process.env.MONGODB_HOST;
      this.DBPort = process.env.MONGODB_PORT;
      this.DBUser = process.env.MONGODB_USER;
      this.DBPass = process.env.MONGODB_PASS;
      this.version = 1;
    }

    this.resstatuscode = {
      '100': "Continue",
      '101': "Switching Protocols",
      '103': "Early Hints",
      '200': "OK",
      '201': "Created",
      '202': "Accepted",
      '203': "Non-Authoritative Information",
      '204': "No Content",
      '205': "Reset Content",
      '206': "Partial Content",
      '300': "Multiple Choices",
      '301': "Moved Permanently",
      '302': "Found",
      '303': "See Other",
      '304': "Not Modified",
      '307': "Temporary Redirect",
      '308': "Permanent Redirect",
      '400': "Bad Request",
      '401': "Unauthorized",
      '402': "Payment Required",
      '403': "Forbidden",
      '404': "Not Found",
      '405': "Method Not Allowed",
      '406': "Not Acceptable",
      '407': "Proxy Authentication Required",
      '408': "Request Timeout",
      '409': "Conflict",
      '410': "Gone",
      '411': "Length Required",
      '412': "Precondition Failed",
      '413': "Payload Too Large",
      '414': "URI Too Long",
      '415': "Unsupported Media Type",
      '416': "Range Not Satisfiable",
      '417': "Expectation Failed",
      '418': "I'm a teapot",
      '422': "Unprocessable Entity",
      '425': "Too Early",
      '426': "Upgrade Required",
      '428': "Precondition Required",
      '429': "Too Many Requests",
      '431': "Request Header Fields Too Large",
      '451': "Unavailable For Legal Reasons",
      '500': "Internal Server Error",
      '501': "Not Implemented",
      '502': "Bad Gateway",
      '503': "Service Unavailable",
      '504': "Gateway Timeout",
      '505': "HTTP Version Not Supported",
      '506': "Variant Also Negotiates",
      '507': "Insufficient Storage",
      '508': "Loop Detected",
      '510': "Not Extended",
      '511': "Network Authentication Required",
    };

    //for response message
    this.errmsg = {
      "insert": "Data inserted successfully.",
      "update": "Data updated successfully.",
      "delete": "Data deleted successfully.",
      "dberror": 'Something went wrong, Error Code : ',
      "notexist": 'Data not exist.',
      'deactivate': "Your account is suspended, please contact administrator to activate account.",
      'uservalidate': "User Validate.",
      'userright': "Sorry, You don't have enough permissions to perform this action",
      'invalidtoken': "Invalid token.",
      'tokenvalidate': "Token validated",
      'usernotfound': "User not found",
      'accountnotfound': "Account not found",
      'invalidusername': "Invalid Username.",
      'invalidemail': "Please Enter Valid Email.",
      'invalidpassword': "Invalid Password.",
      'successlogin': "Login Successfully",
      'checkmail': "We have send the otp in mail.",
      'otpexpired': "Entered OTP is expired.",
      'invalidotp': "Entered OTP is invalid.",
      'oldusepassword': "Can not use previously used password",
      'passreset': "Password Reset Successfully",
      'invalidrequest': "Invalid request.",
      'isexist': 'Data already exist.',
      'invalidicon': 'Invalid Icon.',
      'statecodeexist': 'Short code already exists.',
      'stateexist': 'state already exists.',
      'inuse': 'Data is already in use.',
      'invalidareaid': "pincode is invalid",
      'invaliddoctypeidid': "Document Type is invalid",
      'invalidtenantprojectid': "The Tenant Project Id Is Invalid.",
      "menualreadyassign": 'Menu already assign please update the menu assign data',

      'passwordlength': "Suggest a longer password.",
      'passwordluppercase': "Please enter uppercase letters for strong password.",
      'passwordlowercase': "Please enter lowercase letters for strong password.",
      'passwordnumber': "please Enter numbers for strong password.",
      'passwordspecialchar': "please Enter special characters for strong password.",
    };

    this.HEADER = {
      "Content-Type": "application/json",
    }

  }

  getServermode() {
    return this.servermode;
  }

  getResponsestatuscode() {
    return this.resstatuscode
  }

  getDBType() {
    return this.DBType;
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

  setServermode(servermode) {
    this.servermode = servermode;
  }
}


export default Config;
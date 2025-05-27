import { Config, Methods, MainDB, RecordInfo } from "./Init.js";
import _PaginationInfo from "./PaginationInfo.js";

export var RequestBody;
export var RequestHeaders;
export var ResponseBody = {};
export var ResponseHeaders = {};
export var IpAddress;
export var URL;
export var PaginationInfo;

export async function setReqHeaderParams(req, res, next) {
  try {
    var route = req.url.replace(Config.endpointv1, "");

    if (Config.dataencryption == true) {
      if (req.body.reqbody) {
        let tmpKey = req.body.reqbody.split(".")[1];
        req.body = Methods.decryptData(
          req.body.reqbody.split(".")[0],
          tmpKey
        );
      }

      if (req.headers.reqheader) {
        let tmpKey = req.headers.reqheader.split(".")[1];
        let headerKeys = Methods.decryptData(
          req.headers.reqheader.split(".")[0],
          tmpKey
        );
        req.headers = { ...req.headers, ...headerKeys };
        delete req.headers.reqheader;
      }
    }

    // if (Config.getPageName()[route]) {
    //     let pagename = Config.getPageName()[route].pagename;
    //     let action = Config.getPageName()[route].action;
    //     req.headers.pagename = pagename;
    //     req.headers.useraction = action;
    // }

    if (
      !req.headers.version ||
      (req.headers.version && Config.getVersion() <= req.headers.version)
    ) {
      ResponseBody = {};
      ResponseHeaders = {};
      RequestHeaders = Object.assign({}, req.headers);
      IpAddress =
        req.header("x-forwarded-for") ||
        req.headers["public-ip"] ||
        req.connection.remoteAddress;

      URL = req.url;
      RequestBody = Object.assign({}, req.body);

      PaginationInfo = Object.assign(
        new _PaginationInfo(),
        req.body.paginationinfo
      );

      if (URL.includes("/add")) {
        req.body.recordinfo = {
          entryuid: req.headers.uid,
          entryby: req.headers.username,
          entrydate: Methods.getdatetimeisostr(),
          timestamp: Methods.GetTimestamp(),
          isactive: 1,
        };
      }

      // fill record info data use only for add,delete,list
      if (URL.includes("/add")) {
        RecordInfo.setEntryuid(req.headers.uid);
        RecordInfo.setEntryby(req.headers.username);
        RecordInfo.setEntrydate(Methods.getdatetimeisostr());
        RecordInfo.setUpdateuid(" ");
        RecordInfo.setUpdateby(" ");
        RecordInfo.setUpdatedate(" ");
      }
      RecordInfo.setTimestamp(Methods.GetTimestamp());
      RecordInfo.setIsactive(1);
      await MainDB.puthistory(RequestBody, req.headers, IpAddress, URL);

      next();
    } else {
      let ResponseBody = {};
      ResponseBody.status = 400;
      ResponseBody.message = Config.errmsg["invalidversion"];
      ResponseBody.updateversion = true;

      if (Config.dataencryption == true) {
        const respJSON = JSON.stringify(ResponseBody);
        ResponseBody = Methods.encryptData(respJSON);
      }

      res.set(ResponseHeaders);
      res.status(400).send(ResponseBody);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: 500, message: Config.resstatuscode["500"] });
  }
}

export function UserAuth(
  action = "",
  skiprights = false,
  checkreportto = true,
  checkapproveto = true
) {
  return async function (req, res, next) {
    //check if token passed
    if (req.headers.token) {
      //validate user
      var userauth = {};

      userauth = await MainDB.authanticateuser(
        req.headers.token,
        req.headers.uid,
        req.headers.unqkey,
        req.headers.issuer || req.headers.iss,
        req.headers["user-agent"],
        req.headers.host,
        req.headers.platform,
        req.headers.pagename,
        req.headers.useraction,
        req.headers.companyid,
        req.headers.userroleid,
        req.headers.masterlisting,
        req.headers.action,
        Config.getOtherformdataaction(),
        action,
        checkreportto,
        checkapproveto
      );

      //if token expire set new on header
      if (userauth?.key && userauth?.unqkey) {
        {
          res.set({ key: userauth.key, unqkey: userauth.unqkey });
        }
        if (Config.dataencryption == true) {
          let data = {
            key: userauth.key ? userauth.key : "",
            unqkey: userauth.unqkey ? userauth.unqkey : "",
          };
          const hederJSON = JSON.stringify(data);
          let resheader = Methods.encryptData(hederJSON);
          res.set({ resheader });
        }
      }
      //if user valid next
      if (
        userauth?.status === 200 ||
        (skiprights && userauth?.status === 401)
      ) {
        req.userauth = userauth;
        next();
      }
      //send response with error message
      else {
        res
          .status(userauth.status)
          .send({ message: userauth.message, data: userauth.data });
      }
    } else {
      res.status(401).send({ message: "Unauthorized" });
    }
  };
}

export function sendResponse(req, res) {
  let ResponseBody = req.ResponseBody;

  let status = ResponseBody["status"];

  if (status == 500 && Config.logerror) {
    console.log("_______________________________________________________________");
    console.log(ResponseBody.err);
    console.log("_______________________________________________________________");

    // MainDB.createErrLog(ResponseBody.err, req.url)

    // if (Config.servermode !== "dev") {
    // 	delete ResponseBody.err
    // }
  }

  if (Config.dataencryption == true) {
    const respJSON = JSON.stringify(ResponseBody);
    ResponseBody = Methods.encryptData(respJSON);
  }
  res.status(status).send(ResponseBody);
}

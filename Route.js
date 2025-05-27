import express from "express";
import {
  setReqHeaderParams,
  sendResponse,
  UserAuth,
} from "./config/apiconfig.js";
import { Config } from "./config/Init.js";
import _Signup from './api/Authentication/Signup.js'
import _Notes from './api/Notes/Notes.js'


// *************************** import modules ***************************

const Apisignup = new _Signup()
const ApiNotes = new _Notes()


//  ****************************** Define Modules ******************************

var router = express.Router()
router.all('*', setReqHeaderParams)

router.get(Config.endpointv1 + '/healthcheck', Apisignup.health)

router.post(Config.endpointv1 + "/register", Apisignup.Register, sendResponse)
router.post(Config.endpointv1 + "/login", Apisignup.Login, sendResponse)
router.post(Config.endpointv1 + "/verify/token", Apisignup.VerifyToken, sendResponse)

router.post(Config.endpointv1 + "/notes/list", ApiNotes.ListNotes, sendResponse)
router.post(Config.endpointv1 + "/notes/add", ApiNotes.AddNotes, sendResponse)
router.post(Config.endpointv1 + "/notes/update", ApiNotes.UpdateNotes, sendResponse)
router.delete(Config.endpointv1 + "/notes/delete", ApiNotes.DeleteNotes, sendResponse)

export default router
import { Config, Methods, MainDB } from "../../config/Init.js"
import _Users from "../../model/User.js"
import _Notes from "../../model/Notes.js"

const ObjectId = Methods.getObjectId()
class Notes {
        async ListNotes(req, res, next) {
                const userId = req.body.userid;
                try {
                        const notes = await MainDB.getmenual("tblnv_" + userId.toString(), new _Notes(), [{ $match: {} }])

                        const decryptedNotes = notes.ResultData.map(note => {
                                try {
                                        return {
                                                ...note,
                                                title: Methods.decryptnotes(note.title, note.timestamp),
                                                content: Methods.decryptnotes(note.content, note.timestamp)
                                        };
                                } catch (err) {
                                        console.log("🚀 ~ Notes.js:20 ~ Notes ~ ListNotes ~ err>>", err);

                                        return {
                                                ...note,
                                                title: "[Decryption Error]",
                                                content: "[Decryption Error]"
                                        };
                                }
                        });

                        req.ResponseBody = {
                                status: 200,
                                message: "Notes Found",
                                data: decryptedNotes
                        }
                        next()
                } catch (err) {
                        req.ResponseBody = { status: 500, message: Config.resstatuscode["500"], err };
                        next();
                }
        }

        async AddNotes(req, res, next) {
                const userId = req.body.userid;
                const { title, content } = req.body;

                if (!title || !content) {
                        return res.status(400).json({ message: "Title and content are required!" });
                }
                req.body.timestamp = Methods.getdatetimeisostr()
                req.body.title = Methods.encryptnotes(title, req.body.timestamp);
                req.body.content = Methods.encryptnotes(content, req.body.timestamp);

                const addNotes = await MainDB.executedata("i", new _Notes, "tblnv_" + userId.toString(), req.body)

                req.ResponseBody = {
                        status: addNotes.status,
                        message: addNotes.status == 200 ? "Notes Added" : addNotes.message
                }
                next()
        }

        async UpdateNotes(req, res, next) {
                try {
                        const UpdateNote = await MainDB.Update("tblnv_" + req.body.userid.toString(), new _Notes(), [{ _id: new ObjectId(req.body._id) }, { status: req.body.status }])
                        req.ResponseBody = {
                                status: UpdateNote.status,
                                message: UpdateNote.status == 200 ? "Status Updated" : UpdateNote.message
                        }
                        next()
                } catch (err) {

                        req.ResponseBody = { status: 500, message: Config.resstatuscode["500"], err };
                        next();
                }
        }

        async DeleteNotes(req, res, next) {
                try {
                        const deletenote = await MainDB.executedata("d", new _Notes(), "tblnv_" + req.body.userid.toString(), [{ _id: new ObjectId(req.body._id) }])
                        req.ResponseBody = {
                                status: deletenote.status,
                                message: deletenote.status == 200 ? "Notes Deleted" : deletenote.message
                        }
                        next()
                } catch (err) {
                        req.ResponseBody = { status: 500, message: Config.resstatuscode["500"], err };
                        next();
                }
        }
}

export default Notes

import { Config, Methods, MainDB } from "../../config/Init.js"
import _Users from "../../model/User.js"

const ObjectId = Methods.getObjectId()
class Signup {
        async health(req, res, next) {
                var ResponseBody = {}
                ResponseBody.status = 401
                ResponseBody.message = Config.resstatuscode['401']
                try {
                        res.status(200).send({ message: "healthy" });
                }
                catch (err) {
                        req.ResponseBody = { status: 500, message: Config.resstatuscode["500"], err }
                        next()
                }
        }

        async Register(req, res, next) {
                try {
                        const { name, mobile, email, password, confirmPassword } = req.body;
                        if (!name || !mobile || !email || !password || !confirmPassword) {
                                return res.status(400).json({
                                        message: "Hey! All fields are required. Please complete everything.",
                                });
                        }

                        if (password !== confirmPassword) {
                                return res
                                        .status(400)
                                        .json({ message: "Oops! The passwords don't match. Try again!" });
                        }

                        const verifypwd = Methods.validatePassword(password)
                        if (verifypwd.status !== 200) {
                                console.error("Password validation failed:", verifypwd.message);
                                return res.status(verifypwd.status).json(verifypwd);
                        }

                        // const existingUser = await User.findOne({ email });
                        const existingUser = await MainDB.getmenual("tblnv_users", new _Users, [{ $match: { email: email } }])

                        if (existingUser.ResultData.length) {
                                return res
                                        .status(400)
                                        .json({ message: "Oops! This email is already registered." });
                        }

                        // const existingMobile = await User.findOne({ mobile });
                        const existingMobile = await MainDB.getmenual("tblnv_users", new _Users, [{ $match: { mobile: mobile } }])

                        if (existingMobile.ResultData.length) {
                                return res.status(400).json({
                                        message: "Your mobile number is already in use. Try a different one!",
                                });
                        }

                        // const hashedPassword = await bcrypt.hash(password, 10);
                        const hashedPassword = await Methods.encryptData(password);
                        const data = {
                                name: name,
                                mobile: mobile,
                                email: email,
                                password: hashedPassword,
                                createdAt: Methods.getdatetimeisostr()
                        }

                        const check = await MainDB.executedata("i", new _Users(), "tblnv_users", data, false)

                        req.ResponseBody = {
                                status: check.status,
                                message: check.status == 200 ? `${name}, welcome to aboard! You've been successfully registered!` : check.message
                        }
                        next()
                } catch (err) {
                        req.ResponseBody = { status: 500, message: Config.resstatuscode["500"], err }
                        next()
                }
        }

        async Login(req, res, next) {
                try {
                        const { email, password } = req.body;

                        if (!email || !password) {
                                return res.status(400).json({
                                        message: "All fields are required! Please provide email and password.",
                                });
                        }

                        // Fetch user using your custom DB layer
                        const existingUser = await MainDB.getmenual("tblnv_users", new _Users(), [{ $match: { email: email } }]);

                        if (!existingUser.ResultData.length) {
                                return res.status(400).json({
                                        message: "Hmm... we couldn't find your email. Try again!",
                                });
                        }

                        const user = existingUser.ResultData[0];

                        let tmpKey = user.password.split(".")[1];

                        // Compare passwords using your custom method
                        const isMatch = await Methods.decryptData(user.password.split(".")[0], tmpKey);

                        if (isMatch !== password) {
                                return res.status(400).json({
                                        message: "Invalid credentials. Check your email or password.",
                                });
                        }

                        // const token = jwt.sign({ userId: user._id || user.id }, process.env.JWT_SECRET_KEY, {
                        //         expiresIn: "5h",
                        // });
                        const uid = user._id
                        const unqkey = Methods.generateuuid()

                        var token = await MainDB.getjwt(uid, unqkey)

                        req.ResponseBody = {
                                status: 200,
                                message: "Success! You're logged in.",
                                unqkey: unqkey,
                                uid: uid,
                                token
                        }
                        next()

                } catch (err) {
                        req.ResponseBody = { status: 500, message: Config.resstatuscode["500"], err };
                        next();
                }
        }

        async VerifyToken(req, res, next) {
                try {
                        const check = await MainDB.validatejwt(req.body.token, req.body.uid, req.body.unqkey);
                        if (check.status !== 200) {
                                req.ResponseBody = {
                                        status: check.status,
                                        message: check.message
                                }
                                return next()
                        }
                        const user = await MainDB.getmenual("tblnv_users", new _Users(), [{ $match: { _id: new ObjectId(req.body.uid) } }]);
                        if (!user.ResultData.length) {
                                // return res.status(404).json({ message: "User not found" });
                                req.ResponseBody = {
                                        status: 404,
                                        message: "User Not Found!"
                                }
                                next()
                        }
                        const userid = user.ResultData[0]._id;
                        const { name, email, mobile } = user.ResultData[0];
                        req.ResponseBody = {
                                status: 200,
                                userid, name, email, mobile
                        }
                        req.body = { userid, name, email, mobile }
                        next()

                        // res.json({ userid, name, email, mobile });
                } catch (err) {
                        req.ResponseBody = { status: 500, message: Config.resstatuscode["500"], err };
                        next();
                }
        }

}

export default Signup
import CryptoJS from "crypto-js"
import crypto from 'crypto'
import ObjectId from 'mongoose'
import { Config, MainDB } from "./Init.js"
import path from 'path'
import fs from 'fs'

const Objectid = ObjectId.Types.ObjectId

class Methods {
        encryptData(data) {
                try {
                        const uid = this.generateRandomString(16);
                        const secretKey = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY);
                        const iv = CryptoJS.enc.Utf8.parse(uid);
                        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), secretKey, {
                                iv: iv,
                        });
                        return encrypted.toString() + "." + uid;
                } catch (e) {
                        console.log(e);
                        return data;
                }
        }

        decryptData(data, tempkey) {
                try {
                        const secretKey = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_KEY);
                        let iv = CryptoJS.enc.Utf8.parse(tempkey);
                        const bytes = CryptoJS.AES.decrypt(data, secretKey, { iv: iv });
                        const deData = bytes.toString(CryptoJS.enc.Utf8);
                        return JSON.parse(deData);
                } catch (e) {
                        console.log(e);
                }
        }

        encryptnotes(text, key) {
                const hashKey = crypto.createHash('sha256').update(key).digest(); // 256-bit key
                const iv = crypto.randomBytes(16); // Initialization vector
                const cipher = crypto.createCipheriv('aes-256-cbc', hashKey, iv);
                let encrypted = cipher.update(text, 'utf-8', 'hex');
                encrypted += cipher.final('hex');
                return iv.toString('hex') + ':' + encrypted; // Store IV with the encrypted string
        }

        decryptnotes(encryptedText, key) {
                const hashKey = crypto.createHash('sha256').update(key).digest();
                const [ivHex, data] = encryptedText.split(':');
                const iv = Buffer.from(ivHex, 'hex');
                const decipher = crypto.createDecipheriv('aes-256-cbc', hashKey, iv);
                let decrypted = decipher.update(data, 'hex', 'utf-8');
                decrypted += decipher.final('utf-8');
                return decrypted;
        }

        validatePassword(password) {
                let secretKey = "JainilKey";
                const minLength = 8;
                const maxLength = 16;
                if (
                        password.length < minLength ||
                        password.length > maxLength ||
                        password.search(/[a-z]/i) < 0 ||
                        password.search(/[A-Z]/) < 0 ||
                        password.search(/[0-9]/) < 0
                ) {
                        return {
                                status: 400,
                                message: "Please Enter a valid password with at least 1 lowercase letter, 1 uppercase letter, and 1 number, between 8 to 16 characters.",
                        };
                } else {
                        // console.log("PWD value", password);

                        const checkPwdtype = this.checkPWD(password);

                        if (checkPwdtype.valid === true) {
                                const uid = this.generateRandomString(16);


                                return {
                                        status: 200,
                                        message: "password verify"
                                };
                        } else {
                                return {
                                        status: 400,
                                        message: checkPwdtype.message,
                                };
                        }
                }
        }

        checkPWD(password) {
                for (let i = 0; i < password.length - 2; i++) {
                        const char1 = password[i].toLowerCase();
                        const char2 = password[i + 1].toLowerCase();
                        const char3 = password[i + 2].toLowerCase();

                        if (isLetter(char1) && isLetter(char2) && isLetter(char3)) {
                                if (
                                        Math.abs(char1.charCodeAt(0) - char2.charCodeAt(0)) === 1 &&
                                        Math.abs(char2.charCodeAt(0) - char3.charCodeAt(0)) === 1
                                ) {
                                        return {
                                                valid: false,
                                                message:
                                                        "Password should not contain consecutive letters (e.g., ABC, XYZ).",
                                        };
                                }
                        }

                        if (isDigit(char1) && isDigit(char2) && isDigit(char3)) {
                                if (
                                        Math.abs(char1.charCodeAt(0) - char2.charCodeAt(0)) === 1 &&
                                        Math.abs(char2.charCodeAt(0) - char3.charCodeAt(0)) === 1
                                ) {
                                        return {
                                                valid: false,
                                                message:
                                                        "Password should not contain consecutive digits (e.g., 123, 789).",
                                        };
                                }
                        }
                }

                function isLetter(char) {
                        return /[a-zA-Z]/.test(char);
                }

                function isDigit(char) {
                        return /[0-9]/.test(char);
                }
                return { valid: true, message: "Password is valid." };
        }

        getObjectId() {
                return ObjectId.Types.ObjectId
        }

        getdatetimeisostr() {
                return new Date().toISOString();
        }

        getdatetimestr() {
                return new Date().toISOString().
                        replace(/T/, ' ').      // replace T with a space
                        replace(/\..+/, '')
        }

        generateRandomString(length) {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                const charactersLength = characters.length;

                for (let i = 0; i < length; i++) {
                        result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }

                return result;
        }

        generateuuid() {
                return crypto.randomUUID()
        }

        Jsontostring(data) {
                return JSON.stringify(data)
        }

        //get timestamp string
        GetTimestamp() {
                return Date.now();
        }
        GetIndianTimestamp() {
                return moment().utcOffset("+05:30").format();
        }
}
export default Methods;
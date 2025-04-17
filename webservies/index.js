// const express = require("express");
// const mongoose = require("mongoose");
import express from express;
import mongoose from "mongoose";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// const mongoUser = 'mongo';
// const mongoPassword = 'xGARnhVCdFajnTHonTcRSIydATFCDxmU';
// const mongoHost = 'mongodb.railway.internal';
// const mongoDatabase = 'noteVerseDB';

mongoose
  .connect("mongodb://localhost:27017/noteverse")
  // mongoose.connect('mongodb+srv://jainilmithaiwala:kw4aXKLTxxngvMjG@noteverse.pfoob.mongodb.net/')
  .then(() => console.log("Database Connected"))
  .catch((err) => console.log("Database connection error:", err));


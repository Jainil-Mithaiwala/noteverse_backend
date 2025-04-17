import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import GoogleGenerativeAI from "@google/generative-ai";

// Load environment variables
dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
});

// MongoDB connection
// .connect("mongodb+srv://noteverse-user:G0GSu8pwkSAtKg2S@noteverse.yg9ke.mongodb.net/?retryWrites=true&w=majority&appName=noteverse")
mongoose
  // .connect("mongodb://localhost:27017/noteverse")
  .connect(process.env.MONGO_URI)
  .then(() =>
    app.listen(5000, () => {
      console.log("Server is up and running on http://localhost:5000 🚀");
    })
  )
  .catch((err) =>
    console.log("Oops! Something went wrong with DB connection:", err)
  );

// Note Schema
const noteSchema = new mongoose.Schema({
  title: String,
  content: String,
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

// const Note = mongoose.model("Note", noteSchema);

const createNoteModel = (userId) => {
  const collectionName = `notes_${userId}`; // Create collection name based on userId

  // Check if the model already exists, and if so, return it; otherwise, create it
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }

  const noteSchema = new mongoose.Schema({
    title: String,
    content: String,
    completed: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
  });

  return mongoose.model(collectionName, noteSchema); // Return a dynamic model for the user
};

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// Middleware to verify the JWT token
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Whoa! We need a token to continue..." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // Use secretKey from env
    req.userId = decoded.userId; // Store userId in the request object for further use
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired token. Try again!" });
  }
};

app.post("/generate-content", async (req, res) => {
  const userPrompt = req.body.prompt;
  console.log(userPrompt);
  try {
    const r = await model.generateContent(userPrompt);
    res.json({ text: r.response.text() });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Failed to generate content" }); // Send error message if generation fails
  }
});

app.post("/register", async (req, res) => {
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

    if (mobile.length !== 10) {
      return res.status(400).json({
        message: "Whoa! Your mobile number must be exactly 10 digits!",
      });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password needs at least 8 characters. Secure it!" });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        message: "Your password should include at least one lowercase letter!",
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        message: "We need at least one uppercase letter in your password!",
      });
    }

    if (!/\d/.test(password)) {
      return res
        .status(400)
        .json({ message: "Make sure your password has at least one number!" });
    }

    if (!/[@$!%*?&]/.test(password)) {
      return res
        .status(400)
        .json({ message: "Add a special character to your password!" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Oops! This email is already registered." });
    }

    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({
        message: "Your mobile number is already in use. Try a different one!",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      mobile,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({
      message: `${name}, welcome aboard! You've been successfully registered!`,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Oops! Something went wrong on our end. Try again!" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required! Please provide email and password.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Hmm... we couldn't find your email. Try again!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials. Check your email or password.",
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "5hr",
    });
    res.json({
      message: "Success! You're logged in.",
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: "Oops! Something went wrong on our end. Try again later!",
    });
  }
});

app.get("/notes", verifyToken, async (req, res) => {
  const userId = req.userId; // Get the userId from the verified token

  // Create the dynamic model for the specific user
  const Note = createNoteModel(userId);

  try {
    const notes = await Note.find(); // Get all notes for the user
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching notes. Try again!" });
  }
});

app.post("/notes", verifyToken, async (req, res) => {
  const userId = req.userId; // Get the userId from the verified token

  // Create the dynamic model for the specific user
  const Note = createNoteModel(userId);

  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: "Title and content are required!" });
  }

  const newNote = new Note({
    title,
    content,
    completed: false,
  });

  try {
    await newNote.save();
    res.json(newNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating the note. Try again!" });
  }
});

app.put("/notes/:id", verifyToken, async (req, res) => {
  const userId = req.userId; // Get the userId from the verified token
  const noteId = req.params.id;
  const { completed } = req.body;

  // Create the dynamic model for the specific user
  const Note = createNoteModel(userId);

  try {
    const note = await Note.findByIdAndUpdate(
      noteId,
      { completed },
      { new: true } // Return the updated note
    );

    if (!note) {
      return res.status(404).json({ message: "Note not found!" });
    }

    res.json(note); // Return the updated note
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating the note. Try again!" });
  }
});

app.delete("/notes/:id", verifyToken, async (req, res) => {
  const userId = req.userId; // Get the userId from the verified token
  const noteId = req.params.id;

  // Create the dynamic model for the specific user
  const Note = createNoteModel(userId);

  try {
    const note = await Note.findByIdAndDelete(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found!" });
    }

    res.json({ message: "Note deleted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting the note. Try again!" });
  }
});

// New route for fetching user data from token
app.get("/user/token", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId); // Use decoded userId from token
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userid = user._id;
    const { name, email, mobile } = user;
    res.json({ userid, name, email, mobile });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res
      .status(500)
      .json({ message: "Something went wrong, please try again!" });
  }
});

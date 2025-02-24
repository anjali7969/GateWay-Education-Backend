const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require("express-async-handler");
require('dotenv').config();
const WelcomeEmail = require('../templets/WelcomeEmail');

// Import mailer
const transporter = require('../middlewares/mailConfig');

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || "2h" }
    );
};

// Register a new user (Student, Admin)
const registerUser = async (req, res) => {
    try {
        console.log("Received signup request:", req.body);

        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password,
            phone,

            role: role || "Student",
        });

        const token = generateToken(user);

        // Send registration email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Registration Successful. Welcome!",
            html: WelcomeEmail({ name: user.name }),
        };
        await transporter.sendMail(mailOptions);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: { name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("Signup error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


// Login user (Student, Admin) 
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password" });
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: { _id: user._id, name: user.name, email: user.email, role: user.role }
        });


    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


// ✅ Get Current Logged-in User
const getCurrentUser = asyncHandler(async (req, res) => {
    try {
        // Ensure `req.user` is set by `protect` middleware
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized, no user found" });
        }

        // Fetch user details from DB
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error fetching current user:", error.message);
        res.status(500).json({ message: "Server error" });
    }
});


// Upload Image (Consistent style with loginUser)
const uploadImage = async (req, res) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a file" });
        }

        // Return the filename of the uploaded image
        res.status(200).json({
            success: true,
            data: req.file.fileName, // Filename of the uploaded image
        });
    } catch (error) {
        console.error("Image upload error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { registerUser, loginUser, getCurrentUser, uploadImage };

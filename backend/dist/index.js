"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = __importDefault(require("zod"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const authMiddleware_1 = require("./authMiddleware");
require('dotenv').config(); // Importing dotenv to load env variables
const app = (0, express_1.default)();
app.use(express_1.default.json());
const port = 3000;
const prisma = new client_1.PrismaClient(); // Initialize Prisma client
// JWT_SECRET 
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
}
//homepage route
app.get("/", (req, res) => {
    res.send("This is the Home Page");
});
const signupdata = zod_1.default.object({
    username: zod_1.default.string().min(3, 'Username must be at least 3 characters long'),
    password: zod_1.default.string().min(6, 'Password must be at least 6 characters long'),
    firstname: zod_1.default.string(),
    lastname: zod_1.default.string()
});
// Route to Signup
app.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = signupdata.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid data entered. Please enter correct data" });
    }
    const { username, password, firstname, lastname } = parseResult.data;
    try {
        // Check if the user already exists
        const existingUser = yield prisma.user.findUnique({
            where: { username }
        });
        if (existingUser) {
            return res.status(400).json({ message: "Username is already taken" });
        }
        // Hash the password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Store the user in the DB
        const newUser = yield prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                firstname,
                lastname
            }
        });
        //token generation
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, username, firstname, lastname }, JWT_SECRET, {
            expiresIn: '1h' // Set token expiration time
        });
        res.status(201).json({
            message: "User registered successfully",
            token
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred during registration" });
    }
}));
// Route to Login
app.post("/login", authMiddleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    try {
        const user = yield prisma.user.findUnique({
            where: { username }
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid username or password" });
        }
        const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid username or password" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, firstname: user.firstname, lastname: user.lastname }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: "Login successful",
            token,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred during login" });
    }
}));
//route to add todo
app.post("/addtodo", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, description, status } = req.body;
    // Ensure required fields are provided
    if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
    }
    try {
        // Store the new todo in the database with a dummy userId
        const newTodo = yield prisma.todo.create({
            data: {
                title,
                description,
                userId: '66f19e159ad5f0ac0de81fdd' // Replace with an actual userId or a dummy one
            }
        });
        // Send success response with the created todo
        res.status(201).json({
            message: "Todo added successfully",
            todo: newTodo
        });
    }
    catch (error) {
        console.error("Error adding todo:", error);
        res.status(500).json({ message: "An error occurred while adding the todo" });
    }
}));
app.put("/markcomplete", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.body; // Assuming the id of the todo is passed in the request body
    if (!id) {
        return res.status(400).json({ message: "Todo ID is required" });
    }
    try {
        // Update the 'done' field to true for the specific todo
        const updatedTodo = yield prisma.todo.update({
            where: { id: id },
            data: { done: true } // Mark the todo as completed
        });
        // Send success response with the updated todo
        res.status(200).json({
            message: "Todo marked as complete",
            todo: updatedTodo
        });
    }
    catch (error) {
        console.error("Error marking todo as complete:", error);
        res.status(500).json({ message: "An error occurred while updating the todo" });
    }
}));
//get all todos
app.get("/todos", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all todos from the database
        const todos = yield prisma.todo.findMany();
        // Send success response with the list of todos
        res.status(200).json({
            message: "Todos retrieved successfully",
            todos: todos
        });
    }
    catch (error) {
        console.error("Error fetching todos:", error);
        res.status(500).json({ message: "An error occurred while fetching the todos" });
    }
}));
app.listen(port, () => {
    console.log(`Server is running on Port ${port}`);
});

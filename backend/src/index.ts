import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import zod from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authMiddleware } from './authMiddleware';
require('dotenv').config();

const app = express();
app.use(express.json());

const port: number = 3000;
const prisma = new PrismaClient(); // Initialize Prisma client

// JWT_SECRET 
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
}


//homepage route
app.get("/", (req,res) => {
    res.send("This is the Home Page")
})

const signupdata = zod.object({
    username: zod.string().min(3, 'Username must be at least 3 characters long'),
    password: zod.string().min(6, 'Password must be at least 6 characters long'),
    firstname: zod.string(),
    lastname: zod.string()
});

// Route to Signup
app.post("/signup", async (req: Request, res: Response) => {
    const parseResult = signupdata.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid data entered. Please enter correct data" });
    }

    const { username, password, firstname, lastname } = parseResult.data;

    try {
        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return res.status(400).json({ message: "Username is already taken" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store the user in the DB
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword, 
                firstname,
                lastname
            }
        });

        //token generation
        const token = jwt.sign({ id: newUser.id, username, firstname, lastname }, JWT_SECRET, {
            expiresIn: '1h' // token expiration time
        });

        res.status(201).json({
            message: "User registered successfully",
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred during registration" });
    }
});

// Route to Login
app.post("/login",authMiddleware, async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, firstname: user.firstname, lastname: user.lastname },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: "Login successful",
            token,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred during login" });
    }
});

//route to add todo
app.post("/addtodo", async (req: Request, res: Response) => { 
    const { title, description, status } = req.body;

    if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
    }

    try {
        const newTodo = await prisma.todo.create({
            data: {
                title,
                description,
                userId: '66f19e159ad5f0ac0de81fdd' //temp id
            }
        });

        res.status(201).json({
            message: "Todo added successfully",
            todo: newTodo
        });
    } catch (error) {
        console.error("Error adding todo:", error);
        res.status(500).json({ message: "An error occurred while adding the todo" });
    }
});

app.put("/markcomplete", async (req: Request, res: Response) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Todo ID is required" });
    }

    try {
        const updatedTodo = await prisma.todo.update({
            where: { id: id },
            data: { done: true } //update in DB
        });

        res.status(200).json({
            message: "Todo marked as complete",
            todo: updatedTodo
        });
    } catch (error) {
        console.error("Error marking todo as complete:", error);
        res.status(500).json({ message: "An error occurred while updating the todo" });
    }
});

//get all todos
app.get("/todos", async (req: Request, res: Response) => {
    try {
        const todos = await prisma.todo.findMany();

        res.status(200).json({
            message: "Todos retrieved successfully",
            todos: todos
        });
    } catch (error) {
        console.error("Error fetching todos:", error);
        res.status(500).json({ message: "An error occurred while fetching the todos" });
    }
});




app.listen(port, () => {
    console.log(`Server is running on Port ${port}`);
})
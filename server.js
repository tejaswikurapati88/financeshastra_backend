const express= require('express')
const mysql = require('mysql2/promise');
const cors= require('cors')
const bcrypt= require('bcrypt')
const jwt= require('jsonwebtoken')
require('dotenv').config()

const app= express()

app.use(express.json())
app.use(cors())

const dbCredentials={
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 25060,
    ssl: { rejectUnauthorized: false },
}

const PORT = 3000;
let dbConnection
const connectAndStartServer= async ()=>{
    try{
        dbConnection= await mysql.createConnection(dbCredentials)
        console.log('Connected to the database!');
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    }catch(err){
        console.log('Error While Connecting:', err)
        process.exit(1)
    }
}

connectAndStartServer()


// get Users Table 
app.get('/users', async (req, res)=>{
    try{
        if (!dbConnection){
            return res.status(500).json({ error: 'Database connection is not established' });
        }
        const selectQuery = 'SELECT * FROM users';
        const [users] = await dbConnection.query(selectQuery); 
        res.json(users);
    }catch(error){
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

// Insert user into table
app.post('/api/register', async (req, res)=>{
    try{
        const {username, email, password }= req.body
        if (!dbConnection){
            return res.status(500).json({error: "Database connection is not established" });
        }
        if (username === ""|| email=== ""|| password=== ""){
            return res.status(400).json({message: "All the details should be provided"})
        }else{
            const hashedPass= await bcrypt.hash(password, 10)
            const insertQuery = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
            await dbConnection.query(insertQuery, [username, email, hashedPass]);
            res.status(201).json({ message: 'User registered successfully' });
        }
    }catch(error){
        res.status(500).json({ error: "Internal Server Error", details: error.message})
    }
})

// Login user
app.post('/api/signin', async (req, res)=>{
    try{
        const {email, password}= req.body 
        if (!dbConnection){
            return res.status(500).json({error: "Database connection is not established" })
        }
        if (email ===""){
            return res.status(400).json({ message: "Please enter Email Address"})
        }else if(password=== ''){
            return res.status(400).json({ message: "Please enter Password" })
        }else{
            const isRegUser= `Select * from users where email = '${email}';`
            const [user]= await dbConnection.query(isRegUser)
            if (user.length === 0){
                res.status(500).json({message: "Invalid User. Please SignUp!"})
            }else{
                const compare= await bcrypt.compare(password, user[0].password)
                if (compare){
                    const payload = {
                        userId: user.id,
                        username: user.name,
                        email: user.email,
                      };
                    const token= jwt.sign(payload, process.env.SECRET_KEY)
                    res.status(200).json({jwtToken: token})
                }else{
                    res.status(400).json({message: "InCorrect Password. Please try again!"})
                }
                
            }
        }
    }catch(error){
        res.status(500).json({error: "Internal Server Error", details: error.message})
    }
})
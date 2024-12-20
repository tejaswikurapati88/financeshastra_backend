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
        const {first_name, last_name, email, password, Date_of_birth, enabled}= req.body
        if (!dbConnection){
            return res.status(500).json({error: "Database connection is not established" });
        }
        if (first_name === ""|| last_name==="" || email=== "" || Date_of_birth==="" || password=== ""){
            return res.status(400).json({message: "All the details should be provided"})
        }else{
            const [userExists]= await dbConnection.query(`select * from users where email= '${email}'`)
            if (userExists.length===0){
                const hashedPass= await bcrypt.hash(password, 10)
                const insertQuery = 'INSERT INTO users (first_name, last_name, email, password, Date_of_birth, creation_date, last_access_date, enabled) VALUES (?, ?, ?, ?, ?, now(), now(), ?)';
                await dbConnection.query(insertQuery, [first_name, last_name, email, hashedPass, Date_of_birth, enabled]);
                res.status(200).json({ message: 'User registered successfully' });
            }else{
                res.status(400).json({message: 'User already Exists, Please Login!'})
            }
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
            const isRegUser= `Select * from users where email = ?;`
            const [user]= await dbConnection.query(isRegUser, [email])
            if (user.length === 0){
                res.status(404).json({message: "Invalid User. Please SignUp!"})
            }else{
                const compare= await bcrypt.compare(password, user[0].password)
                if (compare){
                    const payload = {
                        userId: user.id,
                        name: user.name,
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
        console.error("Error in /api/signin:", error);
        res.status(500).json({error: "Internal Server Error", details: error.message})
    }
})




const express= require('express')
const mysql = require('mysql2/promise');
const cors= require('cors')
const bcrypt= require('bcrypt')
const jwt= require('jsonwebtoken')
require('dotenv').config()

const app= express()

app.use(express.json())
app.use(cors())

app.use(express.json());

// Error-handling middleware for JSON parse errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON payload:', err.message);
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    next();
});

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
        const selectQuery = 'SELECT * FROM userstable';
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
        const { name, email, password}= req.body
        console.log(name, email, password)
        if (!dbConnection){
            console.log('database is not connected')
            return res.status(500).json({error: "Database connection is not established" });
        }
        if (name === ""|| email=== "" || password=== ""){
            console.log("name, email, password is not provided")
            return res.status(400).json({message: "All the details should be provided"})
        }else{
            console.log("checking user")
            const [userExists]= await dbConnection.query(`select * from userstable where email= '${email}'`)
            console.log(userExists)
            if (userExists.length===0){
                console.log("user not exists")
                const hashedPass= await bcrypt.hash(password, 10)
                console.log(hashedPass)
                const insertQuery = 'INSERT INTO userstable (username, email, password, creation_date) VALUES (?, ?, ?, now());';
                await dbConnection.query(insertQuery, [name, email, hashedPass]);
                res.status(200).json({ message: 'User registered successfully' });
            }else{
                console.log('user already exists')
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
        console.log(req.body)
        if (!dbConnection){
            return res.status(500).json({error: "Database connection is not established" })
        }
        if (email ===""){
            return res.status(400).json({ message: "Please enter Email Address"})
        }else if(password=== ''){
            return res.status(400).json({ message: "Please enter Password" })
        }else{
            const isRegUser= `Select * from userstable where email = ?;`
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
                    const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "1h" });
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



app.get('/api/plans', async (req, res)=>{
    try{
        if (!dbConnection){
            return res.status(500).json({ error: 'Database connection is not established' });
        }
        const selectQuery = 'SELECT * FROM subscription_plan';
        const [plans] = await dbConnection.query(selectQuery); 
        res.json(plans);
    }catch(error){
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.post('/api/user/payment', async (req, res)=>{
    try{
        if (!dbConnection){
            return res.status(500).json({error: 'Database connection is not established'})
        }
        const {fullName, cardNumber, expirationDate, securityCode, country, state, 
            city, addressLine1, addressLine2, postalCode, billingCycle, termsAccepted, planId}= req.body
        if (fullName === ""|| cardNumber==="" || expirationDate=== "" || securityCode==="" || country=== ""||
            state === ""|| city==="" || addressLine1=== "" || addressLine2==="" || postalCode=== "" || billingCycle===''
            || termsAccepted==="" || planId===""){
                console.log('fill all details')
            return res.status(400).json({message: "All the details should be provided"})
        }else{
            if (termsAccepted === false){
                terms=0
            }else{
                terms=1
            }
            const insertQuery = 'INSERT INTO user_payment_details (full_name, card_number, expiry_date, security_code, country, state, city, address_line_1, address_line_2, postal_code, billing_cycle, terms_accepted, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);';
            await dbConnection.query(insertQuery, [fullName, cardNumber, expirationDate, securityCode, 
                country, state, city, addressLine1, addressLine2, postalCode, billingCycle, terms, planId])
            res.status(200).json({ message: 'User payment details added successfully' });
        }
    }catch (error){
                console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.delete('/api/deleteuserpatment/', async (req, res)=>{
    try{
        if (!dbConnection){
            return res.status(500).json({error: 'Database connection is not established'})
        }
        const deleteSQL= `Delete from user_payment_details where idElite_payment_premium_form= 2`
        await dbConnection.query(deleteSQL)
        res.status(200).json({message: "user details deleted Successfully"})
    }catch(e){
        console.error('Error fetching users:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.get('/api/userpayment', async (req, res)=>{
    try{
        if (!dbConnection){
            return res.status(500).json({ error: 'Database connection is not established' });
        }
        const selectQuery = 'SELECT * FROM user_payment_details';
        const [users] = await dbConnection.query(selectQuery); 
        res.json(users);
    }catch(error){
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.get('/api/stocks', async (req, res)=>{
    try{
        if (!dbConnection){
            return res.status(500).json({error: 'Database connection is not established'})
        }
        const stocksQuery=`select * from stocks;`;
        const [stocks] = await dbConnection.query(stocksQuery)
        res.status(200).json(stocks);
    }catch(e){
        console.error('Error fetching users:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

/*app.get('/api/compstock', async (req, res)=>{
    try{
        if (!dbConnection){
            return res.status(500).json({error: 'Database connection is not established'})
        }
        const stockslistQuery=`select * from comapanies_stocks_list;`;
        const [stockslist] = await dbConnection.query(stockslistQuery)
        res.status(200).json(stockslist);
    }catch(e){
        console.error('Error fetching users:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})*/

app.get('/api/nifty500', async (req, res)=>{
    try{
        if (!dbConnection){
            return res.status(500).json({error: 'Database connection is not established'})
        }
        const niftyQuery=`select * from Nifty500_Company_List;`;
        const [nifty500] = await dbConnection.query(niftyQuery)
        res.status(200).json(nifty500);
    }catch(e){
        console.error('Error fetching users:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
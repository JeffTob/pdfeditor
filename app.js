const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const http = require('http');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
require('dotenv').config();
const port = 5000;
const upload = multer(); // Setup multer for memory storage

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Configure session middleware
app.use(session({
    secret: '1945', // You should use a long, random string in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // For HTTPS: set secure to true
}));

// Handle CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Serve login page
app.get('/login', (req, res) => {
    if (req.session.loggedIn) {
        console.log('User is already logged in');
        res.redirect('/'); // Redirect to home if already logged in
    } else {
        res.sendFile('login.html', { root: __dirname + '/public' });
    }
});

// Handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.INUSERNAME && password === process.env.INPASS) {
        req.session.loggedIn = true; // Set session variable
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

// Middleware to protect routes
function requireLogin(req, res, next) {
    if (!req.session || !req.session.loggedIn) { // Make sure to check if session and session.loggedIn exist
        console.log('User is not logged in');
        res.redirect('/login');
    } else {
        console.log('User is logged in');
        next();
    }
}

// Use requireLogin middleware to protect the home route
app.get('/',(req, res) => {
    if (!req.session || !req.session.loggedIn) { // Make sure to check if session and session.loggedIn exist        
        res.redirect('/login');
    } else {   
        //pointUrl = process.env.POINTURL;             
        res.sendFile('report.html', { root: __dirname + '/public' });
    }    
});

// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if(err) {
            console.log("Error destroying session:", err);
        }
        res.clearCookie('connect.sid'); // Clear the cookie set by express-session
        res.redirect('/login');
    });
});

// Endpoint to handle the file upload and forward it to an external URL
app.post('/uploadXML', upload.single('xmlFile'), async (req, res) => {
try {
    // Check if user is logged in
    if (!req.session || !req.session.loggedIn) {
        console.log('Tried to upload XML without being logged in.');
        // Send a 404 Not Found status with a custom error message
        return res.status(403).send('Unauthorized: Please log in to access this feature');
    }

    // Continue with file upload process if logged in
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const formData = new FormData();
    formData.append('xmlFile', req.file.buffer, { filename: req.file.originalname });
    formData.append('applyEnumerations', req.body.applyEnumerations);

    
        const apiResponse = await fetch(process.env.POINTURL, {
            port :4000,
            method: 'POST',
            headers: {
                'Authorization': process.env.TOKEN,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text(); // Try to read the error message from the response
            console.error('Error response from the server:', errorText);
            res.status(500).send(`${errorText}`);
            return; // Important to prevent further execution
           
        }

        // Stream the PDF file directly to the client
        res.setHeader('Content-Type', 'application/pdf');
        apiResponse.body.pipe(res);


        

    } catch (error) {
        console.error('Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            res.status(500).send("The service is currently unavailable. Please try again later.");
        } else {
            res.status(500).send(error.message);
        }
    }
});

app.post('/uploadPDF', upload.single('pdfFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Handle PDF file processing here as needed
        res.status(200).send('PDF uploaded successfully.');
    } catch (error) {
        console.error('Error uploading PDF:', error);
        res.status(500).send('Error uploading PDF.');
    }
});

app.post('/summarizePDF', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).send('No text provided for summarization.');
        }

        // Send the extracted text to OpenAI for summarization
        const summary = await getSummaryGoogleGenerativeAI(text);

        // Return the summary
        res.status(200).json({ summary });

    } catch (error) {
        console.error('Error summarizing PDF:', error.message);
        res.status(500).send(error.message);
    }
});

async function getSummaryGoogleGenerativeAI(text) {    

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); //gemini-1.0-pro  //gemini-1.5-flash
   
    const prompt = "Please summarize this PDF, focusing on the key points, main arguments, and any important conclusions. Highlight essential information while keeping the summary concise and clear. Skip any redundant or overly technical details unless they are critical to understanding the documents overall purpose:\n\n" + text;
    const result = await model.generateContent(prompt);
    
    return result.response.text();
}

async function getSummaryOpenAI(text) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Ensure this is set in your environment variables
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: `Please the following text,, focusing on the key points, main arguments, and any important conclusions.:\n\n${text}` }
            ],
            max_tokens: 150,
            temperature: 0.7
        })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Importing dependencies

const express = require('express');
const app = express();
const cors = require('cors');

// -------------------------------------------------------------------------------------------------

// App configurations

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------------------------------------------

// Test route

app.get('/test', (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Spotter backend is running"
    })
}); 

// -------------------------------------------------------------------------------------------------

// Setting up the port

app.listen(process.env.PORT || 3001, () => {
    console.log("Server started at http://localhost:3001");
})

// -------------------------------------------------------------------------------------------------
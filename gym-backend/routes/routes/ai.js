const express = require("express");
const router = express.Router();
const axios = require("axios");

router.get("/video", async (req, res) => {
    try {
        const response = await axios({
            url: "http://127.0.0.1:5000/video",
            method: "GET",
            responseType: "stream"
        });

        response.data.pipe(res);
    } catch (error) {
        res.status(500).send("Error connecting to AI server");
    }
});

module.exports = router;
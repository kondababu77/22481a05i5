require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const ShortUrl = require("./models/urlModel");
const logger = require("./logger");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.post("/shorturls", async (req, res) => {
  const { originalUrl, expiry } = req.body;

  const shortCode = Math.random().toString(36).substring(2, 8);
  const newUrl = new ShortUrl({
    originalUrl,
    shortCode,
    expiry: expiry ? new Date(expiry) : null,
  });

  await newUrl.save();
  res.json(newUrl);
});

app.get("/shorturls/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;
  const shortUrl = await ShortUrl.findOne({ shortCode });

  if (!shortUrl) return res.status(404).json({ message: "URL not found" });

  const now = new Date();
  if (shortUrl.expiry && now > shortUrl.expiry) {
    return res.status(410).json({ message: "Link expired" });
  }

  shortUrl.totalClicks++;
  shortUrl.clicks.push(now);
  await shortUrl.save();

  res.redirect(shortUrl.originalUrl);
});

app.get("/shorturls/:shortCode/stats", async (req, res) => {
  const shortCode = req.params.shortCode;
  const shortUrl = await ShortUrl.findOne({ shortCode });

  if (!shortUrl) return res.status(404).json({ message: "URL not found" });

  res.json(shortUrl);
});



// Example in route:
app.post("/shorturls", async (req, res) => {
  try {
    const { originalUrl, expiry } = req.body;

    const shortCode = Math.random().toString(36).substring(2, 8);
    const newUrl = new ShortUrl({
      originalUrl,
      shortCode,
      expiry: expiry ? new Date(expiry) : null,
    });

    await newUrl.save();
    logger.info(`Short URL created: ${shortCode} -> ${originalUrl}`);
    res.json(newUrl);
  } catch (error) {
    logger.error(`Error creating short URL: ${error.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

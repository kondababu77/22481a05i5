require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const ShortUrl = require("./models/urlModel");
const logger = require("./logger");
const shortid = require("shortid");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Request received: ${req.method} ${req.originalUrl}`);
  next();
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("MongoDB connected successfully.");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

const isUrlValid = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const generateUniqueShortcode = async () => {
  let shortcode = shortid.generate();
  while (await ShortUrl.findOne({ shortcode })) {
    shortcode = shortid.generate();
  }
  return shortcode;
};

app.post("/shorturls", async (req, res) => {
  try {
    const { originalUrl, expiry, shortcode } = req.body;

    if (!originalUrl || !isUrlValid(originalUrl)) {
      return res.status(400).json({ message: "Invalid or missing 'originalUrl'." });
    }

    let finalShortcode;
    if (shortcode) {
      if (!shortid.isValid(shortcode) || shortcode.length > 10) {
        return res.status(400).json({ message: "Invalid custom shortcode format." });
      }
      const existingUrl = await ShortUrl.findOne({ shortcode });
      if (existingUrl) {
        return res.status(409).json({ message: `Shortcode '${shortcode}' already in use.` });
      }
      finalShortcode = shortcode;
    } else {
      finalShortcode = await generateUniqueShortcode();
    }

    const expiryDate = expiry ? new Date(expiry) : new Date(Date.now() + 30 * 60 * 1000);

    const newUrl = new ShortUrl({
      originalUrl,
      shortcode: finalShortcode,
      expiry: expiryDate,
      totalClicks: 0,
      clicks: []
    });

    await newUrl.save();
    
    const fullShortLink = `http://${req.headers.host}/${finalShortcode}`;

    res.status(201).json({
      originalUrl: newUrl.originalUrl,
      shortcode: newUrl.shortcode,
      shortLink: fullShortLink,
      expiry: newUrl.expiry
    });

  } catch (error) {
    logger.error("Error creating short URL:", error.message);
    res.status(500).json({ message: "Server error creating short URL." });
  }
});

app.get("/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;
  const shortUrl = await ShortUrl.findOne({ shortcode: shortCode });

  if (!shortUrl) {
    return res.status(404).json({ message: "URL not found." });
  }

  const now = new Date();
  if (shortUrl.expiry && now > shortUrl.expiry) {
    return res.status(410).json({ message: "Link expired." });
  }

  shortUrl.totalClicks++;
  shortUrl.clicks.push({
    timestamp: now,
    source: req.headers.referrer || "direct",
    location: "N/A"
  });
  await shortUrl.save();

  res.redirect(shortUrl.originalUrl);
});

app.get("/shorturls/:shortCode/stats", async (req, res) => {
  const shortCode = req.params.shortCode;
  const shortUrl = await ShortUrl.findOne({ shortcode: shortCode });

  if (!shortUrl) {
    return res.status(404).json({ message: "URL not found." });
  }

  res.json({
    originalUrl: shortUrl.originalUrl,
    shortcode: shortUrl.shortcode,
    creationDate: shortUrl.createdAt,
    expiry: shortUrl.expiry,
    totalClicks: shortUrl.totalClicks,
    detailedClicks: shortUrl.clicks
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

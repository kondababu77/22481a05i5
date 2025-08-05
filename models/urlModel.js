const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiry: {
    type: Date,
    default: null,
  },
  totalClicks: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: [Date],
    default: [],
  },
});

module.exports = mongoose.model("ShortUrl", urlSchema);

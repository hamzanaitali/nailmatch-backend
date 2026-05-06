const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const API_KEY = process.env.REPLICATE_API_KEY;
const VERSION = "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc";

app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const startRes = await fetch("https://api.replicate.com/v1/models/bytedance/seedream-5-lite/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${API_KEY}`,
        "Content-Type": "application/json",
      },
     body: JSON.stringify({
  input: {
    prompt: prompt,
    aspect_ratio: "1:1",
    output_format: "jpg",
    output_quality: 95,
  },
}),
    });

    const startData = await startRes.json();
    console.log("START DATA:", startData);

    if (!startData.urls?.get) {
      return res.status(500).json({
        error: "No polling URL",
        details: startData,
      });
    }

    let result = startData;

    while (
      result.status !== "succeeded" &&
      result.status !== "failed" &&
      result.status !== "canceled"
    ) {
      await new Promise((r) => setTimeout(r, 2000));

      const checkRes = await fetch(result.urls.get, {
        headers: {
          Authorization: `Token ${API_KEY}`,
        },
      });

      result = await checkRes.json();
      console.log("STATUS:", result.status);
    }

    if (result.status !== "succeeded") {
      console.log("GENERATION ERROR:", result.error);

      return res.status(500).json({
        error: "Generation failed",
        details: result.error,
      });
    }

    const imageUrl = Array.isArray(result.output)
      ? result.output[0]
      : result.output;

    console.log("TEMP IMAGE:", imageUrl);

    const uploadRes = await cloudinary.uploader.upload(imageUrl);

    console.log("CLOUDINARY:", uploadRes.secure_url);

    return res.json({
      image: uploadRes.secure_url,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
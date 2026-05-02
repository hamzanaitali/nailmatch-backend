const express = require("express");
const cors = require("cors");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.REPLICATE_API_KEY;
const VERSION = "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc";

app.get("/", (req, res) => {
  res.send("Backend is working");
});



app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: VERSION,
        input: {
          prompt: prompt,
          width: 1024,
          height: 1024,
          num_outputs: 1
        }
      })
    });

    const startData = await startRes.json();

    console.log("REPLICATE START:", startData);

    if (!startRes.ok) {
      return res.status(500).json({ error: startData.detail || JSON.stringify(startData) });
    }

    if (!startData.urls || !startData.urls.get) {
      return res.status(500).json({ error: "Replicate did not return polling URL", data: startData });
    }

    let result = startData;

    while (result.status !== "succeeded" && result.status !== "failed" && result.status !== "canceled") {
      await new Promise(r => setTimeout(r, 2000));

      const checkRes = await fetch(result.urls.get, {
        headers: {
          "Authorization": `Token ${API_KEY}`
        }
      });

      result = await checkRes.json();
      console.log("REPLICATE STATUS:", result.status);
    }

    if (result.status === "succeeded") {
  console.log("FINAL OUTPUT:", result.output);

  let imageUrl = null;

  if (Array.isArray(result.output)) {
    imageUrl = result.output[0];
  } else if (typeof result.output === "string") {
    imageUrl = result.output;
  } else if (result.output && result.output.url) {
    imageUrl = result.output.url;
  }

  console.log("IMAGE URL:", imageUrl);

  if (!imageUrl) {
    return res.status(500).json({
      error: "No image URL found in Replicate output",
      output: result.output
    });
  }

  return res.json({ image: imageUrl });
}

    return res.status(500).json({ error: "Generation failed", data: result });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

pp.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});
const express = require("express");
const OpenAI = require("openai");
const axios = require("axios");
const cors = require("cors");
const session = require("express-session");

require("dotenv").config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPEN_API });
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure:
        process.env.NODE_ENV ===
        "production" /*In production, process.env.NODE_ENV should be set to "production"*/,
      maxAge: 3600000 /*1-hour session*/,
    },
  }),
);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

//redirect user to spotify auth
app.get("/auth/spotify", (req, res) => {
  const url = `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${process.env.SPOTIFY_REDIRECT_ID}&scope=user-top-read`;
  res.redirect(url);
});

//callback from auth, gain access and refresh tokens and save user to session.
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_ID,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
        },
      },
    );

    const data = response.data;

    req.session.accessToken = data.access_token;
    req.session.refreshToken = data.refresh_token;

    // fetch user profile

    console.log("obtaining user profile");

    const userResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${req.session.accessToken}`,
      },
    });

    req.session.user = {
      id: userResponse.data.id,
      display_name: userResponse.data.display_name,
    };

    // use res.redirect() to redirect user to dashboard!!!!
    res.redirect("http://localhost:5173/dashboard");

    console.log("Session saved:", req.session.user);

    //use access_token to save to session details...
  } catch (e) {
    console.error("Failed to callback", e);
  }
});

//used to verify whether or not the user is logged in, usually upon page load and any important functions
app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.session.user);
});

app.get("/me/top-genres", async (req, res) => {
  if (!req.session.accessToken)
    return res.status(401).json({ message: "Not authorized" });

  //if session already contains top-genres, serve top-genres from session
  if (req.session.genres) {
    console.log("serving session results");
    return res.json({ genres: req.session.genres });
  }

  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/top/artists",
      {
        headers: { Authorization: `Bearer ${req.session.accessToken}` },
      },
    );

    const genres = [
      ...new Set(response.data.items.flatMap((artist) => artist.genres)),
    ];
    req.session.genres = genres;
    res.json({ genres });
  } catch (e) {
    console.error("could not get artists", e);
  }
});

//uses top genres to serve book recommendations using the Hardcover API plus GPT
//plans to convert this into NLP later on...
app.get("/me/book-recommendations", async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!req.session.genres) {
    console.log("could not find any fetched genres");
    return res
      .status(400)
      .json({ message: "Missing genres in session. Please try again." });
  }
  console.log("finding book recommendations based on: ");
  //get OpenAI API response here...
  const completion = await openai.chat.completion.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "developer",
        content:
          "You are a helpful AI assistant and an expert in music and literature. Given a list of music genres from a user's Spotify listening history, map them to their closest equivalent in common book genres. Format your response as JSON data.",
      },
      {
        role: "user",
        content: `${JSON.stringify(req.session.genres)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        book_genres: ["genre1", "genre2", "genre3"],
      },
    },
  });

  //get HardCover API responses here
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

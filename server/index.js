const express = require("express");
const axios = require("axios");
const cors = require("cors");
const session = require("express-session");

require("dotenv").config();

const app = express();
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
    res.json({ genres });
  } catch (e) {
    console.error("could not get artists", e);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

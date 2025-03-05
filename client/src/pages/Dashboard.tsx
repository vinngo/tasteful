import { Box, Skeleton, Card, Typography } from "@mui/joy";
import { useEffect, useState } from "react";
import axios from "axios";

const Dashboard = () => {
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopGenres = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/me/top-genres",
          {
            withCredentials: true,
          },
        );

        setGenres(response.data);
        fetchBookRecommendations();
      } catch (e) {
        console.log("could not fetch genres", e);
      }
    };

    const fetchBookRecommendations = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/me/book-recommendations",
          {
            withCredentials: true,
          },
        );
      } catch (e) {
        console.error("could not fetch book recommendations", e);
      }
    };

    fetchTopGenres();
    setLoading(false);
  }, []);

  return (
    <Box>
      <Card sx={{ padding: "20px", maxWidth: 400, margin: "auto" }}>
        <Typography level="h2">Your Top Genres</Typography>
      </Card>
    </Box>
  );
};

export default Dashboard;

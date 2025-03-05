import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import { BrowserRouter, Navigate, Routes, Route } from "react-router";
import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("checking authentication status...");
    const fetchUserData = async () => {
      try {
        const response = await axios.get("http://localhost:3000/me", {
          withCredentials: true,
        });
        setUser(response.data);
        console.log("user logged in");
      } catch (e) {
        if (e.response?.status == 401) {
          console.log("user not authenticated");
          setUser(null);
        } else {
          console.error("could not fetch user", e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />}></Route>
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/" replace />}
        ></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

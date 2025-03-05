import "./Landing.css";

//Client sends request to endpoint /auth/spotify
//Backend redirects to Spotify OAuth
//After login, Spotify redirects the user to callback (Dashboard)
//Backend gets user's access token and fetches top genres and displays results on the Dashboard

const Landing = () => {
  const loginWithSpotify = () => {
    window.location.href = "http://localhost:3000/auth/spotify";
  };

  return (
    <>
      <div className="title">Tasteful</div>
      <button onClick={loginWithSpotify}>Log in with Spotify</button>
    </>
  );
};

export default Landing;

import { Application, Router } from "https://deno.land/x/oak@v17.1.3/mod.ts";
import { getAccessToken } from "./auth.ts";

// rest of your code remains the same

const app = new Application();
const router = new Router();

let connections = new Set<WebSocket>();
let isPolling = false;
let pollInterval: number | undefined;

// Function to fetch Spotify data and broadcast to all clients
async function fetchAndBroadcast() {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    console.log(`Response status: ${response.status}`);

    if (response.status === 204) {
      console.warn("No track is currently playing.");
      const nowPlaying = { track: "", artist: "" };

      connections.forEach((socket) => {
        if (!socket.isClosed) {
          socket.send(JSON.stringify(nowPlaying));
        }
      });
      return;
    }

    if (response.ok) {
      const data = await response.json();
      const albumArtUrl = data.item?.album?.images?.[0]?.url || "";
      const nowPlaying = {
        track: data.item?.name || "",
        artist:
          data.item?.artists.map((artist) => artist.name).join(", ") || "",
        albumArt: albumArtUrl,
      };

      connections.forEach((socket) => {
        if (!socket.isClosed) {
          socket.send(JSON.stringify(nowPlaying));
        }
      });
    }
  } catch (error) {
    console.error("Error broadcasting now playing data:", error);
  }
}

// Start polling function
function startPolling() {
  if (!isPolling) {
    console.log("Starting data polling...");
    isPolling = true;
    pollInterval = setInterval(fetchAndBroadcast, 5000); // Fetch every 5 seconds
  }
}

// Stop polling function
function stopPolling() {
  if (isPolling) {
    console.log("Stopping data polling...");
    isPolling = false;
    clearInterval(pollInterval);
    pollInterval = undefined;
  }
}

// WebSocket route
router.get("/v1/spotify-websocket/ws", (ctx) => {
  if (ctx.isUpgradable) {
    const socket = ctx.upgrade();
    connections.add(socket);
    console.log(`Client connected. Total connections: ${connections.size}`);

    // Start polling when the first client connects
    if (connections.size === 1) {
      startPolling();
    }

    socket.onclose = () => {
      connections.delete(socket);
      console.log(
        `Client disconnected. Total connections: ${connections.size}`,
      );

      // Stop polling when no clients are connected
      if (connections.size === 0) {
        stopPolling();
      }
    };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server is running on http://localhost:8000");
await app.listen({ port: 8000 });

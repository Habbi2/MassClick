# 3D Multiplayer Clicker Game

A web-based multiplayer clicker game with a 3D interface built using React, Three.js, Socket.IO, and Zustand. The game can be deployed to Vercel.

## Features

- Interactive 3D clickable objects using Three.js and React Three Fiber
- Real-time multiplayer functionality with Socket.IO
- Player rankings and statistics
- Responsive design with animated UI elements
- Deployable to Vercel

## Tech Stack

- **Frontend**: React, Vite, Three.js, @react-three/fiber, @react-three/drei
- **State Management**: Zustand
- **Multiplayer**: Socket.IO
- **Styling**: CSS with animations
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd game-three-react
```

2. Install dependencies:

```bash
# In the root directory
npm install

# In the server directory
cd server
npm install
cd ..
```

### Development

1. Start the Socket.IO server:

```bash
cd server
node server.js
```

2. In another terminal, start the Vite development server:

```bash
npm run dev
```

3. Open your browser at [http://localhost:5173](http://localhost:5173)

## Deployment to Vercel

### Setting up the server on Vercel

For the Socket.IO server, you can deploy it as a serverless function on Vercel:

1. Create a `vercel.json` file in the root directory:

```json
{
  "version": 2,
  "builds": [
    { "src": "dist/**", "use": "@vercel/static" },
    { "src": "server/server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/socket.io/(.*)", "dest": "server/server.js" },
    { "src": "/(.*)", "dest": "/dist/$1" }
  ]
}
```

2. Add a build script in package.json:

```json
"scripts": {
  "build": "vite build",
  "deploy": "vercel --prod"
}
```

3. Deploy to Vercel:

```bash
npm run build
npm run deploy
```

## How to Play

1. Open the game URL in your browser
2. Click the "START GAME" button on the landing page
3. Click on the spinning 3D object as many times as you can
4. Watch your score increase in real-time
5. See other players' scores in the rankings panel
6. Use your mouse to rotate the view and scroll to zoom in/out

## Game Mechanics

- Each click increases your personal score and the global score
- Player rankings update in real-time
- The game automatically syncs with other players
- The connection status indicator shows if you're connected to the server

## License

MIT License

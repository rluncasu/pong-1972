"use client";

import { useEffect, useRef, useState } from "react";

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 15;
const PADDLE_SPEED = 10;
const INITIAL_BALL_SPEED = 3.125;
const WINNING_SCORE = 7;

// Types
interface Position {
  x: number;
  y: number;
}

interface Ball extends Position {
  velocityX: number;
  velocityY: number;
}

interface Paddle extends Position {
  score: number;
}

type GameState = "start" | "playing" | "gameOver";

export function PongGame() {
  // Game state
  const [gameState, setGameState] = useState<GameState>("start");
  const [winner, setWinner] = useState<string | null>(null);

  const [leftPaddle, setLeftPaddle] = useState<Paddle>({
    x: 50,
    y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    score: 0,
  });

  const [rightPaddle, setRightPaddle] = useState<Paddle>({
    x: GAME_WIDTH - 50 - PADDLE_WIDTH,
    y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    score: 0,
  });

  const [ball, setBall] = useState<Ball>({
    x: GAME_WIDTH / 2 - BALL_SIZE / 2,
    y: GAME_HEIGHT / 2 - BALL_SIZE / 2,
    velocityX: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    velocityY: INITIAL_BALL_SPEED * (Math.random() * 2 - 1),
  });

  // Track pressed keys
  const keysPressed = useRef<Record<string, boolean>>({});
  
  // Game loop reference
  const requestRef = useRef<number | null>(null);
  
  // Scoring cooldown to prevent multiple score increments
  const scoringCooldown = useRef<boolean>(false);

  // Audio references
  const paddleHitSound = useRef<HTMLAudioElement | null>(null);
  const wallHitSound = useRef<HTMLAudioElement | null>(null);
  const scoreSound = useRef<HTMLAudioElement | null>(null);

  // Safety check to prevent ball from getting stuck
  const preventStuckBall = useRef<{
    lastX: number;
    lastY: number;
    stuckFrames: number;
  }>({
    lastX: GAME_WIDTH / 2,
    lastY: GAME_HEIGHT / 2,
    stuckFrames: 0,
  });

  // Initialize audio elements
  useEffect(() => {
    try {
      paddleHitSound.current = new Audio("/sounds/paddle-hit.mp3");
      wallHitSound.current = new Audio("/sounds/wall-hit.mp3");
      scoreSound.current = new Audio("/sounds/score.mp3");

      // Preload sounds
      paddleHitSound.current.load();
      wallHitSound.current.load();
      scoreSound.current.load();
    } catch (error) {
      console.error("Error loading sound files:", error);
    }

    return () => {
      paddleHitSound.current = null;
      wallHitSound.current = null;
      scoreSound.current = null;
    };
  }, []);

  // Play sound safely
  const playSound = (sound: HTMLAudioElement | null) => {
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => console.error("Error playing sound:", err));
    }
  };

  // Reset ball to center
  const resetBall = () => {
    setBall({
      x: GAME_WIDTH / 2 - BALL_SIZE / 2,
      y: GAME_HEIGHT / 2 - BALL_SIZE / 2,
      velocityX: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      velocityY: INITIAL_BALL_SPEED * (Math.random() * 2 - 1),
    });
  };

  // Reset entire game
  const resetGame = () => {
    setLeftPaddle({
      x: 50,
      y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      score: 0,
    });
    
    setRightPaddle({
      x: GAME_WIDTH - 50 - PADDLE_WIDTH,
      y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      score: 0,
    });
    
    resetBall();
    setWinner(null);
    setGameState("start");
  };

  // Update game state
  const updateGameState = () => {
    if (gameState !== "playing") return;

    // Track paddle positions for collision detection
    let currentLeftPaddleY = leftPaddle.y;
    let currentRightPaddleY = rightPaddle.y;

    // Move paddles based on key presses
    setLeftPaddle((prev) => {
      let newY = prev.y;
      if (keysPressed.current["w"] || keysPressed.current["W"]) {
        newY = Math.max(0, prev.y - PADDLE_SPEED);
      }
      if (keysPressed.current["s"] || keysPressed.current["S"]) {
        newY = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, prev.y + PADDLE_SPEED);
      }
      currentLeftPaddleY = newY; // Update for collision detection
      return { ...prev, y: newY };
    });

    setRightPaddle((prev) => {
      let newY = prev.y;
      if (keysPressed.current["o"] || keysPressed.current["O"]) {
        newY = Math.max(0, prev.y - PADDLE_SPEED);
      }
      if (keysPressed.current["l"] || keysPressed.current["L"]) {
        newY = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, prev.y + PADDLE_SPEED);
      }
      currentRightPaddleY = newY; // Update for collision detection
      return { ...prev, y: newY };
    });

    // Move ball
    setBall((prev) => {
      let newX = prev.x + prev.velocityX;
      let newY = prev.y + prev.velocityY;
      let newVelocityX = prev.velocityX;
      let newVelocityY = prev.velocityY;
      
      // Look ahead to next frame for more reliable collision detection
      const nextFrameX = newX + newVelocityX;
      const nextFrameY = newY + newVelocityY;

      // Check if ball is stuck (hasn't moved significantly in multiple frames)
      if (Math.abs(prev.x - preventStuckBall.current.lastX) < 1 && 
          Math.abs(prev.y - preventStuckBall.current.lastY) < 1) {
        preventStuckBall.current.stuckFrames++;
        
        // If stuck for 10 frames, nudge the ball
        if (preventStuckBall.current.stuckFrames > 10) {
          newVelocityX *= 1.5; // Increase velocity to escape
          newVelocityY = INITIAL_BALL_SPEED * (Math.random() * 2 - 1); // Randomize Y direction
          preventStuckBall.current.stuckFrames = 0;
        }
      } else {
        // Ball is moving normally, reset stuck counter
        preventStuckBall.current.stuckFrames = 0;
      }
      
      // Update last position
      preventStuckBall.current.lastX = prev.x;
      preventStuckBall.current.lastY = prev.y;

      // Collision with top and bottom walls
      if (newY <= 0 || newY + BALL_SIZE >= GAME_HEIGHT) {
        newVelocityY = -newVelocityY;
        newY = newY <= 0 ? 0 : GAME_HEIGHT - BALL_SIZE;
        playSound(wallHitSound.current);
      }

      // Add a collision buffer for more reliable detection
      const COLLISION_BUFFER = 5;

      // Enhanced left paddle collision detection with prediction
      const willHitLeftPaddle = 
        newVelocityX < 0 && // Ball is moving left
        (newX - COLLISION_BUFFER <= leftPaddle.x + PADDLE_WIDTH || nextFrameX - COLLISION_BUFFER <= leftPaddle.x + PADDLE_WIDTH) && // Current or next frame collision on X
        newX + BALL_SIZE >= leftPaddle.x &&
        ((newY + BALL_SIZE >= currentLeftPaddleY && newY <= currentLeftPaddleY + PADDLE_HEIGHT) || // Current frame collision on Y
         (nextFrameY + BALL_SIZE >= currentLeftPaddleY && nextFrameY <= currentLeftPaddleY + PADDLE_HEIGHT)); // Next frame collision on Y
      
      if (willHitLeftPaddle) {
        newVelocityX = Math.abs(newVelocityX) * 1.05; // Speed up slightly on bounce
        const paddleCenter = currentLeftPaddleY + PADDLE_HEIGHT / 2;
        const ballCenter = newY + BALL_SIZE / 2;
        const relativePaddleIntersect = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
        newVelocityY = INITIAL_BALL_SPEED * relativePaddleIntersect * 1.5;
        newX = leftPaddle.x + PADDLE_WIDTH; // Ensure ball is positioned at paddle edge
        
        playSound(paddleHitSound.current);
      }

      // Enhanced right paddle collision detection with prediction
      const willHitRightPaddle = 
        newVelocityX > 0 && // Ball is moving right
        (newX + BALL_SIZE + COLLISION_BUFFER >= rightPaddle.x || nextFrameX + BALL_SIZE + COLLISION_BUFFER >= rightPaddle.x) && // Current or next frame collision on X
        newX <= rightPaddle.x + PADDLE_WIDTH &&
        ((newY + BALL_SIZE >= currentRightPaddleY && newY <= currentRightPaddleY + PADDLE_HEIGHT) || // Current frame collision on Y
         (nextFrameY + BALL_SIZE >= currentRightPaddleY && nextFrameY <= currentRightPaddleY + PADDLE_HEIGHT)); // Next frame collision on Y
      
      if (willHitRightPaddle) {
        newVelocityX = -Math.abs(newVelocityX) * 1.05; // Speed up slightly on bounce
        const paddleCenter = currentRightPaddleY + PADDLE_HEIGHT / 2;
        const ballCenter = newY + BALL_SIZE / 2;
        const relativePaddleIntersect = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
        newVelocityY = INITIAL_BALL_SPEED * relativePaddleIntersect * 1.5;
        newX = rightPaddle.x - BALL_SIZE; // Ensure ball is positioned at paddle edge
        
        playSound(paddleHitSound.current);
      }

      // Scoring: Ball goes beyond left or right boundary
      if (newX <= 0 && !scoringCooldown.current) {
        // Right player scores
        playSound(scoreSound.current);
        
        // Set cooldown to prevent multiple score increments
        scoringCooldown.current = true;
        
        // Update score with explicit function to ensure state update is applied
        setRightPaddle(prevPaddle => {
          // Check for game over
          if (prevPaddle.score + 1 >= WINNING_SCORE) {
            setWinner("Right Player");
            setGameState("gameOver");
          } else {
            // Reset ball position but wait until next frame for score update to be applied
            setTimeout(() => {
              resetBall();
              // Reset cooldown after ball is reset
              setTimeout(() => {
                scoringCooldown.current = false;
              }, 100);
            }, 0);
          }
          
          return {
            ...prevPaddle,
            score: prevPaddle.score + 1
          };
        });
        
        // Return the current position to prevent incorrect state update
        return {
          ...prev,
          x: GAME_WIDTH / 2 - BALL_SIZE / 2,
          y: GAME_HEIGHT / 2 - BALL_SIZE / 2,
          velocityX: 0,
          velocityY: 0
        };
      }

      if (newX + BALL_SIZE >= GAME_WIDTH && !scoringCooldown.current) {
        // Left player scores
        playSound(scoreSound.current);
        
        // Set cooldown to prevent multiple score increments
        scoringCooldown.current = true;
        
        // Update score with explicit function to ensure state update is applied
        setLeftPaddle(prevPaddle => {
          // Check for game over
          if (prevPaddle.score + 1 >= WINNING_SCORE) {
            setWinner("Left Player");
            setGameState("gameOver");
          } else {
            // Reset ball position but wait until next frame for score update to be applied
            setTimeout(() => {
              resetBall();
              // Reset cooldown after ball is reset
              setTimeout(() => {
                scoringCooldown.current = false;
              }, 100);
            }, 0);
          }
          
          return {
            ...prevPaddle,
            score: prevPaddle.score + 1
          };
        });
        
        // Return the current position to prevent incorrect state update
        return {
          ...prev,
          x: GAME_WIDTH / 2 - BALL_SIZE / 2,
          y: GAME_HEIGHT / 2 - BALL_SIZE / 2,
          velocityX: 0,
          velocityY: 0
        };
      }

      return {
        x: newX,
        y: newY,
        velocityX: newVelocityX,
        velocityY: newVelocityY,
      };
    });
  };

  // Animation loop
  const gameLoop = () => {
    updateGameState();
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Start the game
  const startGame = () => {
    setGameState("playing");
    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  // Set up event listeners and game loop
  useEffect(() => {
    // Keyboard event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      
      // Space bar to start game
      if (e.key === " " && gameState === "start") {
        startGame();
      }
      
      // Enter to restart after game over
      if (e.key === "Enter" && gameState === "gameOver") {
        resetGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Start the game loop if in playing state
    if (gameState === "playing" && !requestRef.current) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }

    // Cleanup
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  // Draw net (dashed center line)
  const renderNet = () => {
    const dashCount = 20;
    const dashHeight = GAME_HEIGHT / dashCount;
    
    return Array.from({ length: dashCount }).map((_, index) => (
      <div 
        key={`dash-${index}`}
        className="absolute bg-white w-2"
        style={{
          height: dashHeight / 2,
          left: GAME_WIDTH / 2 - 2,
          top: index * dashHeight,
        }}
      />
    ));
  };

  // Render game screens based on game state
  const renderGameContent = () => {
    switch (gameState) {
      case "start":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
            <h2 className="mb-6 text-4xl font-bold">PONG</h2>
            <p className="mb-2">Left Paddle: W (up) and S (down)</p>
            <p className="mb-6">Right Paddle: O (up) and L (down)</p>
            <p className="mb-2">First to {WINNING_SCORE} points wins!</p>
            <button 
              onClick={startGame}
              className="mt-6 px-6 py-2 bg-white text-black font-bold hover:bg-gray-200 transition-colors"
            >
              PRESS SPACE TO START
            </button>
          </div>
        );
      
      case "gameOver":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
            <h2 className="mb-6 text-4xl font-bold">GAME OVER</h2>
            <p className="mb-6 text-2xl">{winner} Wins!</p>
            <p className="mb-2 text-xl">Final Score</p>
            <p className="mb-6 text-3xl">
              {leftPaddle.score} : {rightPaddle.score}
            </p>
            <button 
              onClick={resetGame}
              className="mt-6 px-6 py-2 bg-white text-black font-bold hover:bg-gray-200 transition-colors"
            >
              PRESS ENTER TO RESTART
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render the game with CRT effect
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-4 text-3xl font-bold text-white">
        <span>{leftPaddle.score}</span>
        <span className="mx-8">:</span>
        <span>{rightPaddle.score}</span>
      </div>
      
      <div 
        className="relative bg-black border-t-2 border-b-2 border-white overflow-hidden retro-crt"
        style={{ 
          width: GAME_WIDTH, 
          height: GAME_HEIGHT,
          boxShadow: "0 0 10px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5)"
        }}
      >
        {/* Net */}
        {renderNet()}
        
        {/* Left paddle */}
        <div
          className="absolute bg-white"
          style={{
            left: leftPaddle.x,
            top: leftPaddle.y,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
          }}
        />
        
        {/* Right paddle */}
        <div
          className="absolute bg-white"
          style={{
            left: rightPaddle.x,
            top: rightPaddle.y,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
          }}
        />
        
        {/* Ball */}
        <div
          className="absolute bg-white"
          style={{
            left: ball.x,
            top: ball.y,
            width: BALL_SIZE,
            height: BALL_SIZE,
          }}
        />

        {/* Game screens overlay */}
        {renderGameContent()}

        {/* CRT scan line effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)",
            backgroundSize: "100% 4px",
            zIndex: 10
          }}
        />
      </div>
      
      <div className="mt-6 text-sm text-gray-300">
        <p>Left Paddle: W (up) and S (down)</p>
        <p>Right Paddle: O (up) and L (down)</p>
      </div>
    </div>
  );
} 
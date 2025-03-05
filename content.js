let lastBoard = null;
let unchangedCount = 0;
const MAX_UNCHANGED = 3;
let scriptRunning = false;
let intervalId = null;

const toggleButton = document.createElement("button");
toggleButton.id = "toggle-ai";
toggleButton.innerText = "Start AI";
toggleButton.style.position = "fixed";
toggleButton.style.top = "10px";
toggleButton.style.right = "10px";
toggleButton.style.zIndex = "10000";
toggleButton.style.padding = "10px 15px";
toggleButton.style.backgroundColor = "#ff4081";
toggleButton.style.color = "#fff";
toggleButton.style.border = "none";
toggleButton.style.borderRadius = "4px";
toggleButton.style.cursor = "pointer";
document.body.appendChild(toggleButton);

// Board parsing function
function parseBoard() {
  const board = Array(4)
    .fill()
    .map(() => Array(4).fill(0));

  // Get all tile elements; adjust the selector as needed.
  const tiles = document.querySelectorAll(
    '[class*="absolute flex items-center justify-center rounded font-bold"]'
  );

  tiles.forEach(tile => {
    const style = tile.style.cssText;
    const value = parseInt(tile.textContent) || 0;
    // updated regex to allow optional whitespace
    const leftMatch = /left:\s*calc\((\d+)%/.exec(style);
    const topMatch = /top:\s*calc\((\d+)%/.exec(style);
    if (leftMatch && topMatch) {
      const left = parseInt(leftMatch[1], 10);
      const top = parseInt(topMatch[1], 10);
      const x = Math.round(left / 25);
      const y = Math.round(top / 25);
      if (x >= 0 && x < 4 && y >= 0 && y < 4) {
        board[y][x] = value;
      }
    }
  });
  return board;
}

// Simulate a key press event
function simulateKeyPress(keyCode) {
  const event = new KeyboardEvent("keydown", {
    key: keyCode,
    keyCode: keyCode.charCodeAt(0),
    which: keyCode.charCodeAt(0),
    bubbles: true
  });
  document.dispatchEvent(event);
}

function runAI() {
  const board = parseBoard();

  // if board is unchanged compared to last iteration
  if (lastBoard && JSON.stringify(board) === JSON.stringify(lastBoard)) {
    unchangedCount++;
  } else {
    unchangedCount = 0;
  }
  lastBoard = board;

  // then stop
  if (unchangedCount >= MAX_UNCHANGED) {
    console.log("Board not responding. Stopping the script.");
    clearInterval(intervalId);
    scriptRunning = false;
    toggleButton.innerText = "Start";
    return;
  }

  const move = expectimaxBestMove(board);
  console.log("Best move:", move);
  const keyMap = {0: "ArrowUp", 1: "ArrowRight", 2: "ArrowDown", 3: "ArrowLeft"};
  if (move !== null) {
    simulateKeyPress(keyMap[move]);
  }
}

// start/stop
function toggleScript() {
  if (scriptRunning) {
    clearInterval(intervalId);
    scriptRunning = false;
    toggleButton.innerText = "Start";
    console.log("stopped.");
  } else {
    intervalId = setInterval(runAI, 250);
    scriptRunning = true;
    toggleButton.innerText = "Stop";
    console.log("started.");
  }
}

toggleButton.addEventListener("click", toggleScript);

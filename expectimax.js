const Expectimax = (function () {
    const DIRS = [0, 1, 2, 3]; // up, right, down, left
    const MAX_DEPTH = 4;

    // get list of empty cell coordinates [x, y]
    function getEmptyCells(grid) {
        const cells = [];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (grid[y][x] === 0) cells.push([x, y]);
            }
        }
        return cells;
    }

    // 2 arrayes
    function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    // 4x4
    function transpose(grid) {
        return grid[0].map((_, i) => grid.map(row => row[i]));
    }

    function operate(row) {
        let arr = row.filter(val => val !== 0);
        let mergeScore = 0;
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                mergeScore += arr[i];
                arr[i + 1] = 0;
                i++; 
            }
        }
        arr = arr.filter(val => val !== 0);
        while (arr.length < 4) {
            arr.push(0);
        }
        return [arr, mergeScore];
    }

    // move left
    function moveLeftHelper(grid) {
        const newGrid = [];
        let moved = false;
        for (let i = 0; i < 4; i++) {
            const [newRow, mergeScore] = operate(grid[i]);
            newGrid.push(newRow);
            if (!arraysEqual(newRow, grid[i])) moved = true;
        }
        return [newGrid, moved];
    }

    // move right
    function moveRightHelper(grid) {
        const newGrid = [];
        let moved = false;
        for (let i = 0; i < 4; i++) {
            let reversed = grid[i].slice().reverse();
            let [newRow, mergeScore] = operate(reversed);
            newRow = newRow.reverse();
            newGrid.push(newRow);
            if (!arraysEqual(newRow, grid[i])) moved = true;
        }
        return [newGrid, moved];
    }

    // simulate the grid
    function moveGrid(grid, dir) {
        let newGrid, moved;
        if (dir === 0) { // up: transpose, move left, transpose back
            const transposed = transpose(grid);
            const [movedGrid, m] = moveLeftHelper(transposed);
            newGrid = transpose(movedGrid);
            moved = m;
        } else if (dir === 1) { // right: move right directly
            [newGrid, moved] = moveRightHelper(grid);
        } else if (dir === 2) { // down: transpose, move right, transpose back
            const transposed = transpose(grid);
            const [movedGrid, m] = moveRightHelper(transposed);
            newGrid = transpose(movedGrid);
            moved = m;
        } else if (dir === 3) { // left: move left directly
            [newGrid, moved] = moveLeftHelper(grid);
        }
        return [newGrid, moved];
    }

    // heuristic eval scoring
    function evaluate(grid) {
        let smoothness = 0;
        let emptyCells = 0;
        let maxTile = 0;
        let gradientScore = 0;
        let monotonicity = [0, 0, 0, 0];
        let mergeOpportunities = 0;
        let snakeDanger = 0;

        // basically every single solution ive seen uses this
        const snakeGradient = [
            [15, 14, 13, 12],
            [8, 9, 10, 11],
            [7, 6, 5, 4],
            [0, 1, 2, 3]
        ];

        // count tiles and evaluate basic metrics
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const value = grid[y][x];
                if (value === 0) {
                    emptyCells++;
                } else {
                    const logValue = Math.log2(value);
                    maxTile = Math.max(maxTile, value);
                    gradientScore += logValue * snakeGradient[y][x];

                    // Smoothness
                    if (x < 3 && grid[y][x + 1] !== 0) {
                        smoothness -= Math.abs(logValue - Math.log2(grid[y][x + 1]));
                    }
                    if (y < 3 && grid[y + 1][x] !== 0) {
                        smoothness -= Math.abs(logValue - Math.log2(grid[y + 1][x]));
                    }
                    //end

                    // Monotonicity
                    if (x < 3) {
                        if (grid[y][x] > grid[y][x + 1]) {
                            monotonicity[0] += grid[y][x] - grid[y][x + 1];
                        } else {
                            monotonicity[1] += grid[y][x + 1] - grid[y][x];
                        }
                    }
                    if (y < 3) {
                        if (grid[y][x] > grid[y + 1][x]) {
                            monotonicity[2] += grid[y][x] - grid[y + 1][x];
                        } else {
                            monotonicity[3] += grid[y + 1][x] - grid[y][x];
                        }
                    }
                    // end 

                    // merge opportunities
                    if (x < 3 && grid[y][x] === grid[y][x + 1] && grid[y][x] !== 0) {
                        mergeOpportunities += logValue;
                    }
                    if (y < 3 && grid[y][x] === grid[y + 1][x] && grid[y][x] !== 0) {
                        mergeOpportunities += logValue;
                    }
                    // end

                    // check for trapped small values
                    if (x > 0 && x < 3 && y > 0 && y < 3) {
                        const neighbors = [
                            grid[y - 1][x], grid[y + 1][x],
                            grid[y][x - 1], grid[y][x + 1]
                        ];

                        if (neighbors.every(n => n !== 0 && n > value * 4)) {
                            snakeDanger -= logValue * 2;
                        }
                    }
                    // end
                }
            }
        }

        // minimum directional monotonicity
        const monotonicityScore = -Math.min(monotonicity[0], monotonicity[1]) -
            Math.min(monotonicity[2], monotonicity[3]);

        // empty cell score with diminishing returns
        const emptyScore = emptyCells > 0 ? Math.log2(emptyCells) * 2.5 : -5;

        // snake pattern completion bonus
        const snakeBonus = (grid[0][0] >= maxTile / 2) ? Math.log2(maxTile) : 0;

        return (gradientScore * 1.2) +
            (smoothness * 0.6) +
            (monotonicityScore * 1.1) +
            (emptyScore * 3.0) +
            (snakeBonus * 1.5) +
            (mergeOpportunities * 0.8) +
            (snakeDanger);
    }


    const stateCache = {};

    function expectimax(grid, depth, isPlayer) {
        if (depth === 0) return evaluate(grid);

        // Create a simple cache key
        const cacheKey = JSON.stringify(grid) + '_' + depth + '_' + isPlayer;
        if (stateCache[cacheKey] !== undefined) return stateCache[cacheKey];

        if (isPlayer) {
            let maxScore = -Infinity;
            for (const dir of DIRS) {
                const [newGrid, moved] = moveGrid(grid, dir);
                if (moved) {
                    const score = expectimax(newGrid, depth - 1, false);
                    maxScore = Math.max(maxScore, score);
                }
            }
            stateCache[cacheKey] = maxScore;
            return maxScore;
        } else {
            let score = 0;
            const emptyCells = getEmptyCells(grid);
            if (emptyCells.length === 0) return evaluate(grid);

            const cellsToEvaluate = emptyCells.length > 6 && depth > 2 ?
                emptyCells.slice(0, 4) // Sample few cells when most are empt
                :
                emptyCells;

            for (const [x, y] of cellsToEvaluate) {
                // 2 tile (90% probability)
                const grid2 = JSON.parse(JSON.stringify(grid));
                grid2[y][x] = 2;
                score += 0.9 * expectimax(grid2, depth - 1, true);

                // 4 tile (10% probability)
                const grid4 = JSON.parse(JSON.stringify(grid));
                grid4[y][x] = 4;
                score += 0.1 * expectimax(grid4, depth - 1, true);
            }

            const result = score / cellsToEvaluate.length;
            stateCache[cacheKey] = result;
            return result;
        }
    }

    function bestMove(grid) {
        // clear cache 
        for (const key in stateCache) {
            delete stateCache[key];
        }

        // adaptive depth based on game state
        // mayyybe not needed
        const emptyCellCount = getEmptyCells(grid).length;
        const searchDepth = emptyCellCount < 4 ? Math.min(MAX_DEPTH + 1, 5) : MAX_DEPTH;

        let bestScore = -Infinity;
        let bestDir = null;

        for (const dir of DIRS) {
            const [newGrid, moved] = moveGrid(grid, dir);
            if (moved) {
                const score = expectimax(newGrid, searchDepth, false);
                if (score > bestScore) {
                    bestScore = score;
                    bestDir = dir;
                }
            }
        }
        return bestDir;
    }

    return {
        bestMove
    };
})();


function expectimaxBestMove(grid) {
    return Expectimax.bestMove(grid);
}
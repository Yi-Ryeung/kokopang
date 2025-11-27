export type TileType = 'koala' | 'giraffe' | 'fox' | 'lion' | 'bear' | 'squirrel' | 'empty';

export interface Tile {
    id: string;
    type: TileType;
    x: number;
    y: number;
}

export interface GameState {
    grid: Tile[][];
    score: number;
    moves: number; // or time
    stage: number;
    timeLeft: number;
    isPlaying: boolean;
    isGameOver: boolean;
    isStageClear: boolean;
}

export const GRID_SIZE = 7;
export const TILE_TYPES: TileType[] = ['koala', 'giraffe', 'fox', 'lion', 'bear', 'squirrel'];

export const STAGE_CONFIG = Array.from({ length: 19 }, (_, i) => ({
    stage: i + 1,
    timeLimit: Math.max(30, 120 - i * 5), // Decrease time by 5s each stage, min 30s
    targetScore: 10000 + i * 2000, // Start at 10k, increase by 2k
}));

export function generateGrid(): Tile[][] {
    const grid: Tile[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        const row: Tile[] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            row.push({
                id: `${x}-${y}-${Math.random()}`,
                type: getRandomTileType(),
                x,
                y,
            });
        }
        grid.push(row);
    }
    // Prevent initial matches
    while (findMatches(grid).length > 0) {
        return generateGrid();
    }
    return grid;
}

function getRandomTileType(): TileType {
    return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
}

export interface MatchResult {
    tiles: Tile[];
    type: TileType;
    orientation: 'horizontal' | 'vertical';
}

export function findMatches(grid: Tile[][]): MatchResult[] {
    const matches: MatchResult[] = [];

    // Horizontal matches
    for (let y = 0; y < GRID_SIZE; y++) {
        let currentType: TileType | null = null;
        let currentMatch: Tile[] = [];

        for (let x = 0; x < GRID_SIZE; x++) {
            const tile = grid[y][x];
            if (tile.type === 'empty') {
                if (currentMatch.length >= 3 && currentType) {
                    matches.push({ tiles: [...currentMatch], type: currentType, orientation: 'horizontal' });
                }
                currentMatch = [];
                currentType = null;
                continue;
            }

            if (tile.type === currentType) {
                currentMatch.push(tile);
            } else {
                if (currentMatch.length >= 3 && currentType) {
                    matches.push({ tiles: [...currentMatch], type: currentType, orientation: 'horizontal' });
                }
                currentMatch = [tile];
                currentType = tile.type;
            }
        }
        // Check end of row
        if (currentMatch.length >= 3 && currentType) {
            matches.push({ tiles: [...currentMatch], type: currentType, orientation: 'horizontal' });
        }
    }

    // Vertical matches
    for (let x = 0; x < GRID_SIZE; x++) {
        let currentType: TileType | null = null;
        let currentMatch: Tile[] = [];

        for (let y = 0; y < GRID_SIZE; y++) {
            const tile = grid[y][x];
            if (tile.type === 'empty') {
                if (currentMatch.length >= 3 && currentType) {
                    matches.push({ tiles: [...currentMatch], type: currentType, orientation: 'vertical' });
                }
                currentMatch = [];
                currentType = null;
                continue;
            }

            if (tile.type === currentType) {
                currentMatch.push(tile);
            } else {
                if (currentMatch.length >= 3 && currentType) {
                    matches.push({ tiles: [...currentMatch], type: currentType, orientation: 'vertical' });
                }
                currentMatch = [tile];
                currentType = tile.type;
            }
        }
        // Check end of col
        if (currentMatch.length >= 3 && currentType) {
            matches.push({ tiles: [...currentMatch], type: currentType, orientation: 'vertical' });
        }
    }

    return matches;
}

export function swapTiles(grid: Tile[][], t1: Tile, t2: Tile): Tile[][] {
    const newGrid = grid.map(row => row.map(tile => ({ ...tile })));
    const tile1 = newGrid[t1.y][t1.x];
    const tile2 = newGrid[t2.y][t2.x];

    newGrid[t1.y][t1.x] = { ...tile2, x: t1.x, y: t1.y };
    newGrid[t2.y][t2.x] = { ...tile1, x: t2.x, y: t2.y };

    return newGrid;
}

export function removeMatches(grid: Tile[][], matches: Tile[]): Tile[][] {
    const newGrid = grid.map(row => row.map(tile => ({ ...tile })));
    matches.forEach(tile => {
        newGrid[tile.y][tile.x].type = 'empty';
    });
    return newGrid;
}

export function applyGravity(grid: Tile[][]): Tile[][] {
    const newGrid = grid.map(row => row.map(tile => ({ ...tile })));

    for (let x = 0; x < GRID_SIZE; x++) {
        let emptyCount = 0;
        for (let y = GRID_SIZE - 1; y >= 0; y--) {
            if (newGrid[y][x].type === 'empty') {
                emptyCount++;
            } else if (emptyCount > 0) {
                newGrid[y + emptyCount][x].type = newGrid[y][x].type;
                newGrid[y + emptyCount][x].id = newGrid[y][x].id;
                newGrid[y][x].type = 'empty';
                newGrid[y][x].id = `empty-${x}-${y}-${Math.random()}`; // Temp id
            }
        }
        // Fill top with new tiles
        for (let y = 0; y < emptyCount; y++) {
            newGrid[y][x].type = getRandomTileType();
            newGrid[y][x].id = `${x}-${y}-${Math.random()}`;
        }
    }
    return newGrid;
}

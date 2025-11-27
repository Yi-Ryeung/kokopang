"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Tile,
    TileType,
    GRID_SIZE,
    generateGrid,
    findMatches,
    swapTiles,
    removeMatches,
    applyGravity,
    STAGE_CONFIG,
} from "@/lib/game-logic";
import { cn } from "@/lib/utils";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, getMint, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";

const TILE_EMOJIS: Record<string, string> = {
    koala: "🐨",
    giraffe: "🦒",
    fox: "🦊",
    lion: "🦁",
    bear: "🐻",
    squirrel: "🐿️",
    empty: "",
    bomb: "💣",
};

const TILE_BG_COLORS: Record<TileType, string> = {
    koala: "bg-gray-400",
    giraffe: "bg-yellow-200",
    fox: "bg-orange-400",
    lion: "bg-yellow-500",
    bear: "bg-amber-700",
    squirrel: "bg-amber-600",
    empty: "invisible",
};

export default function GameBoard() {
    const [grid, setGrid] = useState<Tile[][]>([]);
    const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
    const [score, setScore] = useState(0);
    const [stage, setStage] = useState(1);
    const [timeLeft, setTimeLeft] = useState(STAGE_CONFIG[0].timeLimit);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [bombTiles, setBombTiles] = useState<Set<string>>(new Set());
    const [kokoReward, setKokoReward] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Initialize game
    useEffect(() => {
        if (gameStarted && grid.length === 0) {
            setGrid(generateGrid());
        }
    }, [gameStarted, grid.length]);

    // Timer
    useEffect(() => {
        if (!gameStarted || isGameOver) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setIsGameOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameStarted, isGameOver]);

    const handleTileClick = async (tile: Tile) => {
        if (isProcessing || isGameOver || tile.type === "empty") return;

        if (!selectedTile) {
            setSelectedTile(tile);
        } else {
            if (selectedTile.id === tile.id) {
                setSelectedTile(null);
                return;
            }

            const isAdjacent =
                Math.abs(selectedTile.x - tile.x) + Math.abs(selectedTile.y - tile.y) === 1;

            if (isAdjacent) {
                await processSwap(selectedTile, tile);
                setSelectedTile(null);
            } else {
                setSelectedTile(tile);
            }
        }
    };

    const processSwap = async (t1: Tile, t2: Tile) => {
        setIsProcessing(true);

        // Optimistic swap
        const newGrid = swapTiles(grid, t1, t2);
        setGrid(newGrid);

        // Check matches
        const matches = findMatches(newGrid);

        if (matches.length > 0) {
            await handleMatches(newGrid);
        } else {
            // Revert if no match
            await new Promise(r => setTimeout(r, 300));
            setGrid(grid); // Revert to old grid
        }

        setIsProcessing(false);
    };

    const handleMatches = async (currentGrid: Tile[][]) => {
        let activeGrid = currentGrid;
        let matches = findMatches(activeGrid);
        let currentScore = score;

        while (matches.length > 0) {
            // Wait for swap animation
            await new Promise(r => setTimeout(r, 300));

            // Collect all tiles to remove
            let tilesToRemove: Tile[] = [];
            let bombTilesSet = new Set<string>();

            matches.forEach(match => {
                // Add match tiles
                tilesToRemove.push(...match.tiles);

                // Koala Bomb Logic
                if (match.type === 'koala') {
                    console.log("Koala Bomb Triggered!");

                    if (match.orientation === 'horizontal') {
                        // Clear entire row
                        const y = match.tiles[0].y;
                        for (let x = 0; x < GRID_SIZE; x++) {
                            const tile = activeGrid[y][x];
                            tilesToRemove.push(tile);
                            bombTilesSet.add(tile.id);
                        }
                    } else {
                        // Clear entire column
                        const x = match.tiles[0].x;
                        for (let y = 0; y < GRID_SIZE; y++) {
                            const tile = activeGrid[y][x];
                            tilesToRemove.push(tile);
                            bombTilesSet.add(tile.id);
                        }
                    }
                }
            });

            // If bombs triggered, show visual effect
            if (bombTilesSet.size > 0) {
                setBombTiles(bombTilesSet);
                await new Promise(r => setTimeout(r, 1000)); // Wait 1s for visual
                setBombTiles(new Set());
            }

            // Remove duplicates from tilesToRemove
            tilesToRemove = Array.from(new Set(tilesToRemove.map(t => t.id)))
                .map(id => tilesToRemove.find(t => t.id === id)!);

            // Remove matches
            const gridAfterRemoval = removeMatches(activeGrid, tilesToRemove);
            setGrid(gridAfterRemoval);

            // Score calculation: Base match score + Bonus for bomb
            let matchScore = 0;
            matches.forEach(m => {
                matchScore += m.tiles.length * 100;
                if (m.type === 'koala') matchScore += 500; // Bonus for bomb
            });
            // Add score for extra tiles removed by bomb
            matchScore += (tilesToRemove.length - matches.reduce((acc, m) => acc + m.tiles.length, 0)) * 50;

            currentScore += matchScore;
            setScore(currentScore);

            // Wait for removal animation
            await new Promise(r => setTimeout(r, 300));

            // Apply gravity
            const gridAfterGravity = applyGravity(gridAfterRemoval);
            setGrid(gridAfterGravity);
            activeGrid = gridAfterGravity;

            // Check for new matches
            matches = findMatches(activeGrid);
        }

        // Check stage clear condition
        const currentStageConfig = STAGE_CONFIG.find(c => c.stage === stage);
        if (currentStageConfig && currentScore >= currentStageConfig.targetScore) {
            if (stage < 19) {
                setStage(s => s + 1);
                const nextStageConfig = STAGE_CONFIG.find(c => c.stage === stage + 1);
                if (nextStageConfig) {
                    // Reward notification
                    const rewardAmount = 30;
                    setKokoReward(prev => prev + rewardAmount);
                    alert(`Stage ${stage} Cleared! Reward: ${rewardAmount} KOKO (Simulated)`);

                    setTimeLeft(nextStageConfig.timeLimit);
                    // Optional: Reset grid or keep playing
                    setGrid(generateGrid());
                }
            } else {
                // All stages cleared
                const finalReward = 10000;
                setKokoReward(prev => prev + finalReward);
                alert(`Congratulations! You cleared all stages! Final Reward: ${finalReward} KOKO (Simulated)`);
                setIsGameOver(true);
                // TODO: Show victory screen
            }
        }
    };

    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [isPaymentRequired, setIsPaymentRequired] = useState(false);

    // KOKO Token Mint Address
    const KOKO_MINT = new PublicKey("GrRX89cVybD2kpo7WBfgJbjjV75AzyTpoaueWMFXmoon");
    // Treasury Wallet to receive payments
    const TREASURY_WALLET = new PublicKey("HjpY6ygsVXyadajVpehxucQnY1hYkk9yUYryoVCmoY8Z");

    // Check for payment requirement when stage changes
    useEffect(() => {
        if (stage >= 7) {
            setIsPaymentRequired(true);
            setGameStarted(false); // Pause game for payment
        }
    }, [stage]);

    const onPaymentSuccess = () => {
        setIsPaymentRequired(false);
        setGameStarted(true);
        // Reset time for the new stage
        const config = STAGE_CONFIG.find(c => c.stage === stage);
        if (config) setTimeLeft(config.timeLimit);
    };

    const handleKokoPayment = async () => {
        if (!publicKey) return;
        setIsProcessing(true);

        const MAX_RETRIES = 3;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                attempt++;
                console.log(`Attempt ${attempt} for KOKO payment...`);

                // 1. Get associated token accounts and mint info
                const sourceATA = await getAssociatedTokenAddress(KOKO_MINT, publicKey);
                const destATA = await getAssociatedTokenAddress(KOKO_MINT, TREASURY_WALLET);
                let decimals = 9;
                try {
                    const mintInfo = await getMint(connection, KOKO_MINT);
                    decimals = mintInfo.decimals;
                } catch (e) {
                    console.warn("Failed to fetch mint info, defaulting to 9 decimals:", e);
                }

                const transaction = new Transaction();

                // 2. Check if destination ATA exists
                try {
                    await getAccount(connection, destATA, 'confirmed');
                } catch (e) {
                    // If not exists, add creation instruction
                    console.log("Creating Treasury ATA...");
                    const createATAInstruction = createAssociatedTokenAccountInstruction(
                        publicKey, // Payer
                        destATA, // Associated Token Account
                        TREASURY_WALLET, // Owner
                        KOKO_MINT // Mint
                    );
                    transaction.add(createATAInstruction);
                }

                // 3. Create transfer instruction (100 KOKO)
                const amount = 100 * Math.pow(10, decimals);

                // Add priority fee
                const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 1000000,
                });

                transaction.add(priorityFeeInstruction)
                    .add(
                        createTransferInstruction(
                            sourceATA,
                            destATA,
                            publicKey,
                            amount
                        )
                    );

                // 3. Send transaction with latest blockhash
                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight }
                } = await connection.getLatestBlockhashAndContext('confirmed');

                const signature = await sendTransaction(transaction, connection, {
                    minContextSlot,
                    skipPreflight: true,
                    preflightCommitment: 'confirmed'
                });

                await connection.confirmTransaction({
                    blockhash,
                    lastValidBlockHeight,
                    signature
                }, 'confirmed');

                // Success
                onPaymentSuccess();
                return; // Exit function on success

            } catch (error: any) {
                console.error(`KOKO Payment attempt ${attempt} failed:`, error);

                // Extract detailed error message
                let errorMessage = error.message || "Unknown error";
                if (error.logs) {
                    errorMessage += `\nLogs: ${error.logs.join('\n')}`;
                }

                // If it's the last attempt, show error
                if (attempt === MAX_RETRIES) {
                    alert(`Payment failed after ${MAX_RETRIES} attempts.\nError: ${errorMessage}\n\nPlease check console for details.`);
                } else {
                    // Wait a bit before retrying
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        setIsProcessing(false);
    };

    const handleSolPayment = async () => {
        if (!publicKey) return;
        setIsProcessing(true);

        const MAX_RETRIES = 3;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                attempt++;
                console.log(`Attempt ${attempt} for SOL payment...`);

                // 0.001 SOL
                const lamports = 0.001 * LAMPORTS_PER_SOL;

                // Add priority fee
                const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 1000000,
                });

                const transaction = new Transaction()
                    .add(priorityFeeInstruction)
                    .add(
                        SystemProgram.transfer({
                            fromPubkey: publicKey,
                            toPubkey: TREASURY_WALLET,
                            lamports: lamports,
                        })
                    );

                // Send transaction with latest blockhash
                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight }
                } = await connection.getLatestBlockhashAndContext('confirmed');

                const signature = await sendTransaction(transaction, connection, {
                    minContextSlot,
                    skipPreflight: true,
                    preflightCommitment: 'confirmed'
                });

                await connection.confirmTransaction({
                    blockhash,
                    lastValidBlockHeight,
                    signature
                }, 'confirmed');

                // Success
                onPaymentSuccess();
                return; // Exit function on success

            } catch (error: any) {
                console.error(`SOL Payment attempt ${attempt} failed:`, error);

                // Extract detailed error message
                let errorMessage = error.message || "Unknown error";
                if (error.logs) {
                    errorMessage += `\nLogs: ${error.logs.join('\n')}`;
                }

                // If it's the last attempt, show error
                if (attempt === MAX_RETRIES) {
                    alert(`Payment failed after ${MAX_RETRIES} attempts.\nError: ${errorMessage}\n\nPlease check console for details.`);
                } else {
                    // Wait a bit before retrying
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        setIsProcessing(false);
    };

    if (!mounted) return null;

    if (isPaymentRequired) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <h1 className="text-4xl font-bold text-white mb-8">Stage {stage} Locked</h1>
                <p className="text-xl text-white mb-4">Pay to unlock Stage {stage}</p>
                <WalletMultiButton />

                <div className="flex gap-4 mt-4">
                    <button
                        onClick={handleKokoPayment}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 transition-colors shadow-lg disabled:opacity-50"
                    >
                        {isProcessing ? "Processing..." : "Pay 100 KOKO"}
                    </button>
                    <button
                        onClick={handleSolPayment}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
                    >
                        {isProcessing ? "Processing..." : "Pay 0.001 SOL"}
                    </button>
                </div>
            </div>
        );
    }

    if (!gameStarted) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <h1 className="text-4xl font-bold text-white mb-8">KoKoPang</h1>
                <WalletMultiButton />
                <button
                    onClick={() => setGameStarted(true)}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 transition-colors shadow-lg"
                >
                    Start Game
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto p-4">
            <div className="flex justify-between w-full mb-4 text-white font-bold text-xl items-start">
                <div className="flex flex-col gap-2">
                    <div>Stage {stage}</div>
                    <div>Score: {score}</div>
                    <div className="text-yellow-400">Rewards: {kokoReward} KOKO</div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                    <WalletMultiButton />
                    <div className={cn(timeLeft < 10 && "text-red-500")}>
                        Time: {timeLeft}s
                    </div>
                </div>
            </div>

            <div
                className="grid gap-1 bg-white/10 p-2 rounded-xl backdrop-blur-sm"
                style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                }}
            >
                {grid.map((row, y) =>
                    row.map((tile, x) => (
                        <motion.div
                            key={tile.id}
                            layoutId={tile.id}
                            onClick={() => handleTileClick(tile)}
                            className={cn(
                                "w-10 h-10 rounded-lg cursor-pointer shadow-sm relative flex items-center justify-center text-2xl select-none",
                                TILE_BG_COLORS[tile.type],
                                selectedTile?.id === tile.id && "ring-4 ring-white z-10"
                            )}
                            initial={false}
                            animate={{
                                scale: tile.type === "empty" ? 0 : 1,
                                opacity: tile.type === "empty" ? 0 : 1,
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            {bombTiles.has(tile.id) ? (TILE_EMOJIS as any).bomb : TILE_EMOJIS[tile.type]}
                        </motion.div>
                    ))
                )}
            </div>

            {isGameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                    <h2 className="text-4xl font-bold text-white mb-4">Game Over</h2>
                    <p className="text-xl text-white mb-8">Final Score: {score}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-white text-black rounded-lg font-bold hover:bg-gray-200"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}

const { Connection, PublicKey } = require("@solana/web3.js");
const { getMint } = require("@solana/spl-token");

async function checkDecimals() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const mintAddress = new PublicKey("GrRX89cVybD2kpo7WBfgJbjjV75AzyTpoaueWMFXmoon");

    try {
        const mintInfo = await getMint(connection, mintAddress);
        console.log(`Mint: ${mintAddress.toBase58()}`);
        console.log(`Decimals: ${mintInfo.decimals}`);
    } catch (error) {
        console.error("Error fetching mint info:", error);
    }
}

checkDecimals();

const { Connection, PublicKey } = require("@solana/web3.js");
const { getAssociatedTokenAddress, getAccount } = require("@solana/spl-token");

async function checkTreasuryATA() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const KOKO_MINT = new PublicKey("GrRX89cVybD2kpo7WBfgJbjjV75AzyTpoaueWMFXmoon");
    const TREASURY_WALLET = new PublicKey("HjpY6ygsVXyadajVpehxucQnY1hYkk9yUYryoVCmoY8Z");

    try {
        const destATA = await getAssociatedTokenAddress(KOKO_MINT, TREASURY_WALLET);
        console.log(`Treasury ATA Address: ${destATA.toBase58()}`);

        try {
            const accountInfo = await getAccount(connection, destATA);
            console.log("Treasury ATA exists and is initialized.");
            console.log(`Balance: ${accountInfo.amount}`);
        } catch (e) {
            console.log("Treasury ATA does NOT exist or is not initialized.");
            console.error(e.message);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

checkTreasuryATA();

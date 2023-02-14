import { Squid } from "@0xsquid/sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const privateKey = process.env.PK!;
if (!privateKey)
  throw new Error("No private key provided, pls include in .env file");

(async () => {
  // instantiate the SDK

  const squid = new Squid({
    baseUrl: "https://api.0xsquid.com", // for testnet use "https://testnet.api.0xsquid.com"
  });

  // init the SDK
  await squid.init();
  console.log("Squid inited");

  // use the RPC provider of the "from" chain
  const provider = ethers.getDefaultProvider(
    "https://api.avax.network/ext/bc/C/rpc"
  );

  const signer = new ethers.Wallet(privateKey, provider);

  const params = {
    fromChain: 43114,
    fromToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    fromAmount: "10000000000000000",
    toChain: 42161,
    toToken: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    toAddress: "0x4edc01b119a224dbc0fa1297a6aca3f02af5a58d",
    slippage: 3.0, // 3.00 = 3% max slippage across the entire route, acceptable value range is 1-99
    enableForecall: false, // instant execution service, defaults to true
    quoteOnly: false, // optional, defaults to false
    customContractCalls: [
      {
        callType: 1,
        target: "0x5957582F020301a2f732ad17a69aB2D8B2741241",
        value: "0",
        callData:
          "0x8340f5490000000000000000000000004edc01b119a224dbc0fa1297a6aca3f02af5a58d000000000000000000000000ff970a61a04b1ca14834a43f5de4533ebddb5cc80000000000000000000000000000000000000000000000000000000000000000",
        payload: {
          tokenAddress: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
          inputPos: 2,
        },
        estimatedGas: "400000",
      },
    ],
  };

  const { route } = await squid.getRoute(params);

  const tx = await squid.executeRoute({
    signer,
    route,
  });

  const txReceipt = await tx.wait();

  console.log(txReceipt.transactionHash);
})();

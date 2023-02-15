import { Squid } from "@0xsquid/sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";
import erc20Abi from "./abi/erc20.json";
import velaVaultAbi from "./abi/vela_vault.json";
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

  //addreses
  const velaVaultContract = "0x5957582f020301a2f732ad17a69ab2d8b2741241";
  const usdcOnArbAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
  const squidMulticallAddress = "0x4fd39C9E151e50580779bd04B1f7eCc310079fd3";

  // call data
  const usdcContractInterface = new ethers.utils.Interface(erc20Abi as any);
  const approveEncodeData = usdcContractInterface.encodeFunctionData(
    "approve",
    [velaVaultContract, "0"]
  );
  const velaVaultContractInterface = new ethers.utils.Interface(
    velaVaultAbi as any
  );
  const depositEncodedData = velaVaultContractInterface.encodeFunctionData(
    "deposit",
    [squidMulticallAddress, usdcOnArbAddress, "0"]
  );

  //squid sdk params
  const params = {
    fromChain: 43114,
    fromToken: squid.tokens.find(
      (t) => t.symbol === "axlUSDC" && t.chainId === 43114
    ).address,
    fromAmount: ethers.utils.parseUnits("0.1", 6).toString(), //"2000000",
    toChain: 42161,
    toToken: squid.tokens.find(
      (t) => t.symbol === "USDC" && t.chainId === 42161
    ).address,
    toAddress: "0xb13CD07B22BC5A69F8500a1Cb3A1b65618d50B22",
    slippage: 3.0, // 3.00 = 3% max slippage across the entire route, acceptable value range is 1-99
    enableForecall: false, // instant execution service, defaults to true
    quoteOnly: false, // optional, defaults to false
    customContractCalls: [
      {
        callType: 1,
        target: usdcOnArbAddress,
        value: "0",
        callData: approveEncodeData,
        payload: {
          tokenAddress: usdcOnArbAddress,
          inputPos: 1,
        },
        estimatedGas: "20000",
      },
      {
        callType: 1,
        target: velaVaultContract,
        value: "0",
        callData: depositEncodedData,
        payload: {
          tokenAddress: usdcOnArbAddress,
          inputPos: 2,
        },
        estimatedGas: "100000",
      },
    ],
  };

  // get route and exectute it
  const { route } = await squid.getRoute(params);
  const tx = await squid.executeRoute({
    signer,
    route,
  });
  const txReceipt = await tx.wait();
  console.log(txReceipt.transactionHash);
})();

import { http, createConfig } from "wagmi";
import { foundry, mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { getChainId, getRpcUrl } from "../lib/env";

const rpcUrl = getRpcUrl();
const targetChainId = getChainId();

export const wagmiConfig = createConfig({
  chains: [sepolia, foundry, mainnet],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(targetChainId === sepolia.id ? rpcUrl : undefined),
    [foundry.id]: http(targetChainId === foundry.id ? rpcUrl : undefined),
    [mainnet.id]: http(targetChainId === mainnet.id ? rpcUrl : undefined),
  },
});

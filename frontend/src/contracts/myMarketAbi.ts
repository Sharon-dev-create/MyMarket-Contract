export const myMarketAbi = [
  {
    type: "function",
    name: "PAYMENT_TOKEN",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "orderCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "orders",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "buyer", type: "address" },
      { name: "seller", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "state", type: "uint8" },
      { name: "shippedAt", type: "uint256" },
      { name: "paymentType", type: "uint8" }
    ]
  },
  {
    type: "function",
    name: "depositEth",
    stateMutability: "payable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "depositToken",
    stateMutability: "payable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: []
  }
] as const;


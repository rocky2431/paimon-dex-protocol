#!/bin/bash
FACTORY="0x4cC72Aa0BfbFa1C3F782e54C308d87A8da372d43"
PAIMON="0x37F76716f550d08Bb6c5FEEE91E46bc9732A0974"
USDP="0x69cA4879c52A0935561F9D8165e4CB3b91f951a6"
USDC="0xA1112f596A73111E102b4a9c39064b2b2383EC38"
WBNB="0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"
HYD="0x4eea0e1801ad5f71bc117184fb01e65b48360db8"
RPC="https://data-seed-prebsc-1-s1.binance.org:8545"

echo "验证 PAIMON 相关池子"
echo "========================================"

pools=(
  "PAIMON/USDC:$PAIMON:$USDC"
  "PAIMON/USDP:$PAIMON:$USDP"
  "PAIMON/WBNB:$PAIMON:$WBNB"
  "WBNB/USDC:$WBNB:$USDC"
  "WBNB/USDP:$WBNB:$USDP"
  "USDP/USDC:$USDP:$USDC"
  "HYD/USDP:$HYD:$USDP"
)

for pool in "${pools[@]}"; do
  IFS=':' read -r name token0 token1 <<< "$pool"
  addr=$(cast call "$FACTORY" "getPair(address,address)(address)" "$token0" "$token1" --rpc-url "$RPC" 2>/dev/null)
  if [ "$addr" = "0x0000000000000000000000000000000000000000" ]; then
    echo "$name: ❌"
  else
    echo "$name: ✅ $addr"
  fi
done

echo ""
echo "路由分析："
echo "  PAIMON → USDC 可能的路由："
echo "    1. 直接 PAIMON → USDC"
echo "    2. Via WBNB: PAIMON → WBNB → USDC"
echo "    3. Via USDP: PAIMON → USDP → USDC (需要 USDP/USDC 池)"

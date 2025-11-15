"""
Contract addresses and ABIs for blockchain indexing.

Loaded from environment or hardcoded for BSC Testnet.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict

# BSC Testnet contract addresses
TESTNET_ADDRESSES = {
    "core": {
        "USDP": "0x6F7021C9B4DCD61b26d1aF5ACd1394A79eb49051",
        "PAIMON": "0x9c85485176fcD2db01eD0af66ed63680Eb9e5CB2",
        "esPAIMON": "0x16f3a36Adae84c9c980D6C96510F37A5861DF2C6",
        "HYD": "0x3803E40C522E23163078c6fB2980288974645d85",
        "PSM": "0xC04288c5f143541d38D5E7EAd152dB69b386a384",
        "VotingEscrowPaimon": "0x9f70D468BBdC4e4b0789732DDBCa7eF01E671cC4",
        "USDPVault": "0x94E9F52F90609a6941ACc20996CCF9F738Eb22A1",
        "StabilityPool": "0x594D48f69B14D3f22fa18682F48Bd6fBcB829dA0",
    },
    "governance": {
        "GaugeController": "0x229d5744Edc1684C30A8A393e3d66428bd904b26",
        "RewardDistributor": "0xc1867Dea89CaBcCdf207f348C420850dA4DeFF38",
        "EmissionManager": "0x8bF29ACdeFFBCc3965Aaa225C4CB3EA479e7615a",
        "EmissionRouter": "0x122e31af6BefAEC17EC5eE2402e31364aCAbE60b",
    },
    "incentives": {
        "BoostStaking": "0xd7b1C5F77F2a2BEB06E3f145eF5cce53E566D2FF",
        "NitroPool": "0x52712Ef3aa240Bdd46180f3522c1bf7573C1abbA",
    },
    "dex": {
        "DEXFactory": "0xc32F700393F6d9d39b4f3b30ceF02e7A0795DB5A",
        "DEXRouter": "0x77a9B25d69746d9b51455c2EE71dbcc934365dDB",
    },
    "treasury": {
        "Treasury": "0x0BdBeC0efe5f3Db5b771AB095aF1A7051B304E05",
        "SavingRate": "0x3977DB6503795E3c1812765f6910D96848b1e025",
        "RWAPriceOracle": "0xbEf3913a7FA99985c1C7FfAb9B948C5f93eC2A8b",
    },
    "mocks": {
        "USDC": "0x2Dbcd194F22858Ae139Ba026830cBCc5C730FdF4",
    },
}

# Minimal DEX Pair ABI (Uniswap V2 compatible)
DEX_PAIR_ABI = [
    # ERC20
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{"name": "owner", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "totalSupply",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    },
    # Pair specific
    {
        "type": "function",
        "name": "token0",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "token1",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "getReserves",
        "inputs": [],
        "outputs": [
            {"name": "reserve0", "type": "uint112"},
            {"name": "reserve1", "type": "uint112"},
            {"name": "blockTimestampLast", "type": "uint32"},
        ],
        "stateMutability": "view",
    },
    # Events
    {
        "type": "event",
        "name": "Mint",
        "inputs": [
            {"name": "sender", "type": "address", "indexed": True},
            {"name": "amount0", "type": "uint256", "indexed": False},
            {"name": "amount1", "type": "uint256", "indexed": False},
        ],
    },
    {
        "type": "event",
        "name": "Burn",
        "inputs": [
            {"name": "sender", "type": "address", "indexed": True},
            {"name": "amount0", "type": "uint256", "indexed": False},
            {"name": "amount1", "type": "uint256", "indexed": False},
            {"name": "to", "type": "address", "indexed": True},
        ],
    },
    {
        "type": "event",
        "name": "Swap",
        "inputs": [
            {"name": "sender", "type": "address", "indexed": True},
            {"name": "amount0In", "type": "uint256", "indexed": False},
            {"name": "amount1In", "type": "uint256", "indexed": False},
            {"name": "amount0Out", "type": "uint256", "indexed": False},
            {"name": "amount1Out", "type": "uint256", "indexed": False},
            {"name": "to", "type": "address", "indexed": True},
        ],
    },
]

# ERC20 Token ABI
ERC20_ABI = [
    {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "decimals",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    },
]

# GaugeController ABI (minimal)
GAUGE_CONTROLLER_ABI = [
    {
        "type": "function",
        "name": "gauges",
        "inputs": [{"name": "pool", "type": "address"}],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "gauge_relative_weight",
        "inputs": [
            {"name": "gauge", "type": "address"},
            {"name": "time", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    },
]

# DEXFactory ABI
DEX_FACTORY_ABI = [
    {
        "type": "function",
        "name": "allPairsLength",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "allPairs",
        "inputs": [{"name": "index", "type": "uint256"}],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
    },
    {
        "type": "event",
        "name": "PairCreated",
        "inputs": [
            {"name": "token0", "type": "address", "indexed": True},
            {"name": "token1", "type": "address", "indexed": True},
            {"name": "pair", "type": "address", "indexed": False},
            {"name": "allPairsLength", "type": "uint256", "indexed": False},
        ],
    },
]


def get_contract_address(category: str, name: str) -> str:
    """
    Get contract address.

    Args:
        category: Contract category (core, governance, dex, etc.)
        name: Contract name

    Returns:
        Contract address

    Raises:
        KeyError: If contract not found
    """
    return TESTNET_ADDRESSES[category][name]


def get_all_contract_addresses() -> Dict[str, Dict[str, str]]:
    """
    Get all contract addresses.

    Returns:
        Dict of {category: {name: address}}
    """
    return TESTNET_ADDRESSES

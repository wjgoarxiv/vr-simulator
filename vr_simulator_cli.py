#!/usr/bin/env python3
"""
VR Simulator CLI - Standalone Command-Line Tool

A standalone Python CLI version of the VR (Value Rebalancing) simulator.
Processes CSV files and runs VR V3.0 simulations with volatility-adaptive bands.

Usage:
    python vr_simulator_cli.py --input data.csv --asset TQQQ --output results.json
    python vr_simulator_cli.py -i data.csv -a UPRO --v3 --format csv
    python vr_simulator_cli.py --help
"""

import argparse
import csv
import json
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
import warnings

# Suppress warnings for cleaner CLI output
warnings.filterwarnings('ignore')

# Try to import V3.0 modules
try:
    from vr_v3_core import (
        VRv3Engine,
        create_vr_engine,
        ASSET_PRESETS,
        VR_VERSION
    )
    VR_V3_AVAILABLE = True
except ImportError:
    VR_V3_AVAILABLE = False
    VR_VERSION = "3.0"
    ASSET_PRESETS = {
        'TQQQ': {'description': '3x NASDAQ'},
        'UPRO': {'description': '3x S&P 500'},
        'SOXL': {'description': '3x Semiconductors'},
        'SPY': {'description': 'S&P 500 ETF'},
        'QQQ': {'description': 'NASDAQ ETF'},
        'CUSTOM': {'description': 'Custom Settings'}
    }


# =============================================================================
# Constants
# =============================================================================

BASE_BAND_LOWER = 0.85
BASE_BAND_UPPER = 1.15
DEFAULT_G = 10.0
DEFAULT_POOL_CAP_RATIO = 0.5


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class CycleResult:
    """Result of a single VR cycle calculation"""
    cycle_num: int
    V_target: float
    LBand: float
    HBand: float
    shares_end: int
    pool_end: float
    price_end: float
    E_calc: float
    trade_action: str  # 'buy', 'sell', 'hold'
    trade_shares: int
    trade_value: float
    roi: float  # Return on investment
    alpha: float  # VR ROI - Buy-and-Hold ROI


@dataclass
class SimulationSummary:
    """Summary of entire simulation"""
    total_cycles: int
    initial_value: float
    final_value: float
    vr_roi: float
    bh_roi: float
    alpha: float
    total_trades: int
    buys: int
    sells: int
    max_drawdown: float
    volatility: float
    asset_type: str
    v3_enabled: bool


# =============================================================================
# VR Calculation Functions
# =============================================================================

def calculate_bands_v25(V_target: float, E_calc: float) -> Tuple[float, float]:
    """Calculate bands using V2.5 logic (fixed bands)"""
    return V_target * BASE_BAND_LOWER, V_target * BASE_BAND_UPPER


def calculate_bands_v3(engine: 'VRv3Engine', V_target: float, E_calc: float) -> Tuple[float, float]:
    """Calculate bands using V3.0 volatility-adaptive logic"""
    bands = engine.calculate_adaptive_bands(V_target, E_calc)
    return bands.L_band, bands.H_band


def calculate_v_next(V_i: float, pool: float, E_calc: float, G: float = DEFAULT_G) -> float:
    """Calculate next V target value"""
    pool_cap = E_calc * DEFAULT_POOL_CAP_RATIO
    pool_effective = min(pool, pool_cap)
    return V_i + pool_effective / G


def process_cycle(
    cycle_num: int,
    price_end: float,
    shares: int,
    pool: float,
    V_i: float,
    deposit: float,
    engine: Optional['VRv3Engine'] = None,
    use_v3: bool = False
) -> Tuple[CycleResult, int, float, float]:
    """
    Process a single VR cycle

    Returns:
        Tuple of (CycleResult, new_shares, new_pool, new_V_target)
    """
    # Calculate E (portfolio value)
    E_calc = shares * price_end + pool

    # Calculate V_target
    V_target = calculate_v_next(V_i, pool, E_calc)

    # Calculate bands
    if use_v3 and engine:
        engine.update_price(price_end)
        LBand, HBand = calculate_bands_v3(engine, V_target, E_calc)
    else:
        LBand, HBand = calculate_bands_v25(V_target, E_calc)

    # Determine trade action
    trade_action = 'hold'
    trade_shares = 0
    trade_value = 0.0
    new_shares = shares
    new_pool = pool + deposit

    if E_calc < LBand and new_pool > 0:
        # Buy signal
        trade_action = 'buy'
        shares_to_buy = int(min(new_pool, LBand - E_calc) / price_end)
        if shares_to_buy > 0:
            trade_shares = shares_to_buy
            trade_value = shares_to_buy * price_end
            new_shares = shares + shares_to_buy
            new_pool = new_pool - trade_value
    elif E_calc > HBand and shares > 0:
        # Sell signal
        trade_action = 'sell'
        shares_to_sell = int((E_calc - HBand) / price_end)
        shares_to_sell = min(shares_to_sell, shares)
        if shares_to_sell > 0:
            trade_shares = shares_to_sell
            trade_value = shares_to_sell * price_end
            new_shares = shares - shares_to_sell
            new_pool = new_pool + trade_value

    # Calculate ROI (simplified)
    total_value = new_shares * price_end + new_pool
    initial_investment = (shares * price_end + pool) if cycle_num == 0 else 0
    roi = 0.0  # Will be calculated at summary level

    result = CycleResult(
        cycle_num=cycle_num,
        V_target=V_target,
        LBand=LBand,
        HBand=HBand,
        shares_end=new_shares,
        pool_end=new_pool,
        price_end=price_end,
        E_calc=E_calc,
        trade_action=trade_action,
        trade_shares=trade_shares,
        trade_value=trade_value,
        roi=roi,
        alpha=0.0
    )

    return result, new_shares, new_pool, V_target


# =============================================================================
# CSV Processing
# =============================================================================

def load_csv(filepath: str) -> List[Dict[str, Any]]:
    """Load CSV file and return list of rows as dictionaries"""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {filepath}")

    rows = []
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    return rows


def extract_prices_from_csv(rows: List[Dict[str, Any]]) -> List[float]:
    """Extract price history from CSV rows"""
    prices = []
    for row in rows:
        # Try different column names for price
        price = None
        for col in ['price_end', 'price', 'close', 'Close', 'adj_close', 'Adj Close']:
            if col in row and row[col]:
                try:
                    price = float(row[col])
                    break
                except ValueError:
                    continue
        if price is not None:
            prices.append(price)
    return prices


def run_simulation(
    prices: List[float],
    initial_shares: int = 10,
    initial_pool: float = 5000.0,
    deposit_per_cycle: float = 0.0,
    asset_type: str = 'TQQQ',
    use_v3: bool = True,
    enable_momentum: bool = True,
    enable_risk: bool = True
) -> Tuple[List[CycleResult], SimulationSummary]:
    """
    Run VR simulation on price history

    Args:
        prices: List of prices for each cycle
        initial_shares: Starting number of shares
        initial_pool: Starting cash pool
        deposit_per_cycle: Amount deposited each cycle
        asset_type: Asset type for V3 presets
        use_v3: Whether to use V3.0 adaptive bands
        enable_momentum: Enable momentum filter (V3 only)
        enable_risk: Enable risk management (V3 only)

    Returns:
        Tuple of (cycle_results, summary)
    """
    if not prices:
        raise ValueError("No price data provided")

    # Initialize V3 engine if available
    engine = None
    if use_v3 and VR_V3_AVAILABLE:
        engine = create_vr_engine(
            asset_type,
            enable_momentum_filter=enable_momentum,
            enable_risk_management=enable_risk
        )

    # Initialize state
    shares = initial_shares
    pool = initial_pool
    V_target = initial_shares * prices[0]  # Initial V target

    results: List[CycleResult] = []
    total_buys = 0
    total_sells = 0

    # Track for buy-and-hold comparison
    initial_value = shares * prices[0] + pool
    bh_shares = shares  # Buy and hold uses initial shares only

    # Run simulation
    for i, price in enumerate(prices):
        deposit = deposit_per_cycle if i > 0 else 0

        result, shares, pool, V_target = process_cycle(
            cycle_num=i,
            price_end=price,
            shares=shares,
            pool=pool,
            V_i=V_target,
            deposit=deposit,
            engine=engine,
            use_v3=use_v3 and VR_V3_AVAILABLE
        )

        results.append(result)

        if result.trade_action == 'buy':
            total_buys += 1
        elif result.trade_action == 'sell':
            total_sells += 1

    # Calculate final values
    final_value = shares * prices[-1] + pool
    bh_final_value = bh_shares * prices[-1] + initial_pool  # BH keeps original pool

    # Add total deposits to both
    total_deposits = deposit_per_cycle * (len(prices) - 1)
    total_investment = initial_value + total_deposits

    vr_roi = ((final_value - total_investment) / total_investment) * 100 if total_investment > 0 else 0
    bh_roi = ((bh_final_value + total_deposits - total_investment) / total_investment) * 100 if total_investment > 0 else 0

    # Calculate volatility
    if len(prices) > 1:
        returns = [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices))]
        volatility = (sum(r**2 for r in returns) / len(returns)) ** 0.5 * 100
    else:
        volatility = 0.0

    # Calculate max drawdown
    peak = prices[0]
    max_dd = 0.0
    for price in prices:
        if price > peak:
            peak = price
        dd = (peak - price) / peak
        if dd > max_dd:
            max_dd = dd

    summary = SimulationSummary(
        total_cycles=len(prices),
        initial_value=initial_value,
        final_value=final_value,
        vr_roi=vr_roi,
        bh_roi=bh_roi,
        alpha=vr_roi - bh_roi,
        total_trades=total_buys + total_sells,
        buys=total_buys,
        sells=total_sells,
        max_drawdown=max_dd * 100,
        volatility=volatility,
        asset_type=asset_type,
        v3_enabled=use_v3 and VR_V3_AVAILABLE
    )

    return results, summary


# =============================================================================
# Output Formatting
# =============================================================================

def format_text_output(results: List[CycleResult], summary: SimulationSummary) -> str:
    """Format results as human-readable text"""
    lines = [
        "=" * 60,
        "VR SIMULATOR - SIMULATION RESULTS",
        f"Version: {VR_VERSION} {'(V3.0 Enabled)' if summary.v3_enabled else '(V2.5 Mode)'}",
        "=" * 60,
        "",
        "SUMMARY",
        "-" * 40,
        f"Asset Type:      {summary.asset_type}",
        f"Total Cycles:    {summary.total_cycles}",
        f"Initial Value:   ${summary.initial_value:,.2f}",
        f"Final Value:     ${summary.final_value:,.2f}",
        "",
        f"VR ROI:          {summary.vr_roi:+.2f}%",
        f"Buy-and-Hold:    {summary.bh_roi:+.2f}%",
        f"Alpha:           {summary.alpha:+.2f}%",
        "",
        f"Total Trades:    {summary.total_trades}",
        f"  - Buys:        {summary.buys}",
        f"  - Sells:       {summary.sells}",
        "",
        f"Max Drawdown:    {summary.max_drawdown:.2f}%",
        f"Volatility:      {summary.volatility:.2f}%",
        "",
        "=" * 60,
        "CYCLE DETAILS",
        "-" * 40,
    ]

    # Add cycle details
    for r in results[:10]:  # Show first 10 cycles
        lines.append(
            f"Cycle {r.cycle_num:3d}: Price ${r.price_end:8.2f} | "
            f"Shares {r.shares_end:4d} | Pool ${r.pool_end:10.2f} | "
            f"{r.trade_action.upper():4s}"
        )

    if len(results) > 10:
        lines.append(f"... ({len(results) - 10} more cycles)")

    lines.extend(["", "=" * 60])

    return "\n".join(lines)


def format_json_output(results: List[CycleResult], summary: SimulationSummary) -> str:
    """Format results as JSON"""
    output = {
        "summary": asdict(summary),
        "cycles": [asdict(r) for r in results]
    }
    return json.dumps(output, indent=2)


def format_csv_output(results: List[CycleResult], summary: SimulationSummary) -> str:
    """Format results as CSV"""
    lines = []

    # Header
    header = [
        "cycle_num", "price_end", "V_target", "LBand", "HBand",
        "shares_end", "pool_end", "E_calc", "trade_action", "trade_shares", "trade_value"
    ]
    lines.append(",".join(header))

    # Data rows
    for r in results:
        row = [
            str(r.cycle_num),
            f"{r.price_end:.2f}",
            f"{r.V_target:.2f}",
            f"{r.LBand:.2f}",
            f"{r.HBand:.2f}",
            str(r.shares_end),
            f"{r.pool_end:.2f}",
            f"{r.E_calc:.2f}",
            r.trade_action,
            str(r.trade_shares),
            f"{r.trade_value:.2f}"
        ]
        lines.append(",".join(row))

    return "\n".join(lines)


# =============================================================================
# CLI Entry Point
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="VR Simulator CLI - Value Rebalancing Strategy Simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s --input data.csv --asset TQQQ
    %(prog)s -i data.csv -a UPRO --v3 --format json > results.json
    %(prog)s -i data.csv --no-v3 --output results.csv

Available assets: TQQQ, UPRO, SOXL, SPY, QQQ, CUSTOM
        """
    )

    parser.add_argument(
        "-i", "--input",
        required=True,
        help="Input CSV file path with price data"
    )

    parser.add_argument(
        "-a", "--asset",
        choices=list(ASSET_PRESETS.keys()),
        default="TQQQ",
        help="Asset type for V3.0 presets (default: TQQQ)"
    )

    parser.add_argument(
        "--v3",
        action="store_true",
        default=True,
        help="Enable V3.0 volatility-adaptive bands (default: enabled)"
    )

    parser.add_argument(
        "--no-v3",
        action="store_true",
        help="Disable V3.0, use V2.5 fixed bands"
    )

    parser.add_argument(
        "-f", "--format",
        choices=["text", "json", "csv"],
        default="text",
        help="Output format (default: text)"
    )

    parser.add_argument(
        "-o", "--output",
        help="Output file path (default: stdout)"
    )

    parser.add_argument(
        "--shares",
        type=int,
        default=10,
        help="Initial number of shares (default: 10)"
    )

    parser.add_argument(
        "--pool",
        type=float,
        default=5000.0,
        help="Initial cash pool (default: 5000)"
    )

    parser.add_argument(
        "--deposit",
        type=float,
        default=0.0,
        help="Deposit per cycle (default: 0)"
    )

    parser.add_argument(
        "--no-momentum",
        action="store_true",
        help="Disable momentum filter (V3 only)"
    )

    parser.add_argument(
        "--no-risk",
        action="store_true",
        help="Disable risk management (V3 only)"
    )

    parser.add_argument(
        "-v", "--version",
        action="version",
        version=f"VR Simulator CLI v{VR_VERSION}"
    )

    args = parser.parse_args()

    # Determine V3 status
    use_v3 = args.v3 and not args.no_v3

    if use_v3 and not VR_V3_AVAILABLE:
        print("Warning: V3.0 modules not found, running in V3.0 Lite mode", file=sys.stderr)
        use_v3 = False

    try:
        # Load CSV
        print(f"Loading CSV: {args.input}", file=sys.stderr)
        rows = load_csv(args.input)
        prices = extract_prices_from_csv(rows)

        if not prices:
            print("Error: No price data found in CSV", file=sys.stderr)
            sys.exit(1)

        print(f"Found {len(prices)} price points", file=sys.stderr)

        # Run simulation
        print(f"Running simulation (V{'3.0' if use_v3 else '3.0 Lite'}, Asset: {args.asset})", file=sys.stderr)
        results, summary = run_simulation(
            prices=prices,
            initial_shares=args.shares,
            initial_pool=args.pool,
            deposit_per_cycle=args.deposit,
            asset_type=args.asset,
            use_v3=use_v3,
            enable_momentum=not args.no_momentum,
            enable_risk=not args.no_risk
        )

        # Format output
        if args.format == "json":
            output = format_json_output(results, summary)
        elif args.format == "csv":
            output = format_csv_output(results, summary)
        else:
            output = format_text_output(results, summary)

        # Write output
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Results written to: {args.output}", file=sys.stderr)
        else:
            print(output)

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

"""
VR V3.0 Core Module
====================

Main integration module that combines all VR V3.0 features:
- Volatility-adaptive bands
- Asset presets (TQQQ, UPRO, SOXL, SPY, etc.)
- Risk management (trailing stops, position limits)
- Momentum filters for trade optimization

This module serves as the primary entry point for VR V3.0 functionality.

Usage Example:
--------------
    from vr_v3_core import VRv3Engine, create_vr_engine

    # Create engine with default TQQQ settings
    engine = create_vr_engine('TQQQ')

    # Update with price data
    engine.update_price(45.50)

    # Get trading signals
    signals = engine.get_trading_signals(
        current_price=45.50,
        shares=100,
        pool=5000.0,
        V_target=10000.0
    )

    # Check if trade should execute
    should_buy, reason = engine.should_execute_trade('buy', 45.50)

Author: VR Simulator Team
Version: 3.0
"""

from typing import Dict, List, Optional, Tuple, Any
import math
from dataclasses import dataclass, field
from enum import Enum

# =============================================================================
# Version Information
# =============================================================================
VR_VERSION = "3.0"
VR_VERSION_NAME = "Volatility-Adaptive Release"
VR_BUILD_DATE = "2025-01"


# =============================================================================
# Enums and Constants
# =============================================================================

class AssetType(Enum):
    """Supported asset types with their characteristics"""
    TQQQ = "tqqq"      # 3x Leveraged NASDAQ-100
    UPRO = "upro"      # 3x Leveraged S&P 500
    SOXL = "soxl"      # 3x Leveraged Semiconductors
    SPY = "spy"        # S&P 500 ETF (1x)
    QQQ = "qqq"        # NASDAQ-100 ETF (1x)
    CUSTOM = "custom"  # User-defined settings


class MomentumState(Enum):
    """Momentum filter states"""
    STRONG_BULLISH = "strong_bullish"
    BULLISH = "bullish"
    NEUTRAL = "neutral"
    BEARISH = "bearish"
    STRONG_BEARISH = "strong_bearish"


class RiskLevel(Enum):
    """Risk status levels"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


# Default asset configurations
ASSET_PRESETS: Dict[str, Dict[str, Any]] = {
    'TQQQ': {
        'name': 'ProShares UltraPro QQQ',
        'leverage': 3.0,
        'base_volatility': 0.045,  # ~4.5% daily volatility
        'band_multiplier': 1.0,
        'trailing_stop_pct': 0.15,
        'max_position_pct': 0.30,
        'momentum_lookback': 20,
        'description': '3x Leveraged NASDAQ-100 ETF'
    },
    'UPRO': {
        'name': 'ProShares UltraPro S&P500',
        'leverage': 3.0,
        'base_volatility': 0.035,
        'band_multiplier': 0.9,
        'trailing_stop_pct': 0.12,
        'max_position_pct': 0.35,
        'momentum_lookback': 20,
        'description': '3x Leveraged S&P 500 ETF'
    },
    'SOXL': {
        'name': 'Direxion Semiconductor Bull 3X',
        'leverage': 3.0,
        'base_volatility': 0.055,  # Higher volatility
        'band_multiplier': 1.2,
        'trailing_stop_pct': 0.18,
        'max_position_pct': 0.25,
        'momentum_lookback': 15,
        'description': '3x Leveraged Semiconductor ETF'
    },
    'SPY': {
        'name': 'SPDR S&P 500 ETF',
        'leverage': 1.0,
        'base_volatility': 0.012,
        'band_multiplier': 0.5,
        'trailing_stop_pct': 0.08,
        'max_position_pct': 0.50,
        'momentum_lookback': 30,
        'description': 'S&P 500 Index ETF'
    },
    'QQQ': {
        'name': 'Invesco QQQ Trust',
        'leverage': 1.0,
        'base_volatility': 0.015,
        'band_multiplier': 0.6,
        'trailing_stop_pct': 0.10,
        'max_position_pct': 0.45,
        'momentum_lookback': 25,
        'description': 'NASDAQ-100 Index ETF'
    },
    'CUSTOM': {
        'name': 'Custom Asset',
        'leverage': 1.0,
        'base_volatility': 0.02,
        'band_multiplier': 1.0,
        'trailing_stop_pct': 0.10,
        'max_position_pct': 0.40,
        'momentum_lookback': 20,
        'description': 'User-defined asset settings'
    }
}


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class BandInfo:
    """Volatility-adaptive band calculation results"""
    L_band: float          # Lower band (buy threshold)
    H_band: float          # Upper band (sell threshold)
    rolling_volatility: float
    band_width: float
    band_width_pct: float
    volatility_regime: str  # 'low', 'normal', 'high', 'extreme'
    adaptive_multiplier: float


@dataclass
class MomentumInfo:
    """Momentum filter calculation results"""
    state: MomentumState
    score: float           # -1.0 to 1.0
    trend_strength: float  # 0.0 to 1.0
    rsi: Optional[float]
    macd_signal: Optional[str]
    recommendation: str


@dataclass
class RiskInfo:
    """Risk management status"""
    level: RiskLevel
    drawdown_pct: float
    trailing_stop_price: Optional[float]
    position_limit_pct: float
    current_position_pct: float
    warnings: List[str]
    recommendations: List[str]


@dataclass
class TradingSignals:
    """Comprehensive trading signal output"""
    buy_signal: bool
    sell_signal: bool
    buy_price: float
    sell_price: float
    buy_shares: int
    sell_shares: int
    momentum_status: MomentumInfo
    risk_status: RiskInfo
    band_info: BandInfo
    recommendations: List[str]
    trade_quality: str  # 'excellent', 'good', 'fair', 'poor'


# =============================================================================
# Main VR V3.0 Engine Class
# =============================================================================

class VRv3Engine:
    """
    Main VR V3.0 Calculation Engine

    This engine integrates all V3.0 features:
    - Volatility-adaptive trading bands
    - Asset-specific presets and parameters
    - Risk management with trailing stops
    - Momentum-based trade filtering

    Attributes:
        asset_preset (str): Asset type identifier
        enable_momentum_filter (bool): Whether momentum filtering is active
        enable_risk_management (bool): Whether risk management is active
        price_history (List[float]): Historical price data
        peak_price (float): Highest observed price (for drawdown)

    Example:
        >>> engine = VRv3Engine(asset_preset='TQQQ')
        >>> engine.update_price(50.0)
        >>> engine.update_price(51.0)
        >>> signals = engine.get_trading_signals(51.0, 100, 5000.0, 10000.0)
        >>> print(signals.buy_signal)
    """

    def __init__(self,
                 asset_preset: str = 'TQQQ',
                 enable_momentum_filter: bool = True,
                 enable_risk_management: bool = True,
                 custom_settings: Optional[Dict] = None):
        """
        Initialize VR V3 engine

        Args:
            asset_preset: Asset type ('TQQQ', 'UPRO', 'SOXL', 'SPY', 'QQQ', 'CUSTOM')
            enable_momentum_filter: Enable momentum-based trade filtering
            enable_risk_management: Enable trailing stops and position limits
            custom_settings: Custom configuration (used when asset_preset='CUSTOM')

        Raises:
            ValueError: If asset_preset is not recognized
        """
        if asset_preset not in ASSET_PRESETS:
            raise ValueError(f"Unknown asset preset: {asset_preset}. "
                           f"Valid options: {list(ASSET_PRESETS.keys())}")

        self.asset_preset = asset_preset
        self.enable_momentum_filter = enable_momentum_filter
        self.enable_risk_management = enable_risk_management

        # Load asset configuration
        self.config = ASSET_PRESETS[asset_preset].copy()
        if asset_preset == 'CUSTOM' and custom_settings:
            self.config.update(custom_settings)

        # Initialize tracking variables
        self.price_history: List[float] = []
        self.peak_price: float = 0.0
        self.trough_price: float = float('inf')
        self.trailing_stop_price: Optional[float] = None

        # Trading state
        self.last_trade_price: Optional[float] = None
        self.last_trade_type: Optional[str] = None
        self.trade_count: int = 0

    def update_price(self, price: float) -> None:
        """
        Add new price to history and update tracking values

        Args:
            price: Current asset price

        Side Effects:
            - Appends price to price_history
            - Updates peak_price if new high
            - Updates trough_price if new low
            - Recalculates trailing stop if enabled
        """
        if price <= 0:
            raise ValueError("Price must be positive")

        self.price_history.append(price)

        # Update peak and trough
        if price > self.peak_price:
            self.peak_price = price
            # Reset trailing stop on new high
            if self.enable_risk_management:
                self._update_trailing_stop(price)

        if price < self.trough_price:
            self.trough_price = price

    def _update_trailing_stop(self, price: float) -> None:
        """Update trailing stop price based on new high"""
        stop_pct = self.config['trailing_stop_pct']
        self.trailing_stop_price = price * (1 - stop_pct)

    def calculate_rolling_volatility(self, lookback: int = 20) -> float:
        """
        Calculate rolling volatility from price history

        Args:
            lookback: Number of periods for volatility calculation

        Returns:
            Rolling volatility as decimal (e.g., 0.03 for 3%)
        """
        if len(self.price_history) < 2:
            return self.config['base_volatility']

        # Calculate returns
        prices = self.price_history[-lookback:] if len(self.price_history) >= lookback else self.price_history
        returns = []
        for i in range(1, len(prices)):
            if prices[i-1] > 0:
                returns.append((prices[i] - prices[i-1]) / prices[i-1])

        if len(returns) < 2:
            return self.config['base_volatility']

        # Calculate standard deviation
        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        volatility = math.sqrt(variance)

        return max(volatility, 0.001)  # Minimum volatility floor

    def _get_volatility_regime(self, volatility: float) -> str:
        """Determine volatility regime based on current vs base volatility"""
        base_vol = self.config['base_volatility']
        ratio = volatility / base_vol

        if ratio < 0.5:
            return 'low'
        elif ratio < 1.5:
            return 'normal'
        elif ratio < 2.5:
            return 'high'
        else:
            return 'extreme'

    def _calculate_adaptive_multiplier(self, volatility: float) -> float:
        """
        Calculate adaptive band multiplier based on volatility regime

        Higher volatility = wider bands to avoid whipsaws
        Lower volatility = tighter bands for more responsive trading
        """
        base_vol = self.config['base_volatility']
        base_mult = self.config['band_multiplier']

        # Adaptive scaling factor
        vol_ratio = volatility / base_vol

        # Asymmetric adjustment: widen more in high vol, tighten less in low vol
        if vol_ratio > 1.0:
            adjustment = 1.0 + (vol_ratio - 1.0) * 0.5
        else:
            adjustment = 0.8 + vol_ratio * 0.2

        return base_mult * adjustment

    def calculate_adaptive_bands(self, V_target: float, E_calc: float) -> BandInfo:
        """
        Calculate volatility-adaptive trading bands

        The bands adjust based on:
        - Current rolling volatility vs historical baseline
        - Asset-specific volatility characteristics
        - Leverage factor of the asset

        Args:
            V_target: Target portfolio value
            E_calc: Current portfolio equity value

        Returns:
            BandInfo object with L_band, H_band, and diagnostic info

        Example:
            >>> engine = VRv3Engine('TQQQ')
            >>> engine.update_price(50.0)
            >>> bands = engine.calculate_adaptive_bands(10000.0, 10000.0)
            >>> print(f"Buy below: ${bands.L_band:.2f}, Sell above: ${bands.H_band:.2f}")
        """
        # Calculate current volatility
        lookback = self.config.get('momentum_lookback', 20)
        rolling_vol = self.calculate_rolling_volatility(lookback)

        # Get volatility regime and adaptive multiplier
        regime = self._get_volatility_regime(rolling_vol)
        adaptive_mult = self._calculate_adaptive_multiplier(rolling_vol)

        # Base band width (percentage)
        leverage = self.config['leverage']
        base_band_width = rolling_vol * adaptive_mult * leverage

        # Apply minimum and maximum constraints
        min_band_width = 0.02  # 2% minimum
        max_band_width = 0.25  # 25% maximum
        band_width_pct = max(min_band_width, min(max_band_width, base_band_width))

        # Calculate actual bands around target
        # L_band = price at which to buy (below target ratio)
        # H_band = price at which to sell (above target ratio)
        if E_calc > 0:
            ratio = V_target / E_calc
            L_band = V_target * (1 - band_width_pct)
            H_band = V_target * (1 + band_width_pct)
        else:
            L_band = V_target * 0.95
            H_band = V_target * 1.05

        band_width = H_band - L_band

        return BandInfo(
            L_band=L_band,
            H_band=H_band,
            rolling_volatility=rolling_vol,
            band_width=band_width,
            band_width_pct=band_width_pct,
            volatility_regime=regime,
            adaptive_multiplier=adaptive_mult
        )

    def calculate_momentum(self, lookback: Optional[int] = None) -> MomentumInfo:
        """
        Calculate momentum indicators for trade filtering

        Uses multiple signals:
        - Price trend direction
        - Rate of change
        - Simple RSI approximation

        Args:
            lookback: Periods to analyze (defaults to asset config)

        Returns:
            MomentumInfo with state, score, and recommendations
        """
        if lookback is None:
            lookback = self.config.get('momentum_lookback', 20)

        if len(self.price_history) < 3:
            return MomentumInfo(
                state=MomentumState.NEUTRAL,
                score=0.0,
                trend_strength=0.0,
                rsi=50.0,
                macd_signal=None,
                recommendation="Insufficient data for momentum analysis"
            )

        prices = self.price_history[-lookback:] if len(self.price_history) >= lookback else self.price_history

        # Calculate simple momentum score
        if len(prices) >= 2:
            short_ma = sum(prices[-min(5, len(prices)):]) / min(5, len(prices))
            long_ma = sum(prices) / len(prices)
            current = prices[-1]

            # Trend direction
            trend_score = (short_ma - long_ma) / long_ma if long_ma > 0 else 0

            # Rate of change
            roc = (current - prices[0]) / prices[0] if prices[0] > 0 else 0

            # Simple RSI approximation
            gains = []
            losses = []
            for i in range(1, len(prices)):
                change = prices[i] - prices[i-1]
                if change > 0:
                    gains.append(change)
                else:
                    losses.append(abs(change))

            avg_gain = sum(gains) / len(gains) if gains else 0
            avg_loss = sum(losses) / len(losses) if losses else 0.0001
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))

            # Combined momentum score (-1 to 1)
            momentum_score = max(-1.0, min(1.0, trend_score * 10 + roc * 5))

            # Determine state
            if momentum_score > 0.5:
                state = MomentumState.STRONG_BULLISH
            elif momentum_score > 0.2:
                state = MomentumState.BULLISH
            elif momentum_score > -0.2:
                state = MomentumState.NEUTRAL
            elif momentum_score > -0.5:
                state = MomentumState.BEARISH
            else:
                state = MomentumState.STRONG_BEARISH

            # Trend strength (0 to 1)
            trend_strength = abs(momentum_score)

            # Generate recommendation
            if state in [MomentumState.STRONG_BULLISH, MomentumState.BULLISH]:
                rec = "Momentum favors long positions; consider buying dips"
            elif state in [MomentumState.STRONG_BEARISH, MomentumState.BEARISH]:
                rec = "Momentum is negative; consider reducing exposure"
            else:
                rec = "Momentum is neutral; follow standard VR signals"

            return MomentumInfo(
                state=state,
                score=momentum_score,
                trend_strength=trend_strength,
                rsi=rsi,
                macd_signal="bullish" if momentum_score > 0 else "bearish",
                recommendation=rec
            )

        return MomentumInfo(
            state=MomentumState.NEUTRAL,
            score=0.0,
            trend_strength=0.0,
            rsi=50.0,
            macd_signal=None,
            recommendation="Calculating momentum..."
        )

    def calculate_risk_status(self, current_price: float,
                              position_value: float,
                              total_equity: float) -> RiskInfo:
        """
        Calculate current risk status and warnings

        Evaluates:
        - Drawdown from peak
        - Trailing stop status
        - Position concentration

        Args:
            current_price: Current asset price
            position_value: Current position value (shares * price)
            total_equity: Total portfolio equity

        Returns:
            RiskInfo with level, metrics, and recommendations
        """
        warnings = []
        recommendations = []

        # Calculate drawdown
        if self.peak_price > 0:
            drawdown_pct = (self.peak_price - current_price) / self.peak_price
        else:
            drawdown_pct = 0.0

        # Check trailing stop
        trailing_stop = self.trailing_stop_price
        if trailing_stop and current_price < trailing_stop:
            warnings.append(f"Price below trailing stop (${trailing_stop:.2f})")
            recommendations.append("Consider reducing position to limit losses")

        # Position concentration
        max_position_pct = self.config['max_position_pct']
        current_position_pct = position_value / total_equity if total_equity > 0 else 0

        if current_position_pct > max_position_pct:
            warnings.append(f"Position exceeds {max_position_pct*100:.0f}% limit")
            recommendations.append("Consider rebalancing to reduce concentration")

        # Determine risk level
        if drawdown_pct > 0.25 or current_position_pct > max_position_pct * 1.5:
            level = RiskLevel.CRITICAL
        elif drawdown_pct > 0.15 or current_position_pct > max_position_pct:
            level = RiskLevel.HIGH
        elif drawdown_pct > 0.08:
            level = RiskLevel.MODERATE
        else:
            level = RiskLevel.LOW

        if level == RiskLevel.LOW and not recommendations:
            recommendations.append("Risk levels are within normal parameters")

        return RiskInfo(
            level=level,
            drawdown_pct=drawdown_pct,
            trailing_stop_price=trailing_stop,
            position_limit_pct=max_position_pct,
            current_position_pct=current_position_pct,
            warnings=warnings,
            recommendations=recommendations
        )

    def should_execute_trade(self, trade_type: str,
                             current_price: float,
                             position_value: float = 0,
                             total_equity: float = 0) -> Tuple[bool, str]:
        """
        Determine if a trade should be executed based on all V3 filters

        Checks:
        - Momentum filter (if enabled)
        - Risk management constraints (if enabled)
        - Trade quality based on current conditions

        Args:
            trade_type: 'buy' or 'sell'
            current_price: Current asset price
            position_value: Current position value
            total_equity: Total portfolio equity

        Returns:
            Tuple of (should_execute: bool, reason: str)

        Example:
            >>> engine = VRv3Engine('TQQQ')
            >>> should_buy, reason = engine.should_execute_trade('buy', 50.0)
            >>> if should_buy:
            ...     print("Execute buy order")
            ... else:
            ...     print(f"Skip trade: {reason}")
        """
        trade_type = trade_type.lower()
        if trade_type not in ['buy', 'sell']:
            raise ValueError("trade_type must be 'buy' or 'sell'")

        # Check momentum filter
        if self.enable_momentum_filter:
            momentum = self.calculate_momentum()

            if trade_type == 'buy':
                if momentum.state == MomentumState.STRONG_BEARISH:
                    return False, "Momentum filter: Strong bearish trend detected"
                if momentum.state == MomentumState.BEARISH and momentum.rsi and momentum.rsi < 30:
                    return False, "Momentum filter: Oversold but still in downtrend"
            else:  # sell
                if momentum.state == MomentumState.STRONG_BULLISH:
                    return False, "Momentum filter: Strong bullish trend - hold position"

        # Check risk management
        if self.enable_risk_management and total_equity > 0:
            risk = self.calculate_risk_status(current_price, position_value, total_equity)

            if trade_type == 'buy':
                if risk.level == RiskLevel.CRITICAL:
                    return False, "Risk management: Critical risk level - no new buys"
                if risk.current_position_pct >= risk.position_limit_pct:
                    return False, f"Risk management: Position limit ({risk.position_limit_pct*100:.0f}%) reached"
            else:  # sell
                # Trailing stop override - always allow sells below stop
                if risk.trailing_stop_price and current_price < risk.trailing_stop_price:
                    return True, "Risk management: Trailing stop triggered - execute sell"

        return True, "Trade approved by all filters"

    def calculate_v_next(self, V_i: float, pool: float, E_calc: float,
                         G: float, deposit: float = 0) -> float:
        """
        Calculate next target value with V3.0 enhancements

        V_next = V_i * G + (pool contribution) + deposit

        Enhanced with:
        - Volatility-adjusted growth targets
        - Asset-specific growth modifiers

        Args:
            V_i: Current target value
            pool: Current cash pool
            E_calc: Current equity value
            G: Growth rate (e.g., 1.005 for 0.5% growth)
            deposit: Additional deposit amount

        Returns:
            Next target value (V_next)
        """
        # Base calculation
        V_next = V_i * G + deposit

        # Volatility adjustment (optional enhancement)
        if len(self.price_history) >= 5:
            vol = self.calculate_rolling_volatility()
            base_vol = self.config['base_volatility']

            # In high volatility, grow more conservatively
            vol_ratio = vol / base_vol
            if vol_ratio > 1.5:
                # Reduce growth rate slightly in high volatility
                vol_adjustment = 1.0 - (vol_ratio - 1.5) * 0.1
                vol_adjustment = max(0.9, vol_adjustment)
                V_next = V_i * ((G - 1) * vol_adjustment + 1) + deposit

        return V_next

    def get_trading_signals(self, current_price: float, shares: int,
                            pool: float, V_target: float) -> TradingSignals:
        """
        Get comprehensive trading signals with all V3.0 analysis

        This is the main method for getting actionable trading information.

        Args:
            current_price: Current asset price
            shares: Current number of shares held
            pool: Current cash pool balance
            V_target: Current target portfolio value

        Returns:
            TradingSignals object with complete analysis

        Example:
            >>> engine = VRv3Engine('TQQQ')
            >>> for price in [50.0, 49.5, 51.0, 50.5]:
            ...     engine.update_price(price)
            >>> signals = engine.get_trading_signals(50.5, 100, 5000.0, 10000.0)
            >>> if signals.buy_signal:
            ...     print(f"BUY {signals.buy_shares} shares at ${signals.buy_price:.2f}")
            >>> if signals.sell_signal:
            ...     print(f"SELL {signals.sell_shares} shares at ${signals.sell_price:.2f}")
        """
        # Calculate current equity
        position_value = shares * current_price
        total_equity = position_value + pool

        # Get band info
        band_info = self.calculate_adaptive_bands(V_target, total_equity)

        # Get momentum info
        momentum_status = self.calculate_momentum()

        # Get risk info
        risk_status = self.calculate_risk_status(current_price, position_value, total_equity)

        # Determine buy/sell signals
        buy_signal = position_value < band_info.L_band and pool > 0
        sell_signal = position_value > band_info.H_band and shares > 0

        # Calculate trade amounts
        buy_shares = 0
        sell_shares = 0
        buy_price = current_price
        sell_price = current_price

        if buy_signal:
            # Calculate shares to buy to reach target
            target_position = V_target
            shares_needed = (target_position - position_value) / current_price
            max_affordable = pool / current_price
            buy_shares = min(int(shares_needed), int(max_affordable))

        if sell_signal:
            # Calculate shares to sell to reach target
            excess_value = position_value - V_target
            sell_shares = min(int(excess_value / current_price), shares)

        # Check if trades should execute
        recommendations = []

        if buy_signal and buy_shares > 0:
            should_buy, buy_reason = self.should_execute_trade(
                'buy', current_price, position_value, total_equity
            )
            if not should_buy:
                buy_signal = False
                recommendations.append(f"Buy signal filtered: {buy_reason}")

        if sell_signal and sell_shares > 0:
            should_sell, sell_reason = self.should_execute_trade(
                'sell', current_price, position_value, total_equity
            )
            if not should_sell:
                sell_signal = False
                recommendations.append(f"Sell signal filtered: {sell_reason}")

        # Add momentum and risk recommendations
        recommendations.append(momentum_status.recommendation)
        recommendations.extend(risk_status.recommendations)

        # Determine trade quality
        if momentum_status.state in [MomentumState.STRONG_BULLISH] and buy_signal:
            trade_quality = 'excellent'
        elif momentum_status.state in [MomentumState.BULLISH] and buy_signal:
            trade_quality = 'good'
        elif momentum_status.state == MomentumState.NEUTRAL:
            trade_quality = 'fair'
        else:
            trade_quality = 'poor' if buy_signal else 'fair'

        return TradingSignals(
            buy_signal=buy_signal,
            sell_signal=sell_signal,
            buy_price=buy_price,
            sell_price=sell_price,
            buy_shares=buy_shares,
            sell_shares=sell_shares,
            momentum_status=momentum_status,
            risk_status=risk_status,
            band_info=band_info,
            recommendations=recommendations,
            trade_quality=trade_quality
        )

    def get_status_summary(self) -> Dict[str, Any]:
        """
        Get current engine status for UI display

        Returns:
            Dictionary with all current status information suitable for display
        """
        momentum = self.calculate_momentum() if len(self.price_history) >= 3 else None

        return {
            'version': VR_VERSION,
            'asset': self.asset_preset,
            'asset_name': self.config['name'],
            'leverage': self.config['leverage'],
            'price_history_length': len(self.price_history),
            'peak_price': self.peak_price,
            'trough_price': self.trough_price if self.trough_price != float('inf') else None,
            'trailing_stop': self.trailing_stop_price,
            'current_volatility': self.calculate_rolling_volatility() if self.price_history else None,
            'volatility_regime': self._get_volatility_regime(
                self.calculate_rolling_volatility()
            ) if self.price_history else 'unknown',
            'momentum_state': momentum.state.value if momentum else 'unknown',
            'momentum_score': momentum.score if momentum else 0.0,
            'features': {
                'momentum_filter': self.enable_momentum_filter,
                'risk_management': self.enable_risk_management
            },
            'trade_count': self.trade_count
        }

    def reset(self) -> None:
        """Reset engine state (for backtesting or new sessions)"""
        self.price_history = []
        self.peak_price = 0.0
        self.trough_price = float('inf')
        self.trailing_stop_price = None
        self.last_trade_price = None
        self.last_trade_type = None
        self.trade_count = 0


# =============================================================================
# Factory Functions
# =============================================================================

def create_vr_engine(asset: str = 'TQQQ', **kwargs) -> VRv3Engine:
    """
    Factory function to create VR engine with proper settings

    This is the recommended way to create a VRv3Engine instance.

    Args:
        asset: Asset preset name ('TQQQ', 'UPRO', 'SOXL', 'SPY', 'QQQ', 'CUSTOM')
        **kwargs: Additional arguments passed to VRv3Engine

    Returns:
        Configured VRv3Engine instance

    Example:
        >>> engine = create_vr_engine('TQQQ')
        >>> engine = create_vr_engine('SOXL', enable_momentum_filter=False)
        >>> engine = create_vr_engine('CUSTOM', custom_settings={'leverage': 2.0})
    """
    return VRv3Engine(asset_preset=asset, **kwargs)


def get_available_assets() -> List[str]:
    """Get list of available asset presets"""
    return list(ASSET_PRESETS.keys())


def get_asset_info(asset: str) -> Dict[str, Any]:
    """
    Get configuration info for an asset preset

    Args:
        asset: Asset preset name

    Returns:
        Asset configuration dictionary
    """
    if asset not in ASSET_PRESETS:
        raise ValueError(f"Unknown asset: {asset}")
    return ASSET_PRESETS[asset].copy()


# =============================================================================
# Streamlit UI Helper Functions
# =============================================================================

def render_vr_settings_sidebar(st) -> Dict[str, Any]:
    """
    Render VR V3.0 settings in Streamlit sidebar

    Creates a complete settings panel for VR configuration.

    Args:
        st: Streamlit module instance

    Returns:
        Dictionary with all configured settings

    Example:
        >>> import streamlit as st
        >>> from vr_v3_core import render_vr_settings_sidebar
        >>> settings = render_vr_settings_sidebar(st)
        >>> engine = create_vr_engine(**settings)
    """
    st.sidebar.header(f"VR V{VR_VERSION} Settings")

    # Asset selection
    asset = st.sidebar.selectbox(
        "Asset Preset",
        options=list(ASSET_PRESETS.keys()),
        index=0,
        help="Select asset type for optimized parameters"
    )

    # Show asset info
    asset_info = ASSET_PRESETS[asset]
    st.sidebar.caption(f"{asset_info['name']}")
    st.sidebar.caption(f"Leverage: {asset_info['leverage']}x | Base Vol: {asset_info['base_volatility']*100:.1f}%")

    st.sidebar.divider()

    # Feature toggles
    st.sidebar.subheader("V3.0 Features")

    enable_momentum = st.sidebar.checkbox(
        "Enable Momentum Filter",
        value=True,
        help="Filter trades based on momentum signals"
    )

    enable_risk = st.sidebar.checkbox(
        "Enable Risk Management",
        value=True,
        help="Enable trailing stops and position limits"
    )

    # Advanced settings expander
    with st.sidebar.expander("Advanced Settings"):
        if asset == 'CUSTOM':
            custom_leverage = st.number_input("Leverage", 1.0, 5.0, 1.0)
            custom_vol = st.number_input("Base Volatility", 0.01, 0.10, 0.02)
            custom_settings = {
                'leverage': custom_leverage,
                'base_volatility': custom_vol
            }
        else:
            custom_settings = None

        # Display current parameters
        st.caption("Current Parameters:")
        st.json({
            'band_multiplier': asset_info['band_multiplier'],
            'trailing_stop': f"{asset_info['trailing_stop_pct']*100:.0f}%",
            'max_position': f"{asset_info['max_position_pct']*100:.0f}%"
        })

    return {
        'asset': asset,
        'enable_momentum_filter': enable_momentum,
        'enable_risk_management': enable_risk,
        'custom_settings': custom_settings if asset == 'CUSTOM' else None
    }


def render_vr_status_metrics(st, engine: VRv3Engine, current_price: float) -> None:
    """
    Render VR status metrics in Streamlit

    Displays current engine status in a clean metrics format.

    Args:
        st: Streamlit module instance
        engine: VRv3Engine instance
        current_price: Current asset price
    """
    status = engine.get_status_summary()

    # Header
    st.subheader(f"VR V{status['version']} Status")

    # Main metrics row
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric(
            "Asset",
            status['asset'],
            f"{status['leverage']}x leverage"
        )

    with col2:
        if status['current_volatility']:
            vol_pct = status['current_volatility'] * 100
            st.metric(
                "Volatility",
                f"{vol_pct:.1f}%",
                status['volatility_regime']
            )
        else:
            st.metric("Volatility", "N/A")

    with col3:
        st.metric(
            "Momentum",
            status['momentum_state'].replace('_', ' ').title(),
            f"Score: {status['momentum_score']:.2f}"
        )

    with col4:
        if status['trailing_stop']:
            st.metric(
                "Trailing Stop",
                f"${status['trailing_stop']:.2f}",
                f"Peak: ${status['peak_price']:.2f}"
            )
        else:
            st.metric("Trailing Stop", "Not set")

    # Feature status
    st.caption(
        f"Features: Momentum Filter {'ON' if status['features']['momentum_filter'] else 'OFF'} | "
        f"Risk Management {'ON' if status['features']['risk_management'] else 'OFF'}"
    )


def render_trading_signals_panel(st, signals: TradingSignals) -> None:
    """
    Render trading signals panel in Streamlit

    Args:
        st: Streamlit module instance
        signals: TradingSignals from engine.get_trading_signals()
    """
    st.subheader("Trading Signals")

    # Signal indicators
    col1, col2 = st.columns(2)

    with col1:
        if signals.buy_signal:
            st.success(f"BUY {signals.buy_shares} shares @ ${signals.buy_price:.2f}")
        else:
            st.info("No buy signal")

    with col2:
        if signals.sell_signal:
            st.warning(f"SELL {signals.sell_shares} shares @ ${signals.sell_price:.2f}")
        else:
            st.info("No sell signal")

    # Band information
    st.caption(
        f"Bands: L=${signals.band_info.L_band:.2f} | H=${signals.band_info.H_band:.2f} | "
        f"Width: {signals.band_info.band_width_pct*100:.1f}%"
    )

    # Trade quality indicator
    quality_colors = {
        'excellent': 'green',
        'good': 'blue',
        'fair': 'orange',
        'poor': 'red'
    }
    st.markdown(f"Trade Quality: **:{quality_colors[signals.trade_quality]}[{signals.trade_quality.upper()}]**")

    # Recommendations
    with st.expander("Recommendations"):
        for rec in signals.recommendations:
            st.write(f"- {rec}")


# =============================================================================
# Utility Functions
# =============================================================================

def format_currency(value: float) -> str:
    """Format value as currency string"""
    return f"${value:,.2f}"


def format_percent(value: float) -> str:
    """Format decimal as percentage string"""
    return f"{value*100:.2f}%"


def calculate_position_size(pool: float, current_price: float,
                           risk_per_trade: float = 0.02) -> int:
    """
    Calculate position size based on risk parameters

    Args:
        pool: Available cash
        current_price: Current asset price
        risk_per_trade: Maximum risk per trade (default 2%)

    Returns:
        Number of shares to trade
    """
    max_position = pool * risk_per_trade
    shares = int(max_position / current_price)
    return max(0, shares)


# =============================================================================
# Example Usage and Testing
# =============================================================================

if __name__ == "__main__":
    """
    Example usage demonstrating VR V3.0 functionality
    """
    print(f"VR V{VR_VERSION} - {VR_VERSION_NAME}")
    print("=" * 50)

    # Create engine
    engine = create_vr_engine('TQQQ')
    print(f"\nCreated engine for: {engine.config['name']}")
    print(f"Leverage: {engine.config['leverage']}x")
    print(f"Base volatility: {engine.config['base_volatility']*100:.1f}%")

    # Simulate some price data
    sample_prices = [50.0, 49.5, 48.0, 49.0, 51.0, 52.0, 51.5, 50.0, 49.0, 50.5,
                     51.0, 52.5, 53.0, 52.0, 51.0, 50.0, 49.5, 50.0, 51.5, 52.0]

    print(f"\nProcessing {len(sample_prices)} price points...")
    for price in sample_prices:
        engine.update_price(price)

    # Get current status
    status = engine.get_status_summary()
    print(f"\nCurrent Status:")
    print(f"  Volatility: {status['current_volatility']*100:.2f}%")
    print(f"  Volatility Regime: {status['volatility_regime']}")
    print(f"  Momentum: {status['momentum_state']} (score: {status['momentum_score']:.2f})")
    print(f"  Peak Price: ${status['peak_price']:.2f}")
    print(f"  Trailing Stop: ${status['trailing_stop']:.2f}" if status['trailing_stop'] else "  Trailing Stop: Not set")

    # Get trading signals
    current_price = sample_prices[-1]
    signals = engine.get_trading_signals(
        current_price=current_price,
        shares=100,
        pool=5000.0,
        V_target=10000.0
    )

    print(f"\nTrading Signals (at ${current_price:.2f}):")
    print(f"  Buy Signal: {signals.buy_signal}")
    print(f"  Sell Signal: {signals.sell_signal}")
    print(f"  Band Width: {signals.band_info.band_width_pct*100:.1f}%")
    print(f"  Trade Quality: {signals.trade_quality}")

    print(f"\nRecommendations:")
    for rec in signals.recommendations:
        print(f"  - {rec}")

    # Test trade execution check
    should_buy, reason = engine.should_execute_trade('buy', current_price, 5000, 10000)
    print(f"\nShould execute buy: {should_buy}")
    print(f"Reason: {reason}")

    print("\n" + "=" * 50)
    print("VR V3.0 Engine test complete")

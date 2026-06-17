import numpy as np
import pandas as pd

def calculate_normalized_resonator(
    close: pd.Series,
    center_period: int = 20,
    bandwidth: float = 0.2,
    lookback_mult: float = 1.0,
    signal_line_period: int = 5,
    overbought: float = 0.8,
    oversold: float = -0.8
) -> pd.DataFrame:
    """
    LuxAlgo - Normalized Resonator
    O(N) Vectorized Implementation
    """
    df = pd.DataFrame({'close': close})
    N = len(df)
    
    if N == 0:
        return pd.DataFrame()

    c = df['close'].values

    # Digital Signal Processing - Resonator Filter (2-pole bandpass)
    # Convert period and bandwidth to radians
    f = np.sqrt(2.0) * np.pi / center_period
    a1 = np.exp(-np.sqrt(2.0) * np.pi * bandwidth / center_period)
    b1 = 2.0 * a1 * np.cos(f)
    b2 = -a1 * a1
    coef2 = b2 + 1.0
    coef1 = 1.0 - coef2

    filt = np.zeros(N)
    
    # Needs sequential O(N) since IIR filter depends on previous states
    for i in range(2, N):
        filt[i] = 0.5 * coef1 * (c[i] - c[i-2]) + b1 * filt[i-1] + b2 * filt[i-2]

    # Energy normalizer: maximum absolute value rolling window
    lookback = max(2, int(center_period * lookback_mult))
    filt_abs = np.abs(filt)
    
    # Compute rolling max on absolute filter output
    rolling_max_abs = pd.Series(filt_abs).rolling(window=lookback, min_periods=1).max().values
    
    # Avoid division by zero
    rolling_max_abs = np.where(rolling_max_abs == 0, 1.0, rolling_max_abs)
    
    # Normalize the resonator output
    resonator_line = filt / rolling_max_abs
    
    # EMA Signal Line
    # pandas EWM allows fast O(N) EMA calculation
    alpha = 2.0 / (signal_line_period + 1.0)
    signal_line = pd.Series(resonator_line).ewm(alpha=alpha, adjust=False).mean().values
    
    # Signal generation logic (Historical bars only to prevent repainting)
    # We look at i-1 crossing to generate signal for row i
    
    prev_resonator = np.roll(resonator_line, 1)
    prev_signal = np.roll(signal_line, 1)
    
    prev_resonator[0] = 0.0
    prev_signal[0] = 0.0
    
    prev2_resonator = np.roll(resonator_line, 2)
    prev2_signal = np.roll(signal_line, 2)
    
    prev2_resonator[:2] = 0.0
    prev2_signal[:2] = 0.0
    
    # Bullish cross happens if prev2 < prev2_signal and prev > prev_signal
    cross_above = (prev2_resonator <= prev2_signal) & (prev_resonator > prev_signal)
    
    # Bearish cross happens if prev2 > prev2_signal and prev < prev_signal
    cross_below = (prev2_resonator >= prev2_signal) & (prev_resonator < prev_signal)
    
    # Buy signal logic
    buy_signal = cross_above & (prev_resonator < oversold)
    
    # Sell signal logic
    sell_signal = cross_below & (prev_resonator > overbought)
    
    df['resonator_line'] = resonator_line
    df['resonator_signal_line'] = signal_line
    df['resonator_buy'] = buy_signal
    df['resonator_sell'] = sell_signal

    return df[['resonator_line', 'resonator_signal_line', 'resonator_buy', 'resonator_sell']]

# Example execution test wrapper:
if __name__ == '__main__':
    # Test data simulation
    print("Testing Normalized Resonator O(N) Logic...")
    sample_close = pd.Series(np.cumsum(np.random.randn(1000)))
    result = calculate_normalized_resonator(sample_close)
    print(result.tail())
    print("Test Complete.")

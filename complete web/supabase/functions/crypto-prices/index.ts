const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known stock symbols
const stockSymbols = new Set([
  'AAPL', 'TSLA', 'GOOGL', 'GOOG', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX',
  'AMD', 'INTC', 'ORCL', 'IBM', 'CRM', 'ADBE', 'PYPL', 'SQ', 'SHOP', 'UBER',
  'LYFT', 'ABNB', 'COIN', 'HOOD', 'PLTR', 'SNOW', 'NET', 'DDOG', 'ZS', 'CRWD',
  'DIS', 'WMT', 'TGT', 'COST', 'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'KO', 'PEP',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP', 'BRK.A', 'BRK.B',
  'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'LLY', 'BMY', 'GILD', 'AMGN', 'MRNA',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'BA', 'LMT', 'RTX', 'GE', 'CAT', 'DE',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'ARKK', 'XLF', 'XLE', 'XLK'
]);

// Map common symbols to CoinGecko IDs
const cryptoSymbolToId: Record<string, string> = {
  'btc': 'bitcoin',
  'bitcoin': 'bitcoin',
  'eth': 'ethereum',
  'ethereum': 'ethereum',
  'sol': 'solana',
  'solana': 'solana',
  'xrp': 'ripple',
  'ripple': 'ripple',
  'ada': 'cardano',
  'cardano': 'cardano',
  'doge': 'dogecoin',
  'dogecoin': 'dogecoin',
  'bnb': 'binancecoin',
  'dot': 'polkadot',
  'polkadot': 'polkadot',
  'matic': 'matic-network',
  'polygon': 'matic-network',
  'link': 'chainlink',
  'chainlink': 'chainlink',
  'avax': 'avalanche-2',
  'avalanche': 'avalanche-2',
  'ltc': 'litecoin',
  'litecoin': 'litecoin',
  'uni': 'uniswap',
  'uniswap': 'uniswap',
  'atom': 'cosmos',
  'cosmos': 'cosmos',
  'xlm': 'stellar',
  'stellar': 'stellar',
  'shib': 'shiba-inu',
  'pepe': 'pepe',
  'sui': 'sui',
  'apt': 'aptos',
  'aptos': 'aptos',
  'arb': 'arbitrum',
  'arbitrum': 'arbitrum',
  'op': 'optimism',
  'optimism': 'optimism',
};

async function fetchCryptoData(symbol: string, days: number) {
  const coinId = cryptoSymbolToId[symbol.toLowerCase()] || symbol.toLowerCase();
  
  console.log(`Fetching crypto data for: ${coinId} (${days} days)`);

  // Fetch market chart data from CoinGecko
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('CoinGecko API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limited. Please try again in a moment.');
    }
    
    throw new Error(`Failed to fetch crypto data for ${symbol}. Asset may not be supported.`);
  }

  const data = await response.json();

  // Also fetch OHLC data for more detailed analysis
  const ohlcResponse = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  let ohlcData: number[][] = [];
  if (ohlcResponse.ok) {
    ohlcData = await ohlcResponse.json();
  }

  // Transform data for charts
  const priceData = data.prices.map((item: [number, number], index: number) => {
    const timestamp = item[0];
    const price = item[1];
    const volume = data.total_volumes[index]?.[1] || 0;
    
    // Find corresponding OHLC data
    const ohlc = ohlcData.find((o: number[]) => Math.abs(o[0] - timestamp) < 86400000);
    
    return {
      timestamp,
      date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Number(price.toFixed(price < 1 ? 6 : 2)),
      open: ohlc ? Number(ohlc[1].toFixed(price < 1 ? 6 : 2)) : price,
      high: ohlc ? Number(ohlc[2].toFixed(price < 1 ? 6 : 2)) : price * 1.01,
      low: ohlc ? Number(ohlc[3].toFixed(price < 1 ? 6 : 2)) : price * 0.99,
      close: ohlc ? Number(ohlc[4].toFixed(price < 1 ? 6 : 2)) : price,
      volume: Math.round(volume),
    };
  });

  const currentPrice = priceData[priceData.length - 1]?.price || 0;
  const previousPrice = priceData[priceData.length - 2]?.price || currentPrice;
  const priceChange24h = ((currentPrice - previousPrice) / previousPrice * 100).toFixed(2);

  console.log(`Successfully fetched ${priceData.length} crypto data points for ${coinId}`);

  return {
    success: true,
    symbol: symbol.toUpperCase(),
    assetType: 'crypto',
    coinId,
    currentPrice,
    priceChange24h: Number(priceChange24h),
    data: priceData,
  };
}

async function fetchStockData(symbol: string, days: number) {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  
  if (!rapidApiKey) {
    console.log('RAPIDAPI_KEY not configured, using fallback stock data');
    return generateFallbackStockData(symbol, days);
  }

  console.log(`Fetching stock data for: ${symbol} (${days} days)`);

  try {
    // Use Yahoo Finance API via RapidAPI
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (days * 24 * 60 * 60);

    const response = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/history?symbol=${symbol}&interval=1d&diffandsplits=false`,
      {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Yahoo Finance API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limited. Please try again in a moment.');
      }
      
      // Fall back to simulated data
      console.log('Falling back to simulated stock data');
      return generateFallbackStockData(symbol, days);
    }

    const data = await response.json();
    
    if (!data.body || Object.keys(data.body).length === 0) {
      console.log('No stock data returned, using fallback');
      return generateFallbackStockData(symbol, days);
    }

    // Transform Yahoo Finance data
    const entries = Object.entries(data.body).slice(-days);
    const priceData = entries.map(([dateStr, values]: [string, any]) => {
      const timestamp = new Date(dateStr).getTime();
      return {
        timestamp,
        date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: Number(values.close?.toFixed(2) || 0),
        open: Number(values.open?.toFixed(2) || 0),
        high: Number(values.high?.toFixed(2) || 0),
        low: Number(values.low?.toFixed(2) || 0),
        close: Number(values.close?.toFixed(2) || 0),
        volume: Math.round(values.volume || 0),
      };
    });

    // Sort by date ascending
    priceData.sort((a, b) => a.timestamp - b.timestamp);

    const currentPrice = priceData[priceData.length - 1]?.price || 0;
    const previousPrice = priceData[priceData.length - 2]?.price || currentPrice;
    const priceChange24h = previousPrice ? ((currentPrice - previousPrice) / previousPrice * 100).toFixed(2) : '0';

    console.log(`Successfully fetched ${priceData.length} stock data points for ${symbol}`);

    return {
      success: true,
      symbol: symbol.toUpperCase(),
      assetType: 'stock',
      currentPrice,
      priceChange24h: Number(priceChange24h),
      data: priceData,
    };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return generateFallbackStockData(symbol, days);
  }
}

function generateFallbackStockData(symbol: string, days: number) {
  console.log(`Generating fallback stock data for ${symbol}`);
  
  // Base prices for known stocks (approximate current prices)
  const basePrices: Record<string, number> = {
    'AAPL': 175, 'TSLA': 250, 'GOOGL': 140, 'GOOG': 140, 'MSFT': 380,
    'AMZN': 180, 'NVDA': 480, 'META': 500, 'NFLX': 620, 'AMD': 120,
    'INTC': 45, 'ORCL': 125, 'IBM': 175, 'CRM': 280, 'ADBE': 530,
    'JPM': 195, 'BAC': 38, 'WFC': 55, 'GS': 430, 'V': 280, 'MA': 450,
    'JNJ': 160, 'PFE': 28, 'UNH': 530, 'DIS': 95, 'WMT': 165,
    'SPY': 500, 'QQQ': 430, 'DEFAULT': 100,
  };

  const basePrice = basePrices[symbol.toUpperCase()] || basePrices['DEFAULT'];
  const priceData = [];
  let currentPrice = basePrice;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate price movement with some volatility
    const change = (Math.random() - 0.48) * (basePrice * 0.02); // Slight upward bias
    currentPrice = Math.max(currentPrice + change, basePrice * 0.7);
    
    const volatility = basePrice * 0.01;
    const high = currentPrice + Math.random() * volatility;
    const low = currentPrice - Math.random() * volatility;
    const open = currentPrice + (Math.random() - 0.5) * volatility;
    
    priceData.push({
      timestamp: date.getTime(),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Number(currentPrice.toFixed(2)),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(currentPrice.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000) + 10000000,
    });
  }

  const latestPrice = priceData[priceData.length - 1]?.price || basePrice;
  const previousPrice = priceData[priceData.length - 2]?.price || latestPrice;
  const priceChange24h = ((latestPrice - previousPrice) / previousPrice * 100).toFixed(2);

  return {
    success: true,
    symbol: symbol.toUpperCase(),
    assetType: 'stock',
    isSimulated: true,
    currentPrice: latestPrice,
    priceChange24h: Number(priceChange24h),
    data: priceData,
  };
}

function isStock(symbol: string): boolean {
  return stockSymbols.has(symbol.toUpperCase());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, days = 30 } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const upperSymbol = symbol.toUpperCase();
    let result;

    if (isStock(upperSymbol)) {
      result = await fetchStockData(upperSymbol, days);
    } else {
      result = await fetchCryptoData(symbol, days);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching price data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch price data';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

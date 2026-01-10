import React from 'react';
import { ExternalLink, BarChart3, Building2, TrendingUp, DollarSign } from 'lucide-react';
import { getAssetInfo } from '../config/assets';

export function StockInfoDisplay({ symbol, className = '' }) {
  if (!symbol) {
    return null;
  }

  const assetInfo = getAssetInfo(symbol);

  const handleInfoLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Asset Info */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: assetInfo?.color || '#6B7280' }}
          >
            {symbol}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {assetInfo?.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {assetInfo?.description}
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                {assetInfo?.leverage}
              </span>
              <span className="text-sm text-gray-500">
                Tracks: {assetInfo?.underlying}
              </span>
            </div>
          </div>
        </div>

        {/* External Information Links */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            실시간 정보 및 차트 보기
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {assetInfo?.infoLinks?.map((link, index) => (
              <button
                key={index}
                onClick={() => handleInfoLink(link.url)}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: link.color }}
                  >
                    {link.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {link.name}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            실시간 가격, 차트, 분석 정보를 확인하려면 위 링크를 클릭하세요.
          </p>
        </div>
      </div>

      {/* Asset Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ETF Details */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            ETF 상세 정보
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">레버리지:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {assetInfo?.leverage}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">기초자산:</span>
              <span className="font-medium">{assetInfo?.underlying}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">비용 비율:</span>
              <span className="font-medium">{assetInfo?.expense_ratio}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">평균 거래량:</span>
              <span className="font-medium">{assetInfo?.avg_volume}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">변동성:</span>
              <span className={`font-medium ${
                assetInfo?.volatility === 'Very High' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {assetInfo?.volatility}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">카테고리:</span>
              <span className="font-medium">{assetInfo?.category}</span>
            </div>
          </div>
        </div>

        {/* VR Strategy Notes */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            VR 전략 참고사항
          </h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>높은 변동성:</strong> Value Rebalancing 전략에 적합한 자산입니다.
              </p>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>레버리지 효과:</strong> {assetInfo?.leverage} 레버리지로 인해 수익과 손실이 증폭됩니다.
              </p>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>리밸런싱:</strong> 변동성이 큰 시장에서 정기적인 리밸런싱이 위험 관리에 도움됩니다.
              </p>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>G 파라미터:</strong> 시장 상황에 따라 G 값을 조정하여 최적화하세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              실시간 가격 정보
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              위의 외부 링크를 통해 실시간 가격, 차트, 그리고 상세한 시장 분석 정보를 확인할 수 있습니다.
              VR 시뮬레이션에서는 백테스팅용 데이터를 사용하며, 실제 투자 결정 시에는 최신 시장 정보를 참고하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

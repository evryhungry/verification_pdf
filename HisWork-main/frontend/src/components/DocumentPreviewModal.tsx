import React from 'react';

interface CoordinateField {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'table';
  value?: string;
  required?: boolean;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfImageUrl: string;
  coordinateFields: CoordinateField[];
  documentTitle?: string;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfImageUrl,
  coordinateFields,
  documentTitle = "문서 미리보기"
}) => {
  // Hook들을 항상 호출 (조건문 이전에)
  const [scale, setScale] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0, initialScale: 1 });

  // ESC 키로 모달 닫기
  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 조건부 렌더링은 Hook 호출 이후에
  if (!isOpen) return null;

  // 마우스 드래그로 줌 조절
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === e.currentTarget) { // 왼쪽 마우스 버튼만, PDF 영역에서만
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        initialScale: scale
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaY = e.clientY - dragStart.y;
    const scaleDelta = deltaY * 0.003; // 드래그 감도 조정
    const newScale = Math.max(0.3, Math.min(2.5, dragStart.initialScale + scaleDelta));
    
    setScale(newScale);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 줌 리셋
  const resetZoom = () => {
    setScale(1);
  };

  // 줌 버튼들
  const zoomIn = () => {
    setScale(prev => Math.min(2.5, prev + 0.1));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.3, prev - 0.1));
  };

  // 모달 배경 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{documentTitle}</h2>
            <p className="text-sm text-gray-500 mt-1">최종 출력 미리보기</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 줌 컨트롤 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <button
                onClick={zoomOut}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="축소 (30%~250%)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[4rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="확대 (30%~250%)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={resetZoom}
                className="ml-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="원본 크기로 리셋"
              >
                리셋
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              인쇄
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 모달 본문 - PDF 미리보기 */}
        <div 
          className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center items-start"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div 
            className="relative bg-white shadow-lg select-none"
            style={{
              width: `${1240 * scale}px`,
              height: `${1754 * scale}px`,
              minWidth: `${1240 * scale}px`,
              minHeight: `${1754 * scale}px`,
              flexShrink: 0,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {/* PDF 배경 이미지 */}
            <img 
              src={pdfImageUrl}
              alt="Document Preview"
              className="absolute inset-0 w-full h-full object-contain"
              onError={() => {
                console.error('PDF 이미지 로드 실패:', pdfImageUrl);
              }}
            />
            
            {/* 필드 컨테이너 */}
            <div className="absolute inset-0"
            >
              {/* 디버깅용 - 모든 필드 표시 (개발 모드에서만, 그리고 환경변수로 제어) */}
              {import.meta.env.DEV && import.meta.env.VITE_DEBUG_FIELDS === 'true' && (
                <>
                  {coordinateFields.map((field) => (
                    <div
                      key={`debug-${field.id}`}
                      className="absolute border-2 border-dashed border-blue-400 bg-blue-100 bg-opacity-20 flex items-center justify-center"
                      style={{
                        left: `${(field.x / 1240) * 100}%`,
                        top: `${(field.y / 1754) * 100}%`,
                        width: `${(field.width / 1240) * 100}%`,
                        height: `${(field.height / 1754) * 100}%`,
                      }}
                    >
                      <span className="text-xs text-blue-600 font-medium bg-white px-1 rounded">
                        {field.label} ({field.x},{field.y})
                      </span>
                    </div>
                  ))}
                </>
              )}
              
              {/* 필드 값들을 자연스럽게 오버레이 - 테두리나 배경 없이 */}
              {coordinateFields
                .filter(field => field.value && field.value.trim() !== '') // 값이 있는 필드만 표시
                .map((field) => {
                  console.log('🎯 미리보기 모달 - 필드 렌더링:', {
                    id: field.id,
                    label: field.label,
                    x: field.x,
                    y: field.y,
                    width: field.width,
                    height: field.height,
                    value: field.value
                  });
                  
                  // 퍼센트 기반 위치 계산
                  const leftPercent = (field.x / 1240) * 100;
                  const topPercent = (field.y / 1754) * 100;
                  const widthPercent = (field.width / 1240) * 100;
                  const heightPercent = (field.height / 1754) * 100;
                  
                  return (
                    <div
                      key={field.id}
                      className="absolute flex items-center"
                      style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        width: `${widthPercent}%`,
                        height: `${heightPercent}%`,
                      }}
                    >
                      <div 
                        className="text-gray-900 font-medium leading-tight w-full"
                        style={{
                          fontSize: `${Math.max(Math.min(field.height * 0.6 * scale, 16 * scale), 8 * scale)}px`, // 스케일에 맞춰 폰트 크기 조정
                          lineHeight: '1.2',
                          textAlign: 'center',
                          overflow: 'hidden',
                          wordBreak: 'keep-all',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {field.value}
                      </div>
                    </div>
                  );
                })}
              
              {/* 빈 필드 표시 (디버깅 목적으로만 환경변수로 제어) */}
              {import.meta.env.DEV && import.meta.env.VITE_DEBUG_FIELDS === 'true' && (
                <>
                  {coordinateFields
                    .filter(field => !field.value || field.value.trim() === '')
                    .map((field) => (
                      <div
                        key={`empty-${field.id}`}
                        className="absolute border border-dashed border-red-300 bg-red-50 bg-opacity-20 flex items-center justify-center"
                        style={{
                          left: field.x,
                          top: field.y,
                          width: field.width,
                          height: field.height,
                        }}
                      >
                        <span className="text-xs text-red-400 font-medium">
                          {field.label} (빈 필드)
                        </span>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-600">
              입력된 필드: {coordinateFields.filter(f => f.value?.trim()).length} / {coordinateFields.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;

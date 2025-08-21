import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface CoordinateField {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'signature' | 'table';
  value?: string;
  placeholder?: string;
  required?: boolean;
  // 서명 필드를 위한 추가 속성들
  reviewerEmail?: string; // 서명할 검토자의 이메일
  signatureData?: string; // 실제 서명 데이터 (base64 이미지)
  // 스타일 속성들
  fontSize?: number;
  fontColor?: string;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  // 표 필드 속성들
  tableId?: string;
  rows?: number;
  columnsCount?: number;
  columns?: Array<{
    title: string;
    width: number; // px
    height?: number; // px
    width_ratio?: string;
    location_column: string;
  }>;
}

interface PdfViewerProps {
  pdfImageUrl: string;
  coordinateFields: CoordinateField[];
  onCoordinateFieldsChange: (fields: CoordinateField[]) => void;
  onFieldSelect?: (field: CoordinateField | null) => void; // 필드 선택 이벤트
  selectedFieldId?: string | null; // 현재 선택된 필드 ID
  editable?: boolean; // true for template editing, false for document editing
  showFieldUI?: boolean; // true to show field backgrounds, borders, etc. (for signature fields)
  scale?: number;
  // 필드 생성 관련 props
  onAddField?: (x: number, y: number) => void; // 필드 추가 버튼 클릭 시 호출
  // 서명 필드 관련 props
  isAddingSignatureField?: boolean; // 서명 필드 추가 모드
  onSignaturePositionSelect?: (field: CoordinateField) => void; // 서명 위치 선택 콜백
  signatureFields?: Array<{
    id: string;
    reviewerEmail: string;
    reviewerName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    signatureData?: string; // 실제 서명 데이터 (base64 이미지)
  }>; // 서명 필드 목록
  // 서명 필드 편집 관련 props
  editingSignatureFieldId?: string | null; // 현재 편집 중인 서명 필드 ID
  onSignatureFieldUpdate?: (fieldId: string, updates: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>) => void; // 서명 필드 업데이트 콜백
  onSignatureFieldSelect?: (signatureField: {
    id: string;
    reviewerEmail: string;
    reviewerName: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null) => void; // 서명 필드 선택 콜백
  // 표 데이터 관련 props
  tableData?: Array<{
    tableId: string;
    value: string;
    location_column: string;
    location_row: string;
  }>; // 표 셀 데이터
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfImageUrl,
  coordinateFields,
  onCoordinateFieldsChange,
  onFieldSelect,
  selectedFieldId,
  editable = false,
  showFieldUI = false,
  scale = 1,
  onAddField,
  isAddingSignatureField = false,
  onSignaturePositionSelect,
  signatureFields = [],
  editingSignatureFieldId = null,
  onSignatureFieldUpdate,
  onSignatureFieldSelect,
  tableData = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isDraggingField, setIsDraggingField] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [resizeStartData, setResizeStartData] = useState<{ 
    field: CoordinateField; 
    startX: number; 
    startY: number; 
  } | null>(null);
  // 삭제된 사용되지 않는 상태 (경고 제거)
  // const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  // const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number } | null>(null);
  const [cursorStyle, setCursorStyle] = useState<string>('default');
  // 표 컬럼 리사이즈 상태
  // 표 컬럼 리사이즈 상태 (미사용 - 추후 확장)
  // const [isResizingTableColumn, setIsResizingTableColumn] = useState(false);
  // const [resizingTableFieldId, setResizingTableFieldId] = useState<string | null>(null);
  // const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
  // const [tableResizeStartX, setTableResizeStartX] = useState<number | null>(null);

  // 서명 필드 편집 관련 상태
  const [isDraggingSignatureField, setIsDraggingSignatureField] = useState(false);
  const [draggedSignatureFieldId, setDraggedSignatureFieldId] = useState<string | null>(null);
  const [signatureFieldDragOffset, setSignatureFieldDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isResizingSignatureField, setIsResizingSignatureField] = useState(false);
  const [resizingSignatureFieldId, setResizingSignatureFieldId] = useState<string | null>(null);
  const [signatureFieldResizeStartData, setSignatureFieldResizeStartData] = useState<{
    field: { x: number; y: number; width: number; height: number };
    startX: number;
    startY: number;
  } | null>(null);

  // 동기적 드래그 처리를 위한 로컬 변수
  const dragStateRef = useRef({
    isDraggingSignatureField: false,
    draggedSignatureFieldId: null as string | null,
    signatureFieldDragOffset: null as { x: number; y: number } | null
  });

  // 마우스 좌표를 이미지 좌표로 변환하는 함수
  const getImageCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // Canvas의 실제 표시 크기와 내부 해상도의 비율 계산
    const scaleX = imageDimensions.width / rect.width;
    const scaleY = imageDimensions.height / rect.height;

    // 이미지 좌표로 변환
    const imageX = canvasX * scaleX;
    const imageY = canvasY * scaleY;

    // 디버깅용 로그 (개발 중에만 출력)
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('좌표 변환:', {
    //     clientX, clientY,
    //     canvasX, canvasY,
    //     scaleX, scaleY,
    //     imageX, imageY,
    //     canvasRect: rect,
    //     imageDimensions
    //   });
    // }

    return { x: imageX, y: imageY };
  };

  // 리사이즈 핸들 크기
  const RESIZE_HANDLE_SIZE = 8;

  // 리사이즈 핸들 영역 체크
  const isInResizeHandle = (x: number, y: number, field: CoordinateField) => {
    return x >= field.x + field.width - RESIZE_HANDLE_SIZE && 
           x <= field.x + field.width && 
           y >= field.y + field.height - RESIZE_HANDLE_SIZE && 
           y <= field.y + field.height;
  };

  // 서명 필드 리사이즈 핸들 영역 체크
  const isInSignatureFieldResizeHandle = (x: number, y: number, field: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    return x >= field.x + field.width - RESIZE_HANDLE_SIZE && 
           x <= field.x + field.width && 
           y >= field.y + field.height - RESIZE_HANDLE_SIZE && 
           y <= field.y + field.height;
  };

  // 리사이즈 핸들 찾기
  const findResizeHandle = (x: number, y: number) => {
    const selectedField = coordinateFields.find(field => field.id === selectedFieldId);
    if (selectedField && isInResizeHandle(x, y, selectedField)) {
      return selectedField;
    }
    return null;
  };

  // 서명 필드 리사이즈 핸들 찾기
  const findSignatureFieldResizeHandle = (x: number, y: number) => {
    // 모든 서명 필드에서 리사이즈 핸들 찾기
    for (const field of signatureFields) {
      if (isInSignatureFieldResizeHandle(x, y, field)) {
        return field;
      }
    }
    return null;
  };

  // PDF 이미지 URL이 변경될 때 모든 내부 상태 초기화
  useEffect(() => {
    console.log('🔄 PDF 이미지 URL 변경 - 모든 내부 상태 초기화');
    
    // 이미지 관련 상태 초기화
    setImageLoaded(false);
    setImageError(null);
    
    // 드래그 관련 상태 초기화
    setIsDraggingField(false);
    setDraggedFieldId(null);
    setDragOffset(null);
    
    // 리사이즈 관련 상태 초기화
    setIsResizing(false);
    setResizingFieldId(null);
    setResizeStartData(null);
    setCursorStyle('default');
    
    // 서명 필드 관련 상태 초기화
    setIsDraggingSignatureField(false);
    setDraggedSignatureFieldId(null);
    setSignatureFieldDragOffset(null);
    setIsResizingSignatureField(false);
    setResizingSignatureFieldId(null);
    setSignatureFieldResizeStartData(null);
    
    // 드래그 상태 ref 초기화
    dragStateRef.current = {
      isDraggingSignatureField: false,
      draggedSignatureFieldId: null,
      signatureFieldDragOffset: null
    };
    
    console.log('🧹 PdfViewer 내부 상태 초기화 완료');
  }, [pdfImageUrl]);

  // coordinateFields가 변경될 때도 내부 상태 초기화 (문서 변경 시)
  useEffect(() => {
    console.log('🔄 PdfViewer - coordinateFields 변경:', {
      fieldsCount: coordinateFields.length,
      fields: coordinateFields.map(f => ({ id: f.id, label: f.label, type: f.type, x: f.x, y: f.y })),
      isDraggingField,
      isResizing,
      isDraggingSignatureField,
      isResizingSignatureField
    });
    
    // 드래그나 리사이즈 중일 때는 초기화하지 않음
    if (isDraggingField || isResizing || isDraggingSignatureField || isResizingSignatureField) {
      console.log('🔄 coordinateFields 변경 - 편집 중이므로 초기화 건너뜀');
      return;
    }
    
    console.log('🔄 coordinateFields 변경 - 내부 상태 초기화');
    
    // 드래그 관련 상태 초기화
    setIsDraggingField(false);
    setDraggedFieldId(null);
    setDragOffset(null);
    
    // 리사이즈 관련 상태 초기화
    setIsResizing(false);
    setResizingFieldId(null);
    setResizeStartData(null);
    
    console.log('🧹 coordinateFields 변경 시 내부 상태 초기화 완료');
  }, [coordinateFields, isDraggingField, isResizing, isDraggingSignatureField, isResizingSignatureField]);

  // PDF 이미지 로드
  useEffect(() => {
    console.log('🔄 PDF 이미지 로딩 시작:', pdfImageUrl);
    
    if (!pdfImageUrl) {
      console.warn('⚠️ PDF 이미지 URL이 없습니다');
      return;
    }
    
    const img = new Image();
    
    img.onload = () => {
      console.log('✅ PDF 이미지 로딩 완료:', {
        url: pdfImageUrl,
        width: img.width,
        height: img.height
      });
      
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
      
      // 캔버스에 이미지 그리기
      const canvas = canvasRef.current;
      if (canvas) {
        // Canvas 내부 해상도를 이미지 원본 크기로 설정
        canvas.width = img.width;
        canvas.height = img.height;
        
        // CSS 크기는 최대 너비를 제한하여 반응형으로 설정
        const maxWidth = 800; // 최대 너비 제한
        if (img.width > maxWidth) {
          const ratio = maxWidth / img.width;
          canvas.style.width = `${maxWidth}px`;
          canvas.style.height = `${img.height * ratio}px`;
        } else {
          canvas.style.width = `${img.width}px`;
          canvas.style.height = `${img.height}px`;
        }
        
        // 추가 스타일 설정으로 레이아웃 안정성 확보
        canvas.style.display = 'block';
        canvas.style.border = '1px solid #e5e7eb';
        canvas.style.borderRadius = '8px';
        canvas.style.maxWidth = '100%';
        canvas.style.boxSizing = 'border-box';
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }
    };
    
    img.onerror = (error) => {
      console.error('❌ PDF 이미지 로딩 실패:', {
        url: pdfImageUrl,
        error: error
      });
      setImageLoaded(false);
      setImageError('PDF 이미지를 불러올 수 없습니다');
    };
    
    img.src = pdfImageUrl;
  }, [pdfImageUrl, scale]);

  // 필드 오버레이 다시 그리기
  useEffect(() => {
    if (imageLoaded) {
      console.log('🔄 필드 오버레이 다시 그리기:', {
        showFieldUI,
        isAddingSignatureField,
        signatureFieldsCount: signatureFields.length,
        coordinateFieldsCount: coordinateFields.length
      });
      drawFieldOverlays();
    }
  }, [coordinateFields, imageLoaded, scale, editable, selectedFieldId, signatureFields, isAddingSignatureField, showFieldUI]); // showFieldUI 추가

  const drawFieldOverlays = () => {
    console.log('🎨 PdfViewer - 필드 오버레이 그리기 시작:', {
      fieldsCount: coordinateFields.length,
      fields: coordinateFields.map(f => ({ id: f.id, label: f.label, type: f.type, x: f.x, y: f.y })),
      showFieldUI,
      editable,
      imageLoaded
    });
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('🎨 PdfViewer - Canvas가 없습니다');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('🎨 PdfViewer - Canvas context를 가져올 수 없습니다');
      return;
    }

    // 이미지 다시 그리기
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 필드 오버레이 그리기
      console.log('🎨 PdfViewer - 필드 그리기 시작, 필드 수:', coordinateFields.length);
      
      // Canvas와 Display 크기 비교를 위한 스케일 팩터 계산
      const canvasDisplayRect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / canvasDisplayRect.width;
      const scaleY = canvas.height / canvasDisplayRect.height;
      
      console.log('🎨 PdfViewer - 스케일 정보:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        displayWidth: canvasDisplayRect.width,
        displayHeight: canvasDisplayRect.height,
        scaleX,
        scaleY
      });
      
      coordinateFields.forEach((field, index) => {
        // 템플릿에서 저장된 좌표는 실제 PDF 크기 기준
        // Canvas는 실제 PDF 크기로 설정되어 있으므로 좌표를 그대로 사용
        const x = field.x;
        const y = field.y;
        const width = field.width;
        const height = field.height;
        
        console.log(`🎨 PdfViewer - 필드 ${index + 1} 그리기:`, {
          id: field.id,
          label: field.label,
          type: field.type,
          coordinates: { x, y, width, height },
          value: field.value || ''
        });
        
        const isSelected = field.id === selectedFieldId;
        const fieldValue = field.value || '';
        const hasValue = fieldValue && fieldValue.trim() !== '';

        // 필드 UI 요소들 항상 표시 (배경, 테두리 등) - TemplateUploadPdf처럼
        if (field.type === 'signature') {
          // 서명 필드 UI
          ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
          ctx.fillRect(x, y, width, height);
          
          ctx.strokeStyle = isSelected ? '#EF4444' : '#A855F7';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.setLineDash(isSelected ? [3, 3] : [5, 5]);
          ctx.strokeRect(x, y, width, height);
          
          // 라벨은 showFieldUI일 때만 표시
          if (showFieldUI) {
            ctx.fillStyle = '#7C3AED';
            ctx.font = '12px Arial';
            ctx.fillText(field.label, x, y - 5);
          }
          
          ctx.setLineDash([]);
        } else if (field.type === 'table') {
          // 표 필드 UI
          ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
          ctx.fillRect(x, y, width, height);
          ctx.strokeStyle = isSelected ? '#EF4444' : '#3B82F6';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.setLineDash(isSelected ? [3,3] : [4,2]);
          ctx.strokeRect(x, y, width, height);
          ctx.setLineDash([]);

          // 헤더와 컬럼 구분선 그리기
          const headerHeight = Math.min(30, Math.max(20, Math.floor(height * 0.12)));
          // 헤더 배경
          ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
          ctx.fillRect(x, y, width, headerHeight);
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + headerHeight);
          ctx.lineTo(x + width, y + headerHeight);
          ctx.stroke();

          // 컬럼 라인
          const cols = Array.isArray(field.columns) && field.columns.length > 0 ? field.columns : [];
          let cursorX = x;
          cols.forEach((col, ci) => {
            const colWidth = Math.max(20, col.width || Math.floor(width / Math.max(1, cols.length)));
            // 세로 구분선
            ctx.beginPath();
            ctx.moveTo(cursorX + colWidth, y);
            ctx.lineTo(cursorX + colWidth, y + height);
            ctx.strokeStyle = '#93C5FD';
            ctx.stroke();

            // 헤더 텍스트
            if (showFieldUI) {
              ctx.fillStyle = '#1F2937';
              ctx.font = '12px Arial';
              ctx.textAlign = 'left';
              ctx.fillText(col.title || `컬럼 ${ci+1}`, cursorX + 4, y + Math.min(headerHeight - 8, 18));
            }
            cursorX += colWidth;
          });

          // 행 가이드 라인 (간단하게 높이 균등)
          const rows = field.rows || 3;
          const rowHeight = (height - headerHeight) / Math.max(1, rows);
          for (let r = 1; r <= rows; r++) {
            const ry = y + headerHeight + r * rowHeight;
            ctx.beginPath();
            ctx.moveTo(x, ry);
            ctx.lineTo(x + width, ry);
            ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
            ctx.stroke();
          }

          // 표 데이터 표시 (테이블 셀에 실제 값 렌더링)
          if (tableData && tableData.length > 0 && showFieldUI) {
            const tableId = field.tableId || field.id;
            ctx.fillStyle = '#1F2937';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            
            // 각 셀에 데이터 표시
            for (let r = 1; r <= rows; r++) {
              let cellX = x;
              cols.forEach((col, ci) => {
                const colIndex = ci + 1; // 1부터 시작
                const colWidth = Math.max(20, col.width || Math.floor(width / Math.max(1, cols.length)));
                
                // 해당 셀의 데이터 찾기
                const cellData = tableData.find(item => 
                  item.tableId === tableId && 
                  item.location_row === String(r) && 
                  item.location_column === String(colIndex)
                );
                
                if (cellData && cellData.value) {
                  const cellHeight = col.height || rowHeight;
                  const cellY = y + headerHeight + (r - 1) * cellHeight;
                  
                  // 폰트 크기 자동 조정
                  const textLength = cellData.value.length;
                  let fontSize = 11;
                  if (textLength > 20) fontSize = 9;
                  if (textLength > 40) fontSize = 8;
                  if (cellHeight < 25) fontSize = Math.max(8, Math.floor(cellHeight * 0.6));
                  
                  ctx.font = `${fontSize}px Arial`;
                  
                  // 텍스트 줄바꿈 처리
                  const maxTextWidth = colWidth - 8;
                  const words = cellData.value.split(' ');
                  const lines: string[] = [];
                  let currentLine = '';
                  
                  for (const word of words) {
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    const testWidth = ctx.measureText(testLine).width;
                    
                    if (testWidth > maxTextWidth && currentLine) {
                      lines.push(currentLine);
                      currentLine = word;
                    } else {
                      currentLine = testLine;
                    }
                  }
                  if (currentLine) lines.push(currentLine);
                  
                  // 높이 제한에 맞게 줄 수 조정
                  const lineHeight = fontSize + 2;
                  const maxLines = Math.floor((cellHeight - 4) / lineHeight);
                  const displayLines = lines.slice(0, Math.max(1, maxLines));
                  
                  // 텍스트 렌더링
                  const startY = cellY + (cellHeight - displayLines.length * lineHeight) / 2 + fontSize;
                  displayLines.forEach((line, lineIndex) => {
                    const lineY = startY + lineIndex * lineHeight;
                    ctx.fillText(line, cellX + 4, lineY);
                  });
                }
                
                cellX += colWidth;
              });
            }
          }
        } else {
          // 일반 필드 UI - 항상 배경색과 테두리 표시
          const bgColor = hasValue ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)';
          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, width, height);

          const borderColor = hasValue ? '#10B981' : '#3B82F6';
          ctx.strokeStyle = isSelected ? '#EF4444' : borderColor;
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.setLineDash(isSelected ? [3, 3] : []);
          ctx.strokeRect(x, y, width, height);

          // 라벨과 번호는 showFieldUI일 때만 표시
          if (showFieldUI) {
            ctx.fillStyle = '#1F2937';
            ctx.font = '12px Arial';
            ctx.fillText(field.label, x, y - 5);

            ctx.fillStyle = isSelected ? '#EF4444' : borderColor;
            ctx.font = 'bold 10px Arial';
            ctx.fillText(`${index + 1}`, x + 2, y + 12);
          }
          
          ctx.setLineDash([]);
        }

        // 필드 값 표시 (편집모드/읽기모드 관계없이 항상 표시)
        if (hasValue && field.type !== 'table') {
          const fontSize = field.fontSize || 12;
          const fontColor = field.fontColor || '#1F2937';
          const fontWeight = field.fontWeight || 'normal';
          const textAlign = field.textAlign || 'left';
          
          ctx.fillStyle = fontColor;
          ctx.font = `${fontWeight === 'bold' ? 'bold ' : ''}${fontSize}px Arial`;
          
          let textX = x + 4;
          if (textAlign === 'center') {
            textX = x + width / 2;
            ctx.textAlign = 'center';
          } else if (textAlign === 'right') {
            textX = x + width - 4;
            ctx.textAlign = 'right';
          } else {
            ctx.textAlign = 'left';
          }
          
          const textY = y + height / 2 + fontSize / 3;
          
          // 읽기모드에서는 텍스트 그림자로 가독성 향상
          if (!editable) {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 1;
            ctx.shadowOffsetX = 0.5;
            ctx.shadowOffsetY = 0.5;
          }
          
          ctx.fillText(fieldValue, textX, textY);
          
          // 그림자 효과 리셋
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          
          // textAlign 리셋
          ctx.textAlign = 'left';
        }

        // 서명 필드 특별 처리
        if (field.type === 'signature') {
          console.log(`🎨 서명 필드 렌더링 (coordinateFields):`, {
            id: field.id,
            label: field.label,
            hasSignatureData: !!field.signatureData,
            signatureDataLength: field.signatureData?.length || 0,
            reviewerEmail: field.reviewerEmail
          });
          
          if (field.signatureData) {
            // 실제 서명 이미지 표시
            const signatureImg = new Image();
            signatureImg.onload = () => {
              console.log(`✅ 서명 이미지 로드 완료 (coordinateFields):`, {
                id: field.id,
                imageWidth: signatureImg.width,
                imageHeight: signatureImg.height
              });
              ctx.drawImage(signatureImg, x + 2, y + 2, width - 4, height - 4);
            };
            signatureImg.onerror = () => {
              console.error(`❌ 서명 이미지 로드 실패 (coordinateFields):`, {
                id: field.id
              });
            };
            signatureImg.src = field.signatureData;
          } else if (editable) {
            // 편집 모드에서 서명 플레이스홀더 표시
            ctx.fillStyle = 'rgba(156, 163, 175, 0.3)';
            ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
            ctx.fillStyle = '#6B7280';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('서명', x + width / 2, y + height / 2 + 3);
            ctx.textAlign = 'left';
          }
        }
      });

      // 서명 필드들 표시 (별도로 관리되는 서명 필드들)
      signatureFields.forEach((signatureField) => {
        const x = signatureField.x;
        const y = signatureField.y;
        const width = signatureField.width;
        const height = signatureField.height;
        const isEditing = signatureField.id === editingSignatureFieldId;
        
        console.log(`🎨 서명 필드 렌더링 - ${signatureField.reviewerName}:`, {
          id: signatureField.id,
          x, y, width, height,
          hasSignatureData: !!signatureField.signatureData,
          signatureDataLength: signatureField.signatureData?.length || 0,
          isEditing
        });
        
        // 서명 필드 UI 요소들 표시 (배경, 테두리, 라벨 등) - showFieldUI가 true일 때만 표시
        if (showFieldUI) {
          // 서명 필드 배경
          ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
          ctx.fillRect(x, y, width, height);
          
          // 서명 필드 테두리
          ctx.strokeStyle = isEditing ? '#EF4444' : '#A855F7';
          ctx.lineWidth = isEditing ? 3 : 2;
          ctx.setLineDash(isEditing ? [3, 3] : [5, 5]);
          ctx.strokeRect(x, y, width, height);
          
          // 서명 필드 라벨
          ctx.fillStyle = '#7C3AED';
          ctx.font = '12px Arial';
          ctx.fillText(`${signatureField.reviewerName} 서명`, x, y - 5);
          
          // setLineDash 초기화
          ctx.setLineDash([]);
        } else {
          // showFieldUI가 false일 때는 서명 필드가 있음을 나타내는 미묘한 표시
          if (signatureField.signatureData) {
            // 서명이 있는 경우에만 얇은 테두리 표시
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(x, y, width, height);
            ctx.setLineDash([]);
          }
        }
        
        // 서명 필드 내용 표시 (편집모드/읽기모드 관계없이 항상 표시)
        if (signatureField.signatureData) {
          console.log(`🖼️ 서명 이미지 로드 시작 - ${signatureField.reviewerName}:`, {
            id: signatureField.id,
            signatureDataPreview: signatureField.signatureData.substring(0, 50) + '...'
          });
          
          // 실제 서명 이미지 표시
          const signatureImg = new Image();
          signatureImg.onload = () => {
            console.log(`✅ 서명 이미지 로드 완료 - ${signatureField.reviewerName}:`, {
              id: signatureField.id,
              imageWidth: signatureImg.width,
              imageHeight: signatureImg.height,
              drawX: x + 2,
              drawY: y + 2,
              drawWidth: width - 4,
              drawHeight: height - 4
            });
            ctx.drawImage(signatureImg, x + 2, y + 2, width - 4, height - 4);
          };
          signatureImg.onerror = () => {
            console.error(`❌ 서명 이미지 로드 실패 - ${signatureField.reviewerName}:`, {
              id: signatureField.id
            });
          };
          signatureImg.src = signatureField.signatureData;
        } else {
          console.log(`📝 서명 플레이스홀더 표시 - ${signatureField.reviewerName}:`, {
            id: signatureField.id
          });
          
          // 서명 플레이스홀더 표시 (showFieldUI가 true일 때만 표시)
          if (showFieldUI) {
            ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
            ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
            ctx.fillStyle = '#7C3AED';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('서명', x + width / 2, y + height / 2 + 3);
            ctx.textAlign = 'left';
          }
        }
        
        // 서명 필드에 리사이즈 핸들 표시 (showFieldUI가 true일 때만 표시)
        if (showFieldUI) {
          ctx.fillStyle = isEditing ? '#EF4444' : '#A855F7';
          ctx.fillRect(
            x + width - RESIZE_HANDLE_SIZE, 
            y + height - RESIZE_HANDLE_SIZE, 
            RESIZE_HANDLE_SIZE, 
            RESIZE_HANDLE_SIZE
          );
        }
      });
    };
    img.src = pdfImageUrl;
  };

  // 마우스 이벤트 처리
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getImageCoordinates(e.clientX, e.clientY);

    // 서명 필드 추가 모드인 경우 (편집 모드와 관계없이 가능)
    if (isAddingSignatureField && onSignaturePositionSelect) {
      console.log('🎯 서명 필드 추가 모드에서 클릭됨:', { x, y });
      const newSignatureField: CoordinateField = {
        id: `signature_${Date.now()}`,
        x: x,
        y: y,
        width: 150,
        height: 60,
        label: '서명 필드',
        type: 'signature',
        value: '',
        fontSize: 12,
        fontColor: '#000000'
      };
      console.log('📝 새 서명 필드 생성:', newSignatureField);
      onSignaturePositionSelect(newSignatureField);
      return;
    }

    // 서명 필드 리사이즈 핸들 클릭 확인 - 서명 필드 편집 모드에서만 가능
    const signatureResizeHandle = findSignatureFieldResizeHandle(x, y);
    if (signatureResizeHandle && onSignatureFieldUpdate) {
      // 서명 필드 편집 모드가 아니거나 편집 중인 필드가 아닐 때는 리사이즈 무시
      if (!editingSignatureFieldId || signatureResizeHandle.id !== editingSignatureFieldId) {
        console.log('🖱️ 서명 필드 리사이즈 무시 - 편집 모드가 아님 또는 다른 필드');
        return;
      }
      
      console.log('🖱️ 서명 필드 리사이즈 시작:', signatureResizeHandle.id);
      setIsResizingSignatureField(true);
      setResizingSignatureFieldId(signatureResizeHandle.id);
      setSignatureFieldResizeStartData({
        field: { ...signatureResizeHandle },
        startX: x,
        startY: y
      });
      return;
    }

    // 서명 필드 클릭 확인 (드래그 이동) - 서명 필드 편집 모드에서만 가능
    const clickedSignatureField = signatureFields.find(field => 
      x >= field.x && x <= field.x + field.width &&
      y >= field.y && y <= field.y + field.height
    );
    if (clickedSignatureField) {
      // 서명 필드 편집 모드가 아닐 때는 클릭 무시
      if (!editingSignatureFieldId) {
        console.log('🖱️ 서명 필드 클릭 무시 - 편집 모드가 아님');
        return;
      }
      
      // 서명 필드 클릭 시 선택 콜백 호출
      if (onSignatureFieldSelect) {
        onSignatureFieldSelect(clickedSignatureField);
      }
      
      // 서명 필드 드래그 시작 (편집 중인 필드만 드래그 가능)
      if (clickedSignatureField.id === editingSignatureFieldId) {
        console.log('🖱️ 서명 필드 드래그 시작:', clickedSignatureField.id);
        
        // 로컬 변수에 동기적으로 설정
        dragStateRef.current = {
          isDraggingSignatureField: true,
          draggedSignatureFieldId: clickedSignatureField.id,
          signatureFieldDragOffset: {
            x: x - clickedSignatureField.x,
            y: y - clickedSignatureField.y
          }
        };
        
        // React 상태도 업데이트 (UI 업데이트용)
        setIsDraggingSignatureField(true);
        setDraggedSignatureFieldId(clickedSignatureField.id);
        setSignatureFieldDragOffset({
          x: x - clickedSignatureField.x,
          y: y - clickedSignatureField.y
        });
      }
      
      return;
    }

    // 일반 필드 편집은 편집 모드에서만 가능
    if (!editable) {
      // 편집 모드가 아닐 때는 선택 해제만
      if (onFieldSelect) {
        onFieldSelect(null);
      }
      if (onSignatureFieldSelect) {
        onSignatureFieldSelect(null);
      }
      return;
    }

    // 리사이즈 핸들 클릭 확인
    const resizeHandle = findResizeHandle(x, y);
    if (resizeHandle) {
      setIsResizing(true);
      setResizingFieldId(resizeHandle.id);
      setResizeStartData({
        field: { ...resizeHandle },
        startX: x,
        startY: y
      });
      return;
    }

    // 필드 클릭 확인 (드래그 이동)
    const clickedField = coordinateFields.find(field => 
      x >= field.x && x <= field.x + field.width &&
      y >= field.y && y <= field.y + field.height
    );
    
    if (clickedField) {
      // 서명 필드 타입인 경우 특별 처리
      if (clickedField.type === 'signature') {
        console.log('🖱️ 서명 필드 클릭 (coordinateFields):', clickedField.id);
        
        // 서명 필드 편집 모드가 아닐 때는 클릭 무시
        if (!editingSignatureFieldId) {
          console.log('🖱️ 서명 필드 클릭 무시 - 편집 모드가 아님');
          return;
        }
        
        // 서명 필드 선택 콜백 호출
        if (onFieldSelect) {
          onFieldSelect(clickedField);
        }
        
        // 서명 필드 드래그 시작 (편집 중인 필드만 드래그 가능)
        if (clickedField.id === editingSignatureFieldId) {
          console.log('🖱️ 서명 필드 드래그 시작:', clickedField.id);
          
          setIsDraggingField(true);
          setDraggedFieldId(clickedField.id);
          setDragOffset({
            x: x - clickedField.x,
            y: y - clickedField.y
          });
        }
        return;
      }
      
      // 일반 필드 클릭 처리
      if (onFieldSelect) {
        onFieldSelect(clickedField);
      }
      setIsDraggingField(true);
      setDraggedFieldId(clickedField.id);
      setDragOffset({
        x: x - clickedField.x,
        y: y - clickedField.y
      });
      return;
    }

    // 빈 공간 클릭 시 필드 생성 버튼 표시 (편집 모드에서만)
    if (onAddField) {
      onAddField(x, y);
    }
  }, [editable, coordinateFields, onFieldSelect, getImageCoordinates, findResizeHandle, isAddingSignatureField, onSignaturePositionSelect, signatureFields, editingSignatureFieldId, onSignatureFieldUpdate, onSignatureFieldSelect, onAddField]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getImageCoordinates(e.clientX, e.clientY);

    // 로컬 변수에서 드래그 상태 확인
    const dragState = dragStateRef.current;

    if (isResizingSignatureField && resizingSignatureFieldId && signatureFieldResizeStartData && onSignatureFieldUpdate) {
      // 서명 필드 리사이즈 처리
      const deltaX = x - signatureFieldResizeStartData.startX;
      const deltaY = y - signatureFieldResizeStartData.startY;
      
      const minWidth = 80;
      const minHeight = 40;
      
      const newWidth = Math.max(minWidth, signatureFieldResizeStartData.field.width + deltaX);
      const newHeight = Math.max(minHeight, signatureFieldResizeStartData.field.height + deltaY);
      
      onSignatureFieldUpdate(resizingSignatureFieldId, {
        width: newWidth,
        height: newHeight
      });
    } else if (dragState.isDraggingSignatureField && dragState.draggedSignatureFieldId && dragState.signatureFieldDragOffset && onSignatureFieldUpdate) {
      // 서명 필드 드래그 이동
      const newX = Math.max(0, x - dragState.signatureFieldDragOffset.x);
      const newY = Math.max(0, y - dragState.signatureFieldDragOffset.y);
      
      onSignatureFieldUpdate(dragState.draggedSignatureFieldId, {
        x: newX,
        y: newY
      });
    } else if (isResizing && resizingFieldId && resizeStartData) {
      // 필드 리사이즈 처리
      const deltaX = x - resizeStartData.startX;
      const deltaY = y - resizeStartData.startY;
      
      const minWidth = 30;
      const minHeight = 20;
      
      const newWidth = Math.max(minWidth, resizeStartData.field.width + deltaX);
      const newHeight = Math.max(minHeight, resizeStartData.field.height + deltaY);
      
      const newFields = coordinateFields.map(field => {
        if (field.id === resizingFieldId) {
          return {
            ...field,
            width: newWidth,
            height: newHeight
          };
        }
        return field;
      });
      
      onCoordinateFieldsChange(newFields);
    } else if (isDraggingField && draggedFieldId && dragOffset) {
      // 필드 드래그 이동
      const newFields = coordinateFields.map(field => {
        if (field.id === draggedFieldId) {
          return {
            ...field,
            x: Math.max(0, x - dragOffset.x),
            y: Math.max(0, y - dragOffset.y)
          };
        }
        return field;
      });
      onCoordinateFieldsChange(newFields);
    }
  }, [isResizingSignatureField, resizingSignatureFieldId, signatureFieldResizeStartData, isDraggingSignatureField, draggedSignatureFieldId, signatureFieldDragOffset, isResizing, resizingFieldId, resizeStartData, isDraggingField, draggedFieldId, dragOffset, coordinateFields, onCoordinateFieldsChange, getImageCoordinates, onSignatureFieldUpdate]);

  const handleMouseUp = useCallback(() => {
    if (isResizingSignatureField) {
      // 서명 필드 리사이즈 완료
      setIsResizingSignatureField(false);
      setResizingSignatureFieldId(null);
      setSignatureFieldResizeStartData(null);
    } else if (isDraggingSignatureField) {
      // 서명 필드 드래그 완료
      setIsDraggingSignatureField(false);
      setDraggedSignatureFieldId(null);
      setSignatureFieldDragOffset(null);
      
      // 로컬 변수도 초기화
      dragStateRef.current = {
        isDraggingSignatureField: false,
        draggedSignatureFieldId: null,
        signatureFieldDragOffset: null
      };
    } else if (isResizing) {
      // 리사이즈 완료
      setIsResizing(false);
      setResizingFieldId(null);
      setResizeStartData(null);
    } else if (isDraggingField) {
      // 필드 드래그 완료
      setIsDraggingField(false);
      setDraggedFieldId(null);
      setDragOffset(null);
    }
  }, [isResizingSignatureField, isDraggingSignatureField, isResizing, isDraggingField]);

  // 커서 스타일 업데이트
  useEffect(() => {
    if (isAddingSignatureField) {
      setCursorStyle('crosshair');
    } else if (isResizingSignatureField) {
      setCursorStyle('nw-resize');
    } else if (isDraggingSignatureField) {
      setCursorStyle('move');
    } else if (isResizing) {
      setCursorStyle('nw-resize');
    } else if (isDraggingField) {
      setCursorStyle('move');
    } else {
      setCursorStyle('default');
    }
  }, [isAddingSignatureField, isResizingSignatureField, isDraggingSignatureField, isResizing, isDraggingField]);

  // 마우스 이동 시 커서 스타일 업데이트
  const handleMouseHover = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // updateCursorStyle(x, y); // 이 부분은 useEffect에서 처리하므로 여기서는 제거
  }, []); // updateCursorStyle 제거

  return (
    <div 
      ref={containerRef}
      className="relative inline-block border border-gray-300 rounded-lg overflow-hidden"
      style={{ maxWidth: '100%' }}
    >
      {!imageLoaded && !imageError && (
        <div className="flex items-center justify-center h-64 bg-gray-100">
          <div className="text-gray-500">PDF 이미지를 불러오는 중...</div>
        </div>
      )}
      
      {imageError && (
        <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-center">
            <div className="text-2xl mb-2">❌</div>
            <div className="font-medium">{imageError}</div>
            <div className="text-sm text-red-500 mt-1">URL: {pdfImageUrl}</div>
          </div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={(event) => {
          // 드래그나 리사이즈 중이 아닐 때만 호버 처리
          if (!isDraggingField && !isResizing && !isDraggingSignatureField && !isResizingSignatureField) {
            handleMouseHover();
          } else {
            handleMouseMove(event);
          }
        }}
        onMouseUp={handleMouseUp}
        style={{ 
          display: imageLoaded ? 'block' : 'none',
          cursor: cursorStyle
        }}
      />

      {/* {signatureFields.length > 0 && (
        <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
          ✍️ 서명 필드: 드래그로 이동 | 📐 핸들로 크기 조절
        </div>
      )}

      {coordinateFields.length > 0 && (
        <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
          필드 {coordinateFields.length}개
        </div>
      )} */}
    </div>
  );
};

export default PdfViewer; 
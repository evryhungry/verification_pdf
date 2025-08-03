package org.capsc.pdf.document.dto;

import lombok.Builder;
import lombok.Data;
import org.capsc.pdf.document.entity.Document;

@Data
@Builder
public class DocumentWithTemplateResponse {
    private Document document;
    private String templateName;
    private String pdfUrl;
    private String imageUrl;
}